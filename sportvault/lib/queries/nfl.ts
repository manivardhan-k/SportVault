import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'
import { nflConfig } from '@/config/nfl.config'

type NflStatMap = Record<string, number>

function teamRef(team?: { name: string; shortName: string | null; colorPrimary: string | null; colorSecondary: string | null } | null) {
  return {
    name: team?.name ?? 'Unknown',
    shortName: team?.shortName ?? '?',
    colorPrimary: team?.colorPrimary ?? '#888888',
    colorSecondary: team?.colorSecondary ?? '#888888',
  }
}

function seasonTypeForCompetition(competition: string) {
  return competition === 'nfl-playoffs' ? 'playoffs' : 'regular'
}

function statMap(value: unknown): NflStatMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: NflStatMap = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) out[key] = parsed
  }
  return out
}

function buildPlayoffRankingsFromGames(games: {
  roundNumber: number
  gameOrder: number
  conference: string
  team1: { name: string }
  team2: { name: string }
  winnerTeamId: number | null
  team1Id: number
  team2Id: number
}[]): Record<string, number> | undefined {
  if (games.length === 0) return undefined

  const ranking = new Map<string, number>()
  const sorted = [...games].sort((a, b) =>
    a.roundNumber === b.roundNumber
      ? a.gameOrder - b.gameOrder
      : b.roundNumber - a.roundNumber
  )

  const finals = sorted.find(game => game.roundNumber === 4 || game.conference === 'Finals')
  let nextPosition = 1
  if (finals?.winnerTeamId) {
    const champion = finals.winnerTeamId === finals.team1Id ? finals.team1.name : finals.team2.name
    const runnerUp = finals.winnerTeamId === finals.team1Id ? finals.team2.name : finals.team1.name
    ranking.set(champion, nextPosition++)
    ranking.set(runnerUp, nextPosition++)
  }

  for (const game of sorted) {
    if (!game.winnerTeamId) continue
    const loser = game.winnerTeamId === game.team1Id ? game.team2.name : game.team1.name
    if (!ranking.has(loser)) ranking.set(loser, nextPosition++)
  }

  return Object.fromEntries(ranking)
}

function summaryForPosition(position: string, stats: NflStatMap, gamesPlayed: number): Record<string, number> {
  const completionPct = stats.completion_pct ?? stats.completion_percentage ?? 0
  if (position === 'QB') {
    return {
      G: gamesPlayed,
      'Pass Yds': stats.passing_yards ?? 0,
      'Pass TDs': stats.passing_tds ?? 0,
      INTs: stats.interceptions ?? 0,
      'Comp %': completionPct,
      'Rating': stats.passer_rating ?? 0,
      'Rush Yds': stats.rushing_yards ?? 0,
      'Rush TD': stats.rushing_tds ?? 0,
    }
  }
  if (position === 'RB') {
    return {
      G: gamesPlayed,
      'Rush Yds': stats.rushing_yards ?? 0,
      'Rush TD': stats.rushing_tds ?? 0,
      Rec: stats.receptions ?? 0,
      'Rec Yds': stats.receiving_yards ?? 0,
      'Rec TD': stats.receiving_tds ?? 0,
    }
  }
  return {
    G: gamesPlayed,
    Tgts: stats.targets ?? 0,
    Rec: stats.receptions ?? 0,
    'Rec Yds': stats.receiving_yards ?? 0,
    'Rec TD': stats.receiving_tds ?? 0,
  }
}

