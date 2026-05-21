import { prisma } from './utils/db'
import { fetchWithDelay } from './utils/http'
import { upsertSport, upsertCompetition, upsertSeason, upsertTeam, upsertPlayer } from './utils/upsert'

const NBA_STATS = 'https://stats.nba.com/stats'
const NBA_HEADERS = {
  'Accept': 'application/json',
  'Origin': 'https://www.nba.com',
  'Referer': 'https://www.nba.com/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

const TEAM_COLORS: Record<string, string> = {
  'ATL': '#C8102E', 'BOS': '#007A33', 'BKN': '#000000', 'CHA': '#1D1160',
  'CHI': '#CE1141', 'CLE': '#860038', 'DAL': '#00538C', 'DEN': '#0E2240',
  'DET': '#C8102E', 'GSW': '#1D428A', 'HOU': '#CE1141', 'IND': '#002D62',
  'LAC': '#C8102E', 'LAL': '#552583', 'MEM': '#5D76A9', 'MIA': '#98002E',
  'MIL': '#00471B', 'MIN': '#0C2340', 'NOP': '#0C2340', 'NYK': '#006BB6',
  'OKC': '#007AC1', 'ORL': '#0077C0', 'PHI': '#006BB6', 'PHX': '#1D1160',
  'POR': '#E03A3E', 'SAC': '#5A2D81', 'SAS': '#C4CED4', 'TOR': '#CE1141',
  'UTA': '#002B5C', 'WAS': '#002B5C',
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
  'ATL': 'East', 'BOS': 'East', 'BKN': 'East', 'CHA': 'East', 'CHI': 'East',
  'CLE': 'East', 'DET': 'East', 'IND': 'East', 'MIA': 'East', 'MIL': 'East',
  'NYK': 'East', 'ORL': 'East', 'PHI': 'East', 'TOR': 'East', 'WAS': 'East',
  'DAL': 'West', 'DEN': 'West', 'GSW': 'West', 'HOU': 'West', 'LAC': 'West',
  'LAL': 'West', 'MEM': 'West', 'MIN': 'West', 'NOP': 'West', 'OKC': 'West',
  'PHX': 'West', 'POR': 'West', 'SAC': 'West', 'SAS': 'West', 'UTA': 'West',
}

function nbaSeasonStr(year: number) {
  return `${year}-${String(year + 1).slice(2)}`
}

export async function ingestNba(year: number, seasonType: 'regular' | 'playoffs' = 'regular') {
  const label = nbaSeasonStr(year)
  console.log(`\n=== NBA ${label} ${seasonType} ===`)

  const sport = await upsertSport('nba', 'NBA', 'NBA')
  const slug = seasonType === 'playoffs' ? 'nba-playoffs' : 'nba-regular'
  const name = seasonType === 'playoffs' ? 'Playoffs' : 'Regular Season'
  const comp = await upsertCompetition(sport.id, slug, name, seasonType === 'playoffs' ? 'tournament' : 'league')
  const season = await upsertSeason(comp.id, year, label)

  const apiSeasonType = seasonType === 'playoffs' ? 'Playoffs' : 'Regular%20Season'
  const url = `${NBA_STATS}/leagueleaders?LeagueID=00&PerMode=PerGame&Scope=S&Season=${label}&SeasonType=${apiSeasonType}&StatCategory=PTS`
  const data = await fetchWithDelay(url, NBA_HEADERS, 500) as {
    resultSet: { headers: string[]; rowSet: (string | number)[][] }
  }

  const headers = data.resultSet.headers
  const idx = (key: string) => headers.indexOf(key)

  let count = 0
  for (const row of data.resultSet.rowSet) {
    const get = (k: string) => row[idx(k)]
    const nbaPlayerId = String(get('PLAYER_ID'))
    const fullName = String(get('PLAYER'))
    const teamAbbr = String(get('TEAM'))
    const gp = Number(get('GP')) || 0

    const nameParts = fullName.split(' ')
    const lastName = nameParts.pop() ?? fullName
    const firstName = nameParts.join(' ')

    const team = await upsertTeam(sport.id, teamAbbr, teamAbbr, teamAbbr, TEAM_COLORS[teamAbbr] ?? '#888888')
    const player = await upsertPlayer(sport.id, nbaPlayerId, firstName, lastName, '')

    await prisma.playerSeason.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
      create: { playerId: player.id, teamId: team.id, seasonId: season.id },
      update: { teamId: team.id },
    })

    const statData = {
      playerId: player.id,
      seasonId: season.id,
      gamesPlayed: gp,
      pointsPerGame: Number(get('PTS')) || 0,
      reboundsPerGame: Number(get('REB')) || 0,
      assistsPerGame: Number(get('AST')) || 0,
      stealsPerGame: Number(get('STL')) || 0,
      blocksPerGame: Number(get('BLK')) || 0,
      fgPct: Number(get('FG_PCT')) || 0,
      threePtPct: Number(get('FG3_PCT')) || 0,
      ftPct: Number(get('FT_PCT')) || 0,
      minutesPerGame: Number(get('MIN')) || 0,
    }

    const existing = await prisma.nbaPlayerStat.findFirst({ where: { playerId: player.id, seasonId: season.id } })
    if (existing) {
      await prisma.nbaPlayerStat.update({ where: { id: existing.id }, data: statData })
    } else {
      await prisma.nbaPlayerStat.create({ data: statData })
    }
    count++
  }

  console.log(`Done: ${count} players`)

  if (seasonType === 'playoffs') {
    await ingestNbaBracket(season.id, label)
  }
}

