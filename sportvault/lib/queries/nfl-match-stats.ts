import { nflConfig } from '@/config/nfl.config'
import { prisma } from '@/lib/db'
import type { LeaderboardResponse } from '@/types/api'

type NflStatMap = Record<string, number>

function statMap(value: unknown): NflStatMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: NflStatMap = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) out[key] = parsed
  }
  return out
}

function parseMatchId(matchId: string) {
  const [roundRaw, conference, orderRaw] = matchId.split('-')
  const roundNumber = Number(roundRaw)
  const seriesOrder = Number(orderRaw)
  if (!roundNumber || !conference || !seriesOrder) {
    throw new Error(`Invalid NFL playoff match id: ${matchId}`)
  }
  return { roundNumber, conference, seriesOrder }
}

function teamRef(team: {
  name: string
  shortName: string | null
  colorPrimary: string | null
  colorSecondary: string | null
}) {
  return {
    name: team.name,
    shortName: team.shortName ?? team.name,
    colorPrimary: team.colorPrimary ?? '#888888',
    colorSecondary: team.colorSecondary ?? '#888888',
  }
}

function columnsForPosition(position: string) {
  const upperPosition = position.toUpperCase()
  const group = nflConfig.positionGroups?.find(item => item.key === upperPosition) ?? nflConfig.positionGroups?.[0]
  const columns = (group?.columns ?? nflConfig.leaderboardColumns)
    .filter(column => column.key !== 'games')
    .map(column => {
      if (column.key === 'team') return { ...column, tooltip: 'Team: The team in this selected playoff game' }
      return column
    })
  return {
    columns,
    defaultSortKey: group?.defaultSortKey ?? nflConfig.defaultSortKey,
    allowedPositions: new Set((group?.aliases ?? [upperPosition]).map(value => value.toUpperCase())),
  }
}

function primaryStatForPosition(position: string) {
  if (position === 'RB') return 'rushing_yards'
  if (position === 'WR' || position === 'TE') return 'receiving_yards'
  return 'passing_yards'
}

function statValue(stats: NflStatMap, key: string) {
  if (key === 'completion_pct') return stats.completion_pct ?? stats.completion_percentage ?? 0
  return stats[key] ?? 0
}

export async function getNflPlayoffMatchStats({
  year,
  matchId,
  position = 'QB',
  team1Id,
  team2Id,
}: {
  year: number
  matchId: string
  position?: string
  team1Id?: number
  team2Id?: number
}): Promise<LeaderboardResponse> {
  if (team1Id === -1 || team2Id === -1) {
    throw new Error('BYE rows do not have match stats')
  }

  const match = parseMatchId(matchId)
  const season = await prisma.season.findFirst({
    where: { competition: { slug: 'nfl-playoffs' }, year },
  })
  if (!season) throw new Error(`No NFL playoffs for ${year}`)

  const game = await prisma.nflPlayoffGame.findFirst({
    where: {
      seasonId: season.id,
      roundNumber: match.roundNumber,
      conference: match.conference,
      ...(team1Id && team2Id
        ? {
            OR: [
              { team1Id, team2Id },
              { team1Id: team2Id, team2Id: team1Id },
            ],
          }
        : { gameOrder: match.seriesOrder }),
    },
    include: { team1: true, team2: true },
  })
  if (!game) throw new Error(`No NFL playoff game for ${year} match ${matchId}`)

  const playoffWeeks = await prisma.nflWeeklyStat.findMany({
    where: { seasonId: season.id, seasonType: 'playoffs' },
    select: { week: true },
    distinct: ['week'],
    orderBy: { week: 'asc' },
  })
  const week = playoffWeeks[match.roundNumber - 1]?.week
  if (!week) throw new Error(`No NFL weekly stat week for round ${match.roundNumber}`)

  const { columns, defaultSortKey, allowedPositions } = columnsForPosition(position)
  const gameTeamIds = [game.team1Id, game.team2Id]

  const [weeklyStats, playerSeasons] = await Promise.all([
    prisma.nflWeeklyStat.findMany({
      where: {
        seasonId: season.id,
        seasonType: 'playoffs',
        week,
        player: { position: { in: Array.from(allowedPositions) } },
      },
      include: { player: true },
    }),
    prisma.playerSeason.findMany({
      where: { seasonId: season.id, teamId: { in: gameTeamIds } },
      include: { team: true },
    }),
  ])

  const playerSeasonByPlayerId = new Map(playerSeasons.map(playerSeason => [playerSeason.playerId, playerSeason]))

  const rows = weeklyStats
    .map(weeklyStat => {
      const playerSeason = playerSeasonByPlayerId.get(weeklyStat.playerId)
      if (!playerSeason) return null

      const positionValue = weeklyStat.player.position?.toUpperCase() ?? 'UNK'
      const stats = statMap(weeklyStat.stats)
      const rowStats: Record<string, number | string> = { position: positionValue }

      for (const column of columns) {
        if (column.key === 'player' || column.key === 'team' || column.key === 'position') continue
        rowStats[column.key] = statValue(stats, column.key)
      }

      const primaryStat = primaryStatForPosition(positionValue)
      rowStats[primaryStat] = statValue(stats, primaryStat)

      return {
        playerId: String(weeklyStat.playerId),
        name: `${weeklyStat.player.firstName ?? ''} ${weeklyStat.player.lastName}`.trim(),
        team: teamRef(playerSeason.team),
        stats: rowStats,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => Number(b.stats[defaultSortKey] ?? 0) - Number(a.stats[defaultSortKey] ?? 0))

  return {
    sport: 'nfl',
    competition: 'nfl-playoffs',
    year,
    columns,
    rows,
    teamRankings: {
      [game.team1.name]: game.winnerTeamId === game.team1Id ? 1 : 2,
      [game.team2.name]: game.winnerTeamId === game.team2Id ? 1 : 2,
    },
  }
}
