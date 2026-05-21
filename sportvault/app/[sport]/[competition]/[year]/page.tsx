import { notFound } from 'next/navigation'
import { getSportConfig } from '@/config/sports'
import { prisma } from '@/lib/db'
import { CompetitionSelector } from '@/components/layout/CompetitionSelector'
import { PositionSelector } from '@/components/layout/PositionSelector'
import { YearSelector } from '@/components/layout/YearSelector'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { NbaPlayoffsView } from '@/components/leaderboard/NbaPlayoffsView'
import { getCached, standingsKey, bracketKey, TTL } from '@/lib/cache'
import { getF1Standings } from '@/lib/queries/f1'
import { getSoccerStandings } from '@/lib/queries/soccer'
import { getNflStandings } from '@/lib/queries/nfl'
import { getNbaStandings } from '@/lib/queries/nba'
import { getNbaBracket } from '@/lib/queries/nba-bracket'
import { getNflBracket } from '@/lib/queries/nfl-bracket'
import { getCricketLeaderboard } from '@/lib/queries/cricket'
import { getTennisLeaderboard } from '@/lib/queries/tennis'
import { getMmaLeaderboard } from '@/lib/queries/mma'
import type { BracketResponse, LeaderboardResponse, SeasonMeta } from '@/types/api'

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string; competition: string; year: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { sport, competition, year: yearStr } = await params
  const query = await searchParams
  const year = Number(yearStr)

  const config = getSportConfig(sport)
  if (!config) notFound()
  const competitionConfig = config.competitions.find(c => c.slug === competition)
  if (!competitionConfig) notFound()
  const requestedPosition = firstQueryValue(query.position)?.toUpperCase()
  const activePositionGroup = sport === 'nfl' && config.positionGroups
    ? config.positionGroups.find(group =>
        group.key === requestedPosition || group.aliases?.some(alias => alias === requestedPosition)
      ) ?? config.positionGroups[0]
    : null
  const activePosition = activePositionGroup?.key
  const defaultSortKey = activePositionGroup?.defaultSortKey ?? config.defaultSortKey
  const supportsBracket =
    (sport === 'nba' && competition === 'nba-playoffs') ||
    (sport === 'nfl' && competition === 'nfl-playoffs')

  const [seasonsRaw, seededComps] = await Promise.all([
    prisma.season.findMany({
      where: { competition: { slug: competition } },
      orderBy: { year: 'desc' },
    }),
    prisma.competition.findMany({
      where: { sport: { slug: sport }, seasons: { some: { year } } },
      select: { slug: true },
    }),
  ])
  const seededSlugs = seededComps.map(c => c.slug)

  let standingsData: LeaderboardResponse | null = null
  try {
    standingsData = await getCached(
      standingsKey(sport, competition, year, activePosition),
      () => {
        switch (sport) {
          case 'f1': return getF1Standings(year)
          case 'soccer': return getSoccerStandings(competition, year)
          case 'nfl': return getNflStandings(competition, year, activePosition)
          case 'nba': return getNbaStandings(competition, year)
          case 'cricket': return getCricketLeaderboard(competition, year)
          case 'tennis': return getTennisLeaderboard(competition, year)
          case 'mma': return getMmaLeaderboard(competition, year)
          default: throw new Error('Unknown sport')
        }
      },
      TTL.HISTORICAL
    )
  } catch {
    standingsData = null
  }

  const seasons: SeasonMeta[] = seasonsRaw.length > 0
    ? seasonsRaw.map(s => ({
        year: s.year,
        label: s.label ?? String(s.year),
        status: s.status as SeasonMeta['status'],
      }))
    : [{ year, label: String(year), status: 'completed' }]

  let bracket: BracketResponse | null = null
  if (standingsData && supportsBracket) {
    try {
      bracket = await getCached(
        bracketKey(sport, competition, year),
        () => sport === 'nba' ? getNbaBracket(year) : getNflBracket(year),
        TTL.HISTORICAL
      )
    } catch {
      bracket = null
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Competition tabs + year selector in same 36px bar */}
      <div className="sticky top-[52px] z-[15] flex items-center h-[36px] bg-sv-surface" style={{ boxShadow: 'inset 0 -1px 0 #e4e3df' }}>
        <div className="flex-1 min-w-0">
          <CompetitionSelector sportConfig={config} defaultYear={year} seededSlugs={seededSlugs} />
        </div>
        <div className="flex-shrink min-w-0 max-w-[60vw] sm:max-w-none">
          <YearSelector
            seasons={seasons}
            activeYear={year}
            sport={sport}
            competition={competition}
            accentColor={config.accentColor}
          />
        </div>
      </div>
      <div className="flex-1">
        {!standingsData ? (
          <div className="px-8 py-16 text-center">
            <p className="text-[14px]" style={{ color: '#9a9894' }}>
              No data yet for {config.name} {competitionConfig.name} {year}.
            </p>
          </div>
        ) : (
          <>
            {sport === 'nfl' && config.positionGroups && activePosition && (
              <PositionSelector
                groups={config.positionGroups}
                activePosition={activePosition}
                accentColor={config.accentColor}
              />
            )}
            {supportsBracket ? (
              <NbaPlayoffsView
                key={`${sport}:${competition}:${year}`}
                data={standingsData!}
                bracket={bracket}
                sport={sport}
                competition={competition}
                year={year}
                chartConfig={config.expandedChartConfig}
                accentColor={config.accentColor}
                defaultSortKey={defaultSortKey}
                hasTeams={config.hasTeams}
                positionBarHeight={activePositionGroup ? 44 : 0}
                activePosition={activePosition}
              />
            ) : (
              <LeaderboardTable
                key={`${sport}:${competition}:${year}`}
                data={standingsData!}
                sport={sport}
                competition={competition}
                year={year}
                chartConfig={config.expandedChartConfig}
                accentColor={config.accentColor}
                defaultSortKey={defaultSortKey}
                hasTeams={config.hasTeams}
                positionBarHeight={activePositionGroup ? 44 : 0}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
