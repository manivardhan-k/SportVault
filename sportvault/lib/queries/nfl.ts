import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'
import type { ColumnDef } from '@/types/sport-config'

const columnsByPosition: Record<string, ColumnDef[]> = {
  QB: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'passing_yards', label: 'Pass Yds', sortable: true },
    { key: 'passing_tds', label: 'TDs', sortable: true },
    { key: 'interceptions', label: 'INTs', sortable: true },
    { key: 'passer_rating', label: 'Rating', sortable: true },
  ],
  RB: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'rushing_yards', label: 'Rush Yds', sortable: true },
    { key: 'rushing_tds', label: 'Rush TDs', sortable: true },
    { key: 'receptions', label: 'Rec', sortable: true },
    { key: 'receiving_yards', label: 'Rec Yds', sortable: true },
  ],
  WR: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'targets', label: 'Tgts', sortable: true },
    { key: 'receptions', label: 'Rec', sortable: true },
    { key: 'receiving_yards', label: 'Rec Yds', sortable: true },
    { key: 'receiving_tds', label: 'TDs', sortable: true },
  ],
  TE: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'targets', label: 'Tgts', sortable: true },
    { key: 'receptions', label: 'Rec', sortable: true },
    { key: 'receiving_yards', label: 'Rec Yds', sortable: true },
    { key: 'receiving_tds', label: 'TDs', sortable: true },
  ],
}

const sortKeyByPosition: Record<string, string> = {
  QB: 'passing_yards', RB: 'rushing_yards', WR: 'receiving_yards', TE: 'receiving_yards',
}

export async function getNflStandings(competition: string, year: number, position = 'QB'): Promise<LeaderboardResponse> {
  const seasonType = competition === 'nfl-playoffs' ? 'playoffs' : 'regular'
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error(`No NFL season for ${competition} ${year}`)

  const stats = await prisma.nflPlayerStat.findMany({
    where: { seasonId: season.id, seasonType, player: { position } },
    include: { player: true },
  })

  const playerSeasons = await prisma.playerSeason.findMany({
    where: { seasonId: season.id },
    include: { team: true },
  })
  const psMap = new Map(playerSeasons.map(ps => [ps.playerId, ps.team]))

  const sortKey = sortKeyByPosition[position] ?? 'passing_yards'
  const sorted = stats.sort((a, b) => {
    const av = Number((a.stats as Record<string, number>)[sortKey] ?? 0)
    const bv = Number((b.stats as Record<string, number>)[sortKey] ?? 0)
    return bv - av
  })

  const rows = sorted.map((s, i) => {
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
      stats: { position: i + 1, games: s.gamesPlayed, ...(s.stats as Record<string, number>) },
    }
  })

  return {
    sport: 'nfl',
    competition,
    year,
    columns: columnsByPosition[position] ?? columnsByPosition.QB,
    rows,
  }
}

export async function getNflPlayerStats(playerId: number, competition: string, year: number): Promise<PlayerStatsResponse> {
  const seasonType = competition === 'nfl-playoffs' ? 'playoffs' : 'regular'
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error('Season not found')

  const [stat, playerSeason] = await Promise.all([
    prisma.nflPlayerStat.findFirst({ where: { playerId, seasonId: season.id, seasonType }, include: { player: true } }),
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
    summaryStats: stat.stats as Record<string, number>,
  }
}
