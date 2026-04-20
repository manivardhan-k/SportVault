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

function nbaSeasonStr(year: number) {
  return `${year}-${String(year + 1).slice(2)}`
}

export async function ingestNba(year: number) {
  const label = nbaSeasonStr(year)
  console.log(`\n=== NBA ${label} ===`)

  const sport = await upsertSport('nba', 'NBA', '🏀')
  const comp = await upsertCompetition(sport.id, 'nba-regular', 'Regular Season', 'league')
  const season = await upsertSeason(comp.id, year, label)

  const url = `${NBA_STATS}/leagueleaders?LeagueID=00&PerMode=PerGame&Scope=S&Season=${label}&SeasonType=Regular%20Season&StatCategory=PTS`
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
}