type SeriesAgg = {
  seriesId: string
  team1Abbr: string
  team2Abbr: string
  team1Wins: number
  team2Wins: number
  earliestDate: string
}

async function ingestNbaBracket(seasonId: number, label: string) {
  console.log(`Fetching bracket for ${label}...`)

  const seriesUrl = `${NBA_STATS}/commonplayoffseries?LeagueID=00&Season=${label}`
  const gameLogUrl = `${NBA_STATS}/leaguegamelog?Counter=0&Direction=ASC&LeagueID=00&PlayerOrTeam=T&Season=${label}&SeasonType=Playoffs&Sorter=DATE`

  const [seriesData, gameLogData] = await Promise.all([
    fetchWithDelay(seriesUrl, NBA_HEADERS, 500) as Promise<{
      resultSets: { headers: string[]; rowSet: (string | number)[][] }[]
    }>,
    fetchWithDelay(gameLogUrl, NBA_HEADERS, 500) as Promise<{
      resultSets: { headers: string[]; rowSet: (string | number)[][] }[]
    }>,
  ])

  const seriesRs = seriesData.resultSets[0]
  const gameRs = gameLogData.resultSets[0]
  if (!seriesRs?.rowSet?.length || !gameRs?.rowSet?.length) {
    console.warn(`No bracket data for ${label}`)
    return
  }

  const sIdx = (k: string) => seriesRs.headers.indexOf(k)
  const gIdx = (k: string) => gameRs.headers.indexOf(k)

  // GAME_ID → { winnerTeamId, date }
  const gameInfo = new Map<string, { winnerTeamId: number; date: string }>()
  // first pass: collect winners + dates
  for (const row of gameRs.rowSet) {
    const gameId = String(row[gIdx('GAME_ID')])
    const wl = String(row[gIdx('WL')])
    const teamId = Number(row[gIdx('TEAM_ID')])
    const date = String(row[gIdx('GAME_DATE')])
    if (wl === 'W') {
      const existing = gameInfo.get(gameId)
      gameInfo.set(gameId, { winnerTeamId: teamId, date: existing?.date ?? date })
    } else if (!gameInfo.has(gameId)) {
      // ensure we capture date even if W row hasn't been seen yet
      gameInfo.set(gameId, { winnerTeamId: 0, date })
    }
  }

  // Aggregate series
  const seriesMap = new Map<string, SeriesAgg>()
  for (const row of seriesRs.rowSet) {
    const sid = String(row[sIdx('SERIES_ID')])
    const homeId = Number(row[sIdx('HOME_TEAM_ID')])
    const visId = Number(row[sIdx('VISITOR_TEAM_ID')])
    const gameId = String(row[sIdx('GAME_ID')])

    const homeAbbr = NBA_TEAM_ID_TO_ABBR[homeId]
    const visAbbr = NBA_TEAM_ID_TO_ABBR[visId]
    if (!homeAbbr || !visAbbr) continue

    const [t1Abbr, t2Abbr] = [homeAbbr, visAbbr].sort()

    let s = seriesMap.get(sid)
    if (!s) {
      s = {
        seriesId: sid,
        team1Abbr: t1Abbr,
        team2Abbr: t2Abbr,
        team1Wins: 0,
        team2Wins: 0,
        earliestDate: '9999-99-99',
      }
      seriesMap.set(sid, s)
    }

    const info = gameInfo.get(gameId)
    if (!info) continue
    if (info.date < s.earliestDate) s.earliestDate = info.date

    if (info.winnerTeamId) {
      const winnerAbbr = NBA_TEAM_ID_TO_ABBR[info.winnerTeamId]
      if (winnerAbbr === s.team1Abbr) s.team1Wins++
      else if (winnerAbbr === s.team2Abbr) s.team2Wins++
    }
  }

  // Resolve abbr → Team.id
  const teams = await prisma.team.findMany({
    where: { sport: { slug: 'nba' } },
  })
  const teamByAbbr = new Map<string, number>()
  for (const t of teams) {
    if (t.shortName) teamByAbbr.set(t.shortName, t.id)
  }

  // Clear prior data for this season
  await prisma.nbaPlayoffSeries.deleteMany({ where: { seasonId } })

  let inserted = 0
  for (const s of seriesMap.values()) {
    const t1Id = teamByAbbr.get(s.team1Abbr)
    const t2Id = teamByAbbr.get(s.team2Abbr)
    if (!t1Id || !t2Id) {
      console.warn(`Skipping series ${s.seriesId}: team not in DB (${s.team1Abbr} vs ${s.team2Abbr})`)
      continue
    }

    const sid = s.seriesId
    // Extract round number: index 7 of SERIES_ID
    const roundNumber = Number(sid.charAt(7))
    const slot = Number(sid.charAt(8))

    const isFinals = roundNumber === 4
    const conf1 = NBA_CONFERENCE[s.team1Abbr]
    const conf2 = NBA_CONFERENCE[s.team2Abbr]
    const conference = isFinals ? 'Finals' : (conf1 === conf2 ? conf1 : 'Finals')

    // Map slot to seriesOrder based on layout structure
    let seriesOrder = 1
    if (roundNumber === 1) {
      if (conference === 'East') {
        const orderMap: Record<number, number> = { 0: 1, 3: 2, 2: 3, 1: 4 }
        seriesOrder = orderMap[slot] ?? 1
      } else {
        const orderMap: Record<number, number> = { 4: 1, 7: 2, 6: 3, 5: 4 }
        seriesOrder = orderMap[slot] ?? 1
      }
    } else if (roundNumber === 2) {
      if (conference === 'East') {
        const orderMap: Record<number, number> = { 0: 1, 1: 2 }
        seriesOrder = orderMap[slot] ?? 1
      } else {
        const orderMap: Record<number, number> = { 2: 1, 3: 2 }
        seriesOrder = orderMap[slot] ?? 1
      }
    } else {
      seriesOrder = 1
    }

    const winnerAbbr =
      s.team1Wins >= 4 ? s.team1Abbr : s.team2Wins >= 4 ? s.team2Abbr : null
    const winnerId = winnerAbbr ? teamByAbbr.get(winnerAbbr) ?? null : null

    await prisma.nbaPlayoffSeries.create({
      data: {
        seasonId,
        roundNumber,
        conference,
        seriesOrder,
        team1Id: t1Id,
        team2Id: t2Id,
        team1Wins: s.team1Wins,
        team2Wins: s.team2Wins,
        winnerTeamId: winnerId,
      },
    })
    inserted++
  }

  console.log(`Bracket: ${inserted} series stored`)
}
