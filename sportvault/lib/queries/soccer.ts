import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'

export async function getSoccerStandings(competition: string, year: number): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error(`No season for ${competition} ${year}`)

  const stats = await prisma.soccerPlayerStat.findMany({
    where: { seasonId: season.id },
    include: { player: true },
    orderBy: { goals: 'desc' },
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
        position: i + 1,
        appearances: s.appearances,
        goals: s.goals,
        assists: s.assists,
        ga: s.goals + s.assists,
        minutes: s.minutesPlayed,
      },
    }
  })

  return {
    sport: 'soccer',
    competition,
    year,
    columns: [
      { key: 'position', label: '#', sortable: false },
      { key: 'player', label: 'Player', sortable: false },
      { key: 'team', label: 'Club', sortable: true },
      { key: 'appearances', label: 'Apps', sortable: true },
      { key: 'goals', label: 'Goals', sortable: true },
      { key: 'assists', label: 'Assists', sortable: true },
      { key: 'ga', label: 'G+A', sortable: true },
      { key: 'minutes', label: 'Mins', sortable: true },
    ],
    rows,
  }
}

export async function getSoccerPlayerStats(playerId: number, competition: string, year: number): Promise<PlayerStatsResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error('Season not found')

  const [stat, playerSeason] = await Promise.all([
    prisma.soccerPlayerStat.findFirst({ where: { playerId, seasonId: season.id }, include: { player: true } }),
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
      Goals: stat.goals,
      Assists: stat.assists,
      'G+A': stat.goals + stat.assists,
      Apps: stat.appearances,
      Mins: stat.minutesPlayed,
    },
  }
}
