import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'

export async function getNbaStandings(competition: string, year: number): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error(`No NBA season for ${competition} ${year}`)

  const stats = await prisma.nbaPlayerStat.findMany({
    where: { seasonId: season.id },
    include: { player: true },
    orderBy: { pointsPerGame: 'desc' },
  })

  const playerSeasons = await prisma.playerSeason.findMany({
    where: { seasonId: season.id },
    include: { team: true },
  })
  const psMap = new Map(playerSeasons.map(ps => [ps.playerId, ps.team]))

  const rows = stats.map((s, i) => {
    const team = psMap.get(s.playerId)
    return {
      playerId: String(s.playerId),
      name: `${s.player.firstName ?? ''} ${s.player.lastName}`.trim(),
      team: {
        name: team?.name ?? 'Unknown',
        shortName: team?.shortName ?? '?',
        colorPrimary: team?.colorPrimary ?? '#888888',
        colorSecondary: team?.colorSecondary ?? '#888888',
      },
      stats: {
        rank: i + 1,
        games: s.gamesPlayed,
        ppg: Number(s.pointsPerGame ?? 0),
        rpg: Number(s.reboundsPerGame ?? 0),
        apg: Number(s.assistsPerGame ?? 0),
        fg_pct: Number(s.fgPct ?? 0),
        three_pt_pct: Number(s.threePtPct ?? 0),
      },
    }
  })

  return {
    sport: 'nba',
    competition,
    year,
    columns: [
      { key: 'rank', label: 'Rank', sortable: false },
      { key: 'player', label: 'Player', sortable: false },
      { key: 'team', label: 'Team', sortable: true },
      { key: 'games', label: 'G', sortable: true },
      { key: 'ppg', label: 'PPG', sortable: true },
      { key: 'rpg', label: 'RPG', sortable: true },
      { key: 'apg', label: 'APG', sortable: true },
      { key: 'fg_pct', label: 'FG%', sortable: true },
      { key: 'three_pt_pct', label: '3P%', sortable: true },
    ],
    rows,
  }
}

export async function getNbaPlayerStats(playerId: number, competition: string, year: number): Promise<PlayerStatsResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error('Season not found')

  const [stat, playerSeason] = await Promise.all([
    prisma.nbaPlayerStat.findFirst({ where: { playerId, seasonId: season.id }, include: { player: true } }),
    prisma.playerSeason.findFirst({ where: { playerId, seasonId: season.id }, include: { team: true } }),
  ])

  if (!stat || !playerSeason) throw new Error('Player not found')

  return {
    playerId: String(playerId),
    name: `${stat.player.firstName ?? ''} ${stat.player.lastName}`.trim(),
    team: {
      name: playerSeason.team.name,
      shortName: playerSeason.team.shortName ?? playerSeason.team.name,
      colorPrimary: playerSeason.team.colorPrimary ?? '#888888',
      colorSecondary: playerSeason.team.colorSecondary ?? '#888888',
    },
    season: year,
    chartData: [],
    summaryStats: {
      PPG: Number(stat.pointsPerGame ?? 0),
      RPG: Number(stat.reboundsPerGame ?? 0),
      APG: Number(stat.assistsPerGame ?? 0),
      'FG%': Number(stat.fgPct ?? 0),
      '3P%': Number(stat.threePtPct ?? 0),
      Games: stat.gamesPlayed,
    },
  }
}
