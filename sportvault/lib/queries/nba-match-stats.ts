import { prisma } from '@/lib/db'
import type { LeaderboardResponse, TeamRef } from '@/types/api'

const NBA_STATS = 'https://stats.nba.com/stats'
const NBA_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://www.nba.com',
  Referer: 'https://www.nba.com/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true',
}

const NBA_TEAM_NAMES: Record<string, string> = {
  ATL: 'Atlanta Hawks', BOS: 'Boston Celtics', BKN: 'Brooklyn Nets', CHA: 'Charlotte Hornets',
  CHI: 'Chicago Bulls', CLE: 'Cleveland Cavaliers', DAL: 'Dallas Mavericks', DEN: 'Denver Nuggets',
  DET: 'Detroit Pistons', GSW: 'Golden State Warriors', HOU: 'Houston Rockets', IND: 'Indiana Pacers',
  LAC: 'Los Angeles Clippers', LAL: 'Los Angeles Lakers', MEM: 'Memphis Grizzlies', MIA: 'Miami Heat',
  MIL: 'Milwaukee Bucks', MIN: 'Minnesota Timberwolves', NOP: 'New Orleans Pelicans', NYK: 'New York Knicks',
  OKC: 'Oklahoma City Thunder', ORL: 'Orlando Magic', PHI: 'Philadelphia 76ers', PHX: 'Phoenix Suns',
  POR: 'Portland Trail Blazers', SAC: 'Sacramento Kings', SAS: 'San Antonio Spurs', TOR: 'Toronto Raptors',
  UTA: 'Utah Jazz', WAS: 'Washington Wizards',
}

const NBA_TEAM_ID_TO_ABBR: Record<number, string> = {
  1610612737: 'ATL', 1610612738: 'BOS', 1610612751: 'BKN', 1610612766: 'CHA',
  1610612741: 'CHI', 1610612739: 'CLE', 1610612742: 'DAL', 1610612743: 'DEN',
  1610612765: 'DET', 1610612744: 'GSW', 1610612745: 'HOU', 1610612754: 'IND',
  1610612746: 'LAC', 1610612747: 'LAL', 1610612763: 'MEM', 1610612748: 'MIA',
  1610612749: 'MIL', 1610612750: 'MIN', 1610612740: 'NOP', 1610612752: 'NYK',
  1610612760: 'OKC', 1610612753: 'ORL', 1610612755: 'PHI', 1610612756: 'PHX',
  1610612757: 'POR', 1610612758: 'SAC', 1610612759: 'SAS', 1610612761: 'TOR',
  1610612762: 'UTA', 1610612764: 'WAS',
}

const NBA_CONFERENCE: Record<string, 'East' | 'West'> = {
  ATL: 'East', BOS: 'East', BKN: 'East', CHA: 'East', CHI: 'East',
  CLE: 'East', DET: 'East', IND: 'East', MIA: 'East', MIL: 'East',
  NYK: 'East', ORL: 'East', PHI: 'East', TOR: 'East', WAS: 'East',
  DAL: 'West', DEN: 'West', GSW: 'West', HOU: 'West', LAC: 'West',
  LAL: 'West', MEM: 'West', MIN: 'West', NOP: 'West', OKC: 'West',
  PHX: 'West', POR: 'West', SAC: 'West', SAS: 'West', UTA: 'West',
}

type NbaApiRow = Array<string | number | null>

type NbaApiResultSet = {
  name?: string
  headers: string[]
  rowSet: NbaApiRow[]
}

type NbaApiResponse = {
  resultSet?: NbaApiResultSet
  resultSets?: NbaApiResultSet[]
}

type MatchIdParts = {
  roundNumber: number
  conference: string
  seriesOrder: number
}

type SeriesGameSet = MatchIdParts & {
  seriesId: string
  team1Abbr: string
  team2Abbr: string
  gameIds: string[]
}

type PlayerAggregate = {
  externalId: string
  name: string
  teamAbbr: string
  gameIds: Set<string>
  seconds: number
  fgm: number
  fga: number
  fg3m: number
  fg3a: number
  ftm: number
  fta: number
  reb: number
  ast: number
  stl: number
  blk: number
  turnovers: number
  pts: number
  plusMinus: number
}

function nbaSeasonStr(year: number) {
  return `${year}-${String(year + 1).slice(2)}`
}

