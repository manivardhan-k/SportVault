import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse, ChartDataPoint } from '@/types/api'

export async function getF1Standings(year: number): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: 'f1-championship' }, year },
  })
  if (!season) throw new Error(`No F1 season for ${year}`)

  const standings = await prisma.f1DriverStanding.findMany({
    where: { seasonId: season.id },
    include: { player: true },
    orderBy: { finalPosition: 'asc' },
  })

  const playerSeasons = await prisma.playerSeason.findMany({
    where: { seasonId: season.id },
    include: { team: true },
  })
  const psMap = new Map(playerSeasons.map(ps => [ps.playerId, ps.team]))

  const rows = standings.map(s => {
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
        position: s.finalPosition ?? 0,
        points: Number(s.totalPoints ?? 0),
        wins: s.wins,
        podiums: s.podiums,
        poles: s.poles,
      },
    }
  })

  return {
    sport: 'f1',
    competition: 'f1-championship',
    year,
    columns: [
      { key: 'position', label: '#', sortable: false },
      { key: 'driver', label: 'Driver', sortable: false },
      { key: 'team', label: 'Constructor', sortable: true },
      { key: 'points', label: 'Pts', sortable: true },
      { key: 'wins', label: 'Wins', sortable: true },
      { key: 'podiums', label: 'Podiums', sortable: true },
      { key: 'poles', label: 'Poles', sortable: true },
    ],
    rows,
  }
}

export async function getF1PlayerStats(playerId: number, year: number): Promise<PlayerStatsResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: 'f1-championship' }, year },
  })
  if (!season) throw new Error(`No F1 season for ${year}`)

  const [standing, raceResults, playerSeason] = await Promise.all([
    prisma.f1DriverStanding.findFirst({ where: { playerId, seasonId: season.id }, include: { player: true } }),
    prisma.f1RaceResult.findMany({ where: { playerId, seasonId: season.id }, orderBy: { round: 'asc' } }),
    prisma.playerSeason.findFirst({ where: { playerId, seasonId: season.id }, include: { team: true } }),
  ])

  if (!standing || !playerSeason) throw new Error('Player data not found')

  let cumPoints = 0
  const chartData: ChartDataPoint[] = raceResults.map(r => {
    cumPoints += Number(r.points ?? 0)
    return {
      label: r.round,
      points: cumPoints,
      position: r.finishPosition ?? 0,
      raceName: r.raceName ?? '',
    }
  })

  return {
    playerId: String(playerId),
    name: `${standing.player.firstName ?? ''} ${standing.player.lastName}`.trim(),
    team: {
      name: playerSeason.team.name,
      shortName: playerSeason.team.shortName ?? playerSeason.team.name,
      colorPrimary: playerSeason.team.colorPrimary ?? '#888888',
      colorSecondary: playerSeason.team.colorSecondary ?? '#888888',
    },
    season: year,
    chartData,
    summaryStats: {
      Points: Number(standing.totalPoints ?? 0),
      Wins: standing.wins,
      Podiums: standing.podiums,
      Poles: standing.poles,
      DNFs: standing.dnfs,
    },
  }
}