export async function getNflStandings(competition: string, year: number, position: string = 'QB'): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error(`No NFL season for ${competition} ${year}`)

  const [stats, playerSeasons, teamStandings, playoffGames] = await Promise.all([
    prisma.nflPlayerStat.findMany({
      where: { seasonId: season.id, seasonType: seasonTypeForCompetition(competition) },
      include: { player: true },
    }),
    prisma.playerSeason.findMany({
      where: { seasonId: season.id },
      include: { team: true },
    }),
    prisma.teamStanding.findMany({
      where: { seasonId: season.id },
      include: { team: true },
      orderBy: { position: 'asc' },
    }),
    competition === 'nfl-playoffs'
      ? prisma.nflPlayoffGame.findMany({
          where: { seasonId: season.id },
          include: {
            team1: { select: { name: true } },
            team2: { select: { name: true } },
          },
          orderBy: [{ roundNumber: 'asc' }, { gameOrder: 'asc' }],
        })
      : Promise.resolve([]),
  ])

  const psMap = new Map(playerSeasons.map(ps => [ps.playerId, ps.team]))

  // Map position to primary stat key (for sorting and radar)
  const primaryStatByPosition: Record<string, string> = {
    QB: 'passing_yards',
    RB: 'rushing_yards',
    WR: 'receiving_yards',
    TE: 'receiving_yards',
  }

  const upperPos = position.toUpperCase()
  const posGroup = nflConfig.positionGroups?.find(group => group.key === upperPos)
  const allowedPositions = new Set((posGroup?.aliases ?? [upperPos]).map(value => value.toUpperCase()))
  const filtered = stats.filter(s => allowedPositions.has((s.player.position?.toUpperCase() ?? 'QB')))

  const rows = filtered.map(s => {
    const team = psMap.get(s.playerId)
    const pos = s.player.position?.toUpperCase() ?? 'UNK'
    const primaryStat = primaryStatByPosition[pos] || 'passing_yards'
    const statsMap = statMap(s.stats)
    const primaryVal = statsMap[primaryStat] ?? 0

    return {
      playerId: String(s.playerId),
      name: `${s.player.firstName ?? ''} ${s.player.lastName}`.trim(),
      team: teamRef(team),
      stats: {
        position: pos,
        games: s.gamesPlayed,
        passing_yards: statsMap.passing_yards ?? 0,
        passing_tds: statsMap.passing_tds ?? 0,
        interceptions: statsMap.interceptions ?? 0,
        completion_pct: statsMap.completion_pct ?? statsMap.completion_percentage ?? 0,
        passer_rating: statsMap.passer_rating ?? 0,
        rushing_yards: statsMap.rushing_yards ?? 0,
        rushing_tds: statsMap.rushing_tds ?? 0,
        receptions: statsMap.receptions ?? 0,
        receiving_yards: statsMap.receiving_yards ?? 0,
        receiving_tds: statsMap.receiving_tds ?? 0,
        targets: statsMap.targets ?? 0,
        [primaryStat]: primaryVal,
      },
    }
  }).sort((a, b) => {
    const primaryA = Number(a.stats[primaryStatByPosition[String(a.stats.position)] || 'passing_yards'] ?? 0)
    const primaryB = Number(b.stats[primaryStatByPosition[String(b.stats.position)] || 'passing_yards'] ?? 0)
    return primaryB - primaryA
  })

  const teamRankings = teamStandings.length > 0
    ? Object.fromEntries(teamStandings.map(ts => [ts.team.name, ts.position ?? 999]))
    : buildPlayoffRankingsFromGames(playoffGames)

  // Get config for position group
  const columns = posGroup?.columns || nflConfig.leaderboardColumns

  return {
    sport: 'nfl',
    competition,
    year,
    rows,
    columns,
    teamRankings,
  }
}

export async function getNflPlayerStats(playerId: number, competition: string, year: number): Promise<PlayerStatsResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error(`No NFL season for ${competition} ${year}`)

  const seasonType = seasonTypeForCompetition(competition)
  const [stat, weeklyStats, playerSeason] = await Promise.all([
    prisma.nflPlayerStat.findFirst({
      where: { playerId, seasonId: season.id, seasonType },
      include: { player: true },
    }),
    prisma.nflWeeklyStat.findMany({
      where: { playerId, seasonId: season.id, seasonType },
      orderBy: { week: 'asc' },
    }),
    prisma.playerSeason.findFirst({
      where: { playerId, seasonId: season.id },
      include: { team: true },
    }),
  ])

  if (!stat) throw new Error(`No NFL stats for player ${playerId} in ${competition} ${year}`)

  const position = stat.player.position?.toUpperCase() ?? 'UNK'
  const statsMap = statMap(stat.stats)
  const primaryWeeklyKey = position === 'QB'
    ? 'passing_yards'
    : position === 'RB'
      ? 'rushing_yards'
      : 'receiving_yards'

  const chartData = weeklyStats.map(week => {
    const weekStats = statMap(week.stats)
    return {
      label: String(week.week),
      value: weekStats[primaryWeeklyKey] ?? 0,
    }
  })

  let scatterData: PlayerStatsResponse['scatterData']
  let scatterAxes: PlayerStatsResponse['scatterAxes']
  if (position === 'QB') {
    const [qbStats, qbPlayerSeasons] = await Promise.all([
      prisma.nflPlayerStat.findMany({
        where: {
          seasonId: season.id,
          seasonType,
          player: { position: { equals: 'QB', mode: 'insensitive' } },
        },
        include: { player: true },
      }),
      prisma.playerSeason.findMany({
        where: {
          seasonId: season.id,
          player: { position: { equals: 'QB', mode: 'insensitive' } },
        },
        include: { team: true },
      }),
    ])
    const qbTeamMap = new Map(qbPlayerSeasons.map(qb => [qb.playerId, qb.team]))

    scatterData = qbStats.map(qb => {
      const qbStatMap = statMap(qb.stats)
      const qbTeam = qbTeamMap.get(qb.playerId)
      return {
        name: `${qb.player.firstName ?? ''} ${qb.player.lastName}`.trim(),
        x: qbStatMap.passing_yards ?? 0,
        y: (qbStatMap.passing_tds ?? 0) - (qbStatMap.interceptions ?? 0),
        color: qbTeam?.colorPrimary ?? '#888888',
        isSelected: qb.playerId === playerId,
      }
    })
    scatterAxes = { x: 'Pass Yds', y: 'TD-INT' }
  }

  return {
    playerId: String(playerId),
    name: `${stat.player.firstName ?? ''} ${stat.player.lastName}`.trim(),
    team: teamRef(playerSeason?.team),
    season: year,
    chartData,
    summaryStats: { ...summaryForPosition(position, statsMap, stat.gamesPlayed) },
    scatterData,
    scatterAxes,
  }
}
