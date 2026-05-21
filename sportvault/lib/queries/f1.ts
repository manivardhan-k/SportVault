import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse, ChartDataPoint } from '@/types/api'

export async function getF1Standings(year: number): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: 'f1-championship' }, year },
  })
  if (!season) throw new Error(`No F1 season for ${year}`)

  const [standings, raceResults, playerSeasons] = await Promise.all([
    prisma.f1DriverStanding.findMany({
      where: { seasonId: season.id },
      include: { player: true },
      orderBy: { finalPosition: 'asc' },
    }),
    prisma.f1RaceResult.findMany({ where: { seasonId: season.id } }),
    prisma.playerSeason.findMany({
      where: { seasonId: season.id },
      include: { team: true },
    }),
  ])

  const psMap = new Map(playerSeasons.map(ps => [ps.playerId, ps.team]))

  // Compute per-driver stats from race results
  const statsByPlayer = new Map<number, { podiums: number; poles: number; dnfs: number }>()
  for (const r of raceResults) {
    const cur = statsByPlayer.get(r.playerId) ?? { podiums: 0, poles: 0, dnfs: 0 }
    if ((r.finishPosition ?? 99) <= 3) cur.podiums++
    if (r.gridPosition === 1) cur.poles++
    const finished = r.status === 'Finished' || r.status?.startsWith('+')
    if (!finished) cur.dnfs++
    statsByPlayer.set(r.playerId, cur)
  }

  const rows = standings.map(s => {
    const team = psMap.get(s.playerId)
    const derived = statsByPlayer.get(s.playerId) ?? { podiums: 0, poles: 0, dnfs: 0 }
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
        podiums: derived.podiums,
        poles: derived.poles,
        dnfs: derived.dnfs,
      },
    }
  })

  const constructorPoints = new Map<string, number>()
  for (const standing of standings) {
    const team = psMap.get(standing.playerId)
    const teamName = team?.name ?? 'Unknown'
    constructorPoints.set(teamName, (constructorPoints.get(teamName) ?? 0) + Number(standing.totalPoints ?? 0))
  }

  const teamRankings = Object.fromEntries(
    Array.from(constructorPoints.entries())
      .sort(([, pointsA], [, pointsB]) => pointsB - pointsA)
      .map(([teamName], index) => [teamName, index + 1])
  )

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
    teamRankings,
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
    cumPoints += Number(r.points ?? 0) + Number(r.sprintPoints ?? 0)
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
      Podiums: raceResults.filter(r => (r.finishPosition ?? 99) <= 3).length,
      Poles: raceResults.filter(r => r.gridPosition === 1).length,
      DNFs: raceResults.filter(r => r.status !== 'Finished' && !r.status?.startsWith('+')).length,
    },
  }
}
