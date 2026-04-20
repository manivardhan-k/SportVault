import { notFound } from 'next/navigation'
import { getSportConfig } from '@/config/sports'
import { prisma } from '@/lib/db'
import { CompetitionSelector } from '@/components/layout/CompetitionSelector'
import { YearSelector } from '@/components/layout/YearSelector'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { getCached, standingsKey, TTL } from '@/lib/cache'
import { getF1Standings } from '@/lib/queries/f1'
import { getSoccerStandings } from '@/lib/queries/soccer'
import { getNflStandings } from '@/lib/queries/nfl'
import { getNbaStandings } from '@/lib/queries/nba'
import type { SeasonMeta } from '@/types/api'

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ sport: string; competition: string; year: string }>
}) {
  const { sport, competition, year: yearStr } = await params
  const year = Number(yearStr)

  const config = getSportConfig(sport)
  if (!config) notFound()

  const [seasonsRaw, seededComps] = await Promise.all([
    prisma.season.findMany({
      where: { competition: { slug: competition } },
      orderBy: { year: 'desc' },
    }),
    prisma.competition.findMany({
      where: { sport: { slug: sport }, seasons: { some: {} } },
      select: { slug: true },
    }),
  ])
  const seededSlugs = seededComps.map(c => c.slug)

  let standingsData
  try {
    standingsData = await getCached(
      standingsKey(sport, competition, year),
      () => {
        switch (sport) {
          case 'f1': return getF1Standings(year)
          case 'soccer': return getSoccerStandings(competition, year)
          case 'nfl': return getNflStandings(competition, year)
          case 'nba': return getNbaStandings(competition, year)
          default: throw new Error('Unknown sport')
        }
      },
      TTL.HISTORICAL
    )
  } catch {
    notFound()
  }

  const seasons: SeasonMeta[] = seasonsRaw.map(s => ({
    year: s.year,
    label: s.label ?? String(s.year),
    status: s.status as SeasonMeta['status'],
  }))

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <CompetitionSelector sportConfig={config} defaultYear={year} seededSlugs={seededSlugs} />
        <div className="flex-1 overflow-y-auto">
          <LeaderboardTable
            data={standingsData!}
            sport={sport}
            competition={competition}
            year={year}
            chartConfig={config.expandedChartConfig}
          />
        </div>
      </div>
      <YearSelector seasons={seasons} activeYear={year} sport={sport} competition={competition} />
    </div>
  )
}