function parseMatchId(matchId: string): MatchIdParts {
  const firstDash = matchId.indexOf('-')
  const lastDash = matchId.lastIndexOf('-')
  if (firstDash <= 0 || lastDash <= firstDash) {
    throw new Error(`Invalid NBA playoff match id: ${matchId}`)
  }

  const roundNumber = Number(matchId.slice(0, firstDash))
  const conference = matchId.slice(firstDash + 1, lastDash)
  const seriesOrder = Number(matchId.slice(lastDash + 1))

  if (!roundNumber || !conference || !seriesOrder) {
    throw new Error(`Invalid NBA playoff match id: ${matchId}`)
  }

  return { roundNumber, conference, seriesOrder }
}

function seriesOrderFor(roundNumber: number, conference: string, slot: number) {
  if (roundNumber === 1) {
    if (conference === 'East') return ({ 0: 1, 3: 2, 2: 3, 1: 4 } as Record<number, number>)[slot] ?? 1
    return ({ 4: 1, 7: 2, 6: 3, 5: 4 } as Record<number, number>)[slot] ?? 1
  }

  if (roundNumber === 2) {
    if (conference === 'East') return ({ 0: 1, 1: 2 } as Record<number, number>)[slot] ?? 1
    return ({ 2: 1, 3: 2 } as Record<number, number>)[slot] ?? 1
  }

  return 1
}

function cell(row: NbaApiRow, headers: string[], key: string) {
  const index = headers.indexOf(key)
  return index >= 0 ? row[index] : null
}

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseMinutes(value: string | number | null | undefined) {
  if (value == null) return 0
  if (typeof value === 'number') return Math.round(value * 60)

  const trimmed = value.trim()
  const colon = trimmed.match(/^(\d+):(\d+(?:\.\d+)?)$/)
  if (colon) return Number(colon[1]) * 60 + Math.round(Number(colon[2]))

  const iso = trimmed.match(/^PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/)
  if (iso) return Number(iso[1] ?? 0) * 60 + Math.round(Number(iso[2] ?? 0))

  const numeric = Number(trimmed)
  return Number.isFinite(numeric) ? Math.round(numeric * 60) : 0
}

function pct(made: number, attempts: number) {
  return attempts > 0 ? Math.round((made / attempts) * 1000) / 1000 : 0
}

function resultSet(data: NbaApiResponse, preferredName: string) {
  const sets = data.resultSets ?? (data.resultSet ? [data.resultSet] : [])
  return sets.find(set => set.name === preferredName) ?? sets[0] ?? null
}

