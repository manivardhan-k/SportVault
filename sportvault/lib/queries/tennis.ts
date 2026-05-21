import { prisma } from '@/lib/db'
import type { ChartDataPoint, LeaderboardResponse, PlayerStatsResponse } from '@/types/api'

function parseCompetition(competition: string) {
  const [tour, surface = 'overall'] = competition.split('-')
  return {
    tour: tour.toUpperCase(),
    surface: surface === 'overall' ? 'ALL' : surface.toUpperCase(),
  }
}

function pseudoTeam(player: { nationality: string | null }) {
  const code = player.nationality?.trim() || 'INTL'
  return {
    name: code,
    shortName: code,
    colorPrimary: '#d4d2cd',
    colorSecondary: '#d4d2cd',
  }
}

export async function getTennisLeaderboard(competition: string, year: number): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({ where: { competition: { slug: competition }, year } })
  if (!season) throw new Error(`No tennis season for ${competition} ${year}`)

  const { tour, surface } = parseCompetition(competition)
  const stats = await prisma.tennisPlayerStat.findMany({
    where: { seasonId: season.id, tour, surface },
    include: { player: true },
    orderBy: [{ wins: 'desc' }, { matches: 'desc' }],
  })

  const rows = stats.map((s, i) => ({
    playerId: String(s.playerId),
    name: `${s.player.firstName ?? ''} ${s.player.lastName}`.trim(),
    team: pseudoTeam(s.player),
    stats: {
      position: i + 1,
      matches: s.matches,
      wins: s.wins,
      win_pct: s.matches > 0 ? Math.round((s.wins / s.matches) * 1000) / 10 : 0,
      aces: s.aces ?? 0,
      double_faults: s.doubleFaults ?? 0,
      first_serve_pct: s.firstServePct ?? 0,
      first_srv_won_pct: s.firstSrvWonPct ?? 0,
      return_won_pct: s.returnWonPct ?? 0,
      rank_year_end: s.rankYearEnd ?? 0,
    },
  }))

  return {
    sport: 'tennis',
    competition,
    year,
    columns: [
      { key: 'position', label: '#', sortable: false },
      { key: 'player', label: 'Player', sortable: false },
      { key: 'matches', label: 'Mat', sortable: true },
      { key: 'wins', label: 'Wins', sortable: true },
      { key: 'win_pct', label: 'Win%', sortable: true },
      { key: 'aces', label: 'Aces', sortable: true },
      { key: 'double_faults', label: 'DF', sortable: true },
      { key: 'first_serve_pct', label: '1st In%', sortable: true },
      { key: 'return_won_pct', label: 'Ret Won%', sortable: true },
      { key: 'rank_year_end', label: 'Rank', sortable: true },
    ],
    rows,
  }
}

export async function getTennisLeagueMaxStats(competition: string, year: number): Promise<Record<string, number>> {
  const leaderboard = await getTennisLeaderboard(competition, year)
  const maxes: Record<string, number> = {}
  for (const row of leaderboard.rows) {
    for (const [k, v] of Object.entries(row.stats)) {
      if (typeof v === 'number') maxes[k] = Math.max(maxes[k] ?? 0, v)
    }
  }
  return maxes
}

export async function getTennisPlayerStats(playerId: number, competition: string, year: number): Promise<PlayerStatsResponse> {
  const season = await prisma.season.findFirst({ where: { competition: { slug: competition }, year } })
  if (!season) throw new Error('Season not found')

  const { tour, surface } = parseCompetition(competition)
  const [stat, surfaceStats] = await Promise.all([
    prisma.tennisPlayerStat.findFirst({
      where: { playerId, seasonId: season.id, tour, surface },
      include: { player: true },
    }),
    prisma.tennisPlayerStat.findMany({
      where: { playerId, seasonId: season.id, tour, surface: { in: ['ALL', 'HARD', 'CLAY', 'GRASS'] } },
      orderBy: { surface: 'asc' },
    }),
  ])

  if (!stat) throw new Error('Player not found')

  const secondaryChartData: ChartDataPoint[] = ['ALL', 'HARD', 'CLAY', 'GRASS'].map(surfaceKey => {
    const row = surfaceStats.find(s => s.surface === surfaceKey)
    const pct = row && row.matches > 0 ? Math.round((row.wins / row.matches) * 1000) / 10 : 0
    return { label: surfaceKey.toLowerCase(), value: pct }
  })

  return {
    playerId: String(playerId),
    name: `${stat.player.firstName ?? ''} ${stat.player.lastName}`.trim(),
    team: pseudoTeam(stat.player),
    season: year,
    chartData: [],
    secondaryChartData,
    summaryStats: {
      Mat: stat.matches,
      Wins: stat.wins,
      'Win%': stat.matches > 0 ? Math.round((stat.wins / stat.matches) * 1000) / 10 : 0,
      Aces: stat.aces ?? 0,
      DF: stat.doubleFaults ?? 0,
      '1st In%': stat.firstServePct ?? 0,
      '1st Won%': stat.firstSrvWonPct ?? 0,
      'Ret Won%': stat.returnWonPct ?? 0,
      Rank: stat.rankYearEnd ?? 0,
    },
  }
}
