import { prisma } from '@/lib/db'
import type { ChartDataPoint, LeaderboardResponse, PlayerStatsResponse } from '@/types/api'

function teamRef(team?: { name: string; shortName: string | null; colorPrimary: string | null; colorSecondary: string | null } | null) {
  return {
    name: team?.name ?? 'Unknown',
    shortName: team?.shortName ?? '?',
    colorPrimary: team?.colorPrimary ?? '#888888',
    colorSecondary: team?.colorSecondary ?? '#888888',
  }
}

function compToFormat(competition: string) {
  return competition.toUpperCase()
}

function matchLabel(index: number) {
  return `M${index + 1}`
}

function matchDescription(date: Date | null, opponent: string | null) {
  const dateLabel = date
    ? `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}`
    : 'Unknown date'
  return opponent ? `${dateLabel} vs ${opponent}` : dateLabel
}

export async function getCricketLeaderboard(competition: string, year: number): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({ where: { competition: { slug: competition }, year } })
  if (!season) throw new Error(`No cricket season for ${competition} ${year}`)

  const [stats, playerSeasons] = await Promise.all([
    prisma.cricketPlayerStat.findMany({
      where: { seasonId: season.id, format: compToFormat(competition) },
      include: { player: true },
      orderBy: { runs: 'desc' },
    }),
    prisma.playerSeason.findMany({
      where: { seasonId: season.id },
      include: { team: true },
    }),
  ])
  const psMap = new Map(playerSeasons.map(ps => [ps.playerId, ps.team]))

  const rows = stats.map((s, i) => ({
    playerId: String(s.playerId),
    name: `${s.player.firstName ?? ''} ${s.player.lastName}`.trim(),
    team: teamRef(psMap.get(s.playerId)),
    stats: {
      position: i + 1,
      matches: s.matches,
      innings: s.innings,
      runs: s.runs ?? 0,
      average: s.average ?? 0,
      strike_rate: s.strikeRate ?? 0,
      fifties: s.fifties ?? 0,
      hundreds: s.hundreds ?? 0,
      wickets: s.wickets ?? 0,
      economy: s.economy ?? 0,
      bowl_avg: s.bowlAvg ?? 0,
    },
  }))

  return {
    sport: 'cricket',
    competition,
    year,
    columns: [
      { key: 'position', label: '#', sortable: false },
      { key: 'player', label: 'Player', sortable: false },
      { key: 'team', label: 'Team', sortable: true },
      { key: 'matches', label: 'Mat', sortable: true },
      { key: 'innings', label: 'Inn', sortable: true },
      { key: 'runs', label: 'Runs', sortable: true },
      { key: 'average', label: 'Avg', sortable: true },
      { key: 'strike_rate', label: 'SR', sortable: true },
      { key: 'wickets', label: 'WK', sortable: true },
      { key: 'economy', label: 'Eco', sortable: true },
    ],
    rows,
  }
}

export async function getCricketLeagueMaxStats(competition: string, year: number): Promise<Record<string, number>> {
  const leaderboard = await getCricketLeaderboard(competition, year)
  const maxes: Record<string, number> = {}
  for (const row of leaderboard.rows) {
    for (const [k, v] of Object.entries(row.stats)) {
      if (typeof v === 'number') maxes[k] = Math.max(maxes[k] ?? 0, v)
    }
  }
  return maxes
}

export async function getCricketPlayerStats(playerId: number, competition: string, year: number): Promise<PlayerStatsResponse> {
  const season = await prisma.season.findFirst({ where: { competition: { slug: competition }, year } })
  if (!season) throw new Error('Season not found')

  const [stat, playerSeason] = await Promise.all([
    prisma.cricketPlayerStat.findFirst({
      where: { playerId, seasonId: season.id, format: compToFormat(competition) },
      include: { player: true },
    }),
    prisma.playerSeason.findFirst({ where: { playerId, seasonId: season.id }, include: { team: true } }),
  ])

  if (!stat) throw new Error('Player not found')

  const matchStats = await prisma.cricketMatchStat.findMany({
    where: { playerId, seasonId: season.id, format: compToFormat(competition) },
    orderBy: [{ matchDate: 'asc' }, { matchId: 'asc' }],
  })

  const battingChartData: ChartDataPoint[] = matchStats
    .filter(match => match.runs > 0 || match.ballsFaced > 0 || match.dismissed)
    .map((match, index) => ({
      label: matchLabel(index),
      value: match.runs,
      description: matchDescription(match.matchDate, match.opponent),
    }))

  const bowlingChartData: ChartDataPoint[] = matchStats
    .filter(match => match.wickets > 0 || match.ballsBowled > 0 || match.runsConceded > 0)
    .map((match, index) => ({
      label: matchLabel(index),
      value: match.wickets,
      description: `${matchDescription(match.matchDate, match.opponent)}${match.economy != null ? ` • Econ ${match.economy}` : ''}`,
    }))

  return {
    playerId: String(playerId),
    name: `${stat.player.firstName ?? ''} ${stat.player.lastName}`.trim(),
    team: teamRef(playerSeason?.team),
    season: year,
    chartData: [],
    summaryStats: {
      Mat: stat.matches,
      Inn: stat.innings,
      Runs: stat.runs ?? 0,
      Avg: stat.average ?? 0,
      SR: stat.strikeRate ?? 0,
      '50s': stat.fifties ?? 0,
      '100s': stat.hundreds ?? 0,
      WK: stat.wickets ?? 0,
      Eco: stat.economy ?? 0,
      'Bowl Avg': stat.bowlAvg ?? 0,
    },
    chartTabs: [
      {
        key: 'batting',
        label: 'Batting',
        title: `${stat.player.firstName ?? ''} ${stat.player.lastName}`.trim() + ' — batting runs by match',
        summaryStats: {
          Mat: stat.matches,
          Inn: stat.innings,
          Runs: stat.runs ?? 0,
          Avg: stat.average ?? 0,
          SR: stat.strikeRate ?? 0,
          '50s': stat.fifties ?? 0,
          '100s': stat.hundreds ?? 0,
        },
        chartData: battingChartData,
      },
      {
        key: 'bowling',
        label: 'Bowling',
        title: `${stat.player.firstName ?? ''} ${stat.player.lastName}`.trim() + ' — wickets by match',
        summaryStats: {
          Mat: stat.matches,
          WK: stat.wickets ?? 0,
          Eco: stat.economy ?? 0,
          'Bowl Avg': stat.bowlAvg ?? 0,
        },
        chartData: bowlingChartData,
      },
    ],
  }
}