async function fetchNbaStats(endpoint: string, params: Record<string, string | number>) {
  const url = new URL(`${NBA_STATS}/${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(url, {
      headers: NBA_HEADERS,
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`NBA Stats API ${endpoint} returned ${response.status}`)
    return await response.json() as NbaApiResponse
  } finally {
    clearTimeout(timeout)
  }
}

function collectSeriesGames(seriesRows: NbaApiRow[], headers: string[]): SeriesGameSet[] {
  const seriesMap = new Map<string, SeriesGameSet>()

  for (const row of seriesRows) {
    const seriesId = String(cell(row, headers, 'SERIES_ID') ?? '')
    const gameId = String(cell(row, headers, 'GAME_ID') ?? '')
    const homeAbbr = NBA_TEAM_ID_TO_ABBR[numberValue(cell(row, headers, 'HOME_TEAM_ID'))]
    const visitorAbbr = NBA_TEAM_ID_TO_ABBR[numberValue(cell(row, headers, 'VISITOR_TEAM_ID'))]
    if (!seriesId || !gameId || !homeAbbr || !visitorAbbr) continue

    const [team1Abbr, team2Abbr] = [homeAbbr, visitorAbbr].sort()
    const roundNumber = Number(seriesId.charAt(7))
    const slot = Number(seriesId.charAt(8))
    const isFinals = roundNumber === 4
    const conference = isFinals
      ? 'Finals'
      : NBA_CONFERENCE[team1Abbr] === NBA_CONFERENCE[team2Abbr]
        ? NBA_CONFERENCE[team1Abbr]
        : 'Finals'

    if (!roundNumber || !Number.isFinite(slot)) continue

    const existing = seriesMap.get(seriesId)
    if (existing) {
      existing.gameIds.push(gameId)
      continue
    }

    seriesMap.set(seriesId, {
      seriesId,
      team1Abbr,
      team2Abbr,
      roundNumber,
      conference,
      seriesOrder: seriesOrderFor(roundNumber, conference, slot),
      gameIds: [gameId],
    })
  }

  return Array.from(seriesMap.values())
}

function selectedGameIdForSeries(series: SeriesGameSet) {
  const sortedGameIds = [...new Set(series.gameIds)].sort()
  const selectedGameId = sortedGameIds[sortedGameIds.length - 1]
  if (!selectedGameId) throw new Error(`NBA playoff series ${series.seriesId} has no game IDs`)
  return selectedGameId
}

function teamRef(abbr: string, teamsByAbbr: Map<string, TeamRef>): TeamRef {
  const team = teamsByAbbr.get(abbr)
  return {
    name: NBA_TEAM_NAMES[abbr] ?? team?.name ?? abbr,
    shortName: abbr,
    colorPrimary: team?.colorPrimary ?? '#888888',
    colorSecondary: team?.colorSecondary ?? '#888888',
  }
}

function addPlayerRow(aggregates: Map<string, PlayerAggregate>, row: NbaApiRow, headers: string[]) {
  const externalId = String(cell(row, headers, 'PLAYER_ID') ?? '')
  const gameId = String(cell(row, headers, 'GAME_ID') ?? '')
  const teamAbbr = String(cell(row, headers, 'TEAM_ABBREVIATION') ?? '')
  if (!externalId || !gameId || !teamAbbr) return

  const seconds = parseMinutes(cell(row, headers, 'MIN'))
  const comment = String(cell(row, headers, 'COMMENT') ?? '')
  if (seconds === 0 && comment) return

  const aggregate = aggregates.get(externalId) ?? {
    externalId,
    name: String(cell(row, headers, 'PLAYER_NAME') ?? ''),
    teamAbbr,
    gameIds: new Set<string>(),
    seconds: 0,
    fgm: 0,
    fga: 0,
    fg3m: 0,
    fg3a: 0,
    ftm: 0,
    fta: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    turnovers: 0,
    pts: 0,
    plusMinus: 0,
  }

  aggregate.gameIds.add(gameId)
  aggregate.seconds += seconds
  aggregate.fgm += numberValue(cell(row, headers, 'FGM'))
  aggregate.fga += numberValue(cell(row, headers, 'FGA'))
  aggregate.fg3m += numberValue(cell(row, headers, 'FG3M'))
  aggregate.fg3a += numberValue(cell(row, headers, 'FG3A'))
  aggregate.ftm += numberValue(cell(row, headers, 'FTM'))
  aggregate.fta += numberValue(cell(row, headers, 'FTA'))
  aggregate.reb += numberValue(cell(row, headers, 'REB'))
  aggregate.ast += numberValue(cell(row, headers, 'AST'))
  aggregate.stl += numberValue(cell(row, headers, 'STL'))
  aggregate.blk += numberValue(cell(row, headers, 'BLK'))
  aggregate.turnovers += numberValue(cell(row, headers, 'TO'))
  aggregate.pts += numberValue(cell(row, headers, 'PTS'))
  aggregate.plusMinus += numberValue(cell(row, headers, 'PLUS_MINUS'))

  aggregates.set(externalId, aggregate)
}

export async function getNbaPlayoffMatchStats(year: number, matchId: string): Promise<LeaderboardResponse> {
  const match = parseMatchId(matchId)
  const season = await prisma.season.findFirst({
    where: { competition: { slug: 'nba-playoffs' }, year },
  })
  if (!season) throw new Error(`No NBA playoffs for ${year}`)

  const storedSeries = await prisma.nbaPlayoffSeries.findUnique({
    where: {
      seasonId_conference_roundNumber_seriesOrder: {
        seasonId: season.id,
        conference: match.conference,
        roundNumber: match.roundNumber,
        seriesOrder: match.seriesOrder,
      },
    },
    include: { team1: true, team2: true },
  })
  if (!storedSeries) throw new Error(`No NBA playoff series for ${year} match ${matchId}`)

  const team1Abbr = storedSeries.team1.shortName ?? storedSeries.team1.name
  const team2Abbr = storedSeries.team2.shortName ?? storedSeries.team2.name
  const teamsByAbbr = new Map<string, TeamRef>([
    [team1Abbr, {
      name: NBA_TEAM_NAMES[team1Abbr] ?? storedSeries.team1.name,
      shortName: team1Abbr,
      colorPrimary: storedSeries.team1.colorPrimary ?? '#888888',
      colorSecondary: storedSeries.team1.colorSecondary ?? '#888888',
    }],
    [team2Abbr, {
      name: NBA_TEAM_NAMES[team2Abbr] ?? storedSeries.team2.name,
      shortName: team2Abbr,
      colorPrimary: storedSeries.team2.colorPrimary ?? '#888888',
      colorSecondary: storedSeries.team2.colorSecondary ?? '#888888',
    }],
  ])

  const seriesData = await fetchNbaStats('commonplayoffseries', {
    LeagueID: '00',
    Season: nbaSeasonStr(year),
  })
  const playoffSeries = resultSet(seriesData, 'PlayoffSeries')
  if (!playoffSeries) throw new Error(`NBA playoff series API returned no rows for ${year}`)

  const [storedA, storedB] = [team1Abbr, team2Abbr].sort()
  const selectedSeries = collectSeriesGames(playoffSeries.rowSet, playoffSeries.headers)
    .find(series =>
      series.roundNumber === match.roundNumber &&
      series.conference === match.conference &&
      series.seriesOrder === match.seriesOrder &&
      series.team1Abbr === storedA &&
      series.team2Abbr === storedB
    )
  if (!selectedSeries) throw new Error(`NBA playoff series API did not include ${matchId}`)

  const selectedGameId = selectedGameIdForSeries(selectedSeries)
  const boxScore = await fetchNbaStats('boxscoretraditionalv2', {
    EndPeriod: 10,
    EndRange: 28800,
    GameID: selectedGameId,
    RangeType: 0,
    StartPeriod: 1,
    StartRange: 0,
  })
  const playerStats = resultSet(boxScore, 'PlayerStats')
  if (!playerStats) throw new Error(`NBA box score API returned no player stats for game ${selectedGameId}`)

  const aggregates = new Map<string, PlayerAggregate>()
  for (const row of playerStats.rowSet) {
    addPlayerRow(aggregates, row, playerStats.headers)
  }

  const externalIds = Array.from(aggregates.keys())
  const players = await prisma.player.findMany({
    where: { sport: { slug: 'nba' }, externalId: { in: externalIds } },
    select: { id: true, externalId: true },
  })
  const dbIdByExternalId = new Map(players.map(player => [player.externalId, String(player.id)]))

  const rows = Array.from(aggregates.values())
    .map((player, index) => ({
      playerId: dbIdByExternalId.get(player.externalId) ?? player.externalId,
      name: player.name,
      team: teamRef(player.teamAbbr, teamsByAbbr),
      stats: {
        rank: index + 1,
        min: Math.round((player.seconds / 60) * 10) / 10,
        pts: player.pts,
        reb: player.reb,
        ast: player.ast,
        stl: player.stl,
        blk: player.blk,
        tov: player.turnovers,
        fg_pct: pct(player.fgm, player.fga),
        three_pt_pct: pct(player.fg3m, player.fg3a),
        plus_minus: player.plusMinus,
      },
    }))
    .sort((a, b) => Number(b.stats.pts) - Number(a.stats.pts))
    .map((row, index) => ({
      ...row,
      stats: { ...row.stats, rank: index + 1 },
    }))

  return {
    sport: 'nba',
    competition: 'nba-playoffs',
    year,
    columns: [
      { key: 'rank', label: 'Rank', sortable: false },
      { key: 'player', label: 'Player', sortable: false },
      { key: 'team', label: 'Team', sortable: true },
      { key: 'min', label: 'MIN', sortable: true, tooltip: 'Minutes in this selected game' },
      { key: 'pts', label: 'PTS', sortable: true, tooltip: 'Points in this selected game' },
      { key: 'reb', label: 'REB', sortable: true, tooltip: 'Rebounds in this selected game' },
      { key: 'ast', label: 'AST', sortable: true, tooltip: 'Assists in this selected game' },
      { key: 'stl', label: 'STL', sortable: true, tooltip: 'Steals in this selected game' },
      { key: 'blk', label: 'BLK', sortable: true, tooltip: 'Blocks in this selected game' },
      { key: 'tov', label: 'TO', sortable: true, tooltip: 'Turnovers in this selected game' },
      { key: 'fg_pct', label: 'FG%', sortable: true, tooltip: 'Field goal percentage in this selected game' },
      { key: 'three_pt_pct', label: '3P%', sortable: true, tooltip: 'Three-point percentage in this selected game' },
      { key: 'plus_minus', label: '+/-', sortable: true, tooltip: 'Plus-minus in this selected game' },
    ],
    rows,
    teamRankings: {
      [NBA_TEAM_NAMES[team1Abbr] ?? storedSeries.team1.name]: storedSeries.winnerTeamId === storedSeries.team1Id ? 1 : 2,
      [NBA_TEAM_NAMES[team2Abbr] ?? storedSeries.team2.name]: storedSeries.winnerTeamId === storedSeries.team2Id ? 1 : 2,
    },
  }
}
