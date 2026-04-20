import { prisma } from './utils/db'
import { fetchWithDelay } from './utils/http'
import { upsertSport, upsertCompetition, upsertSeason, upsertTeam, upsertPlayer } from './utils/upsert'

const BASE = 'https://api.football-data.org/v4'
const DELAY = 6100  // 10 req/min rate limit

const COMPETITIONS: Record<string, { id: string; name: string; type: string }> = {
  'premier-league': { id: 'PL', name: 'Premier League', type: 'league' },
  'champions-league': { id: 'CL', name: 'Champions League', type: 'cup' },
  'world-cup': { id: 'WC', name: 'World Cup', type: 'tournament' },
}

const TEAM_COLORS: Record<string, string> = {
  'Arsenal FC': '#EF0107',
  'Liverpool FC': '#C8102E',
  'Manchester City FC': '#6CABDD',
  'Chelsea FC': '#034694',
  'Manchester United FC': '#DA291C',
  'Tottenham Hotspur FC': '#132257',
  'Newcastle United FC': '#241F20',
  'Aston Villa FC': '#95BFE5',
  'Real Madrid CF': '#FEBE10',
  'FC Barcelona': '#A50044',
  'Bayern München': '#DC052D',
  'Borussia Dortmund': '#FDE100',
}

export async function ingestSoccer(competitionKey: string, year: number) {
  const compMeta = COMPETITIONS[competitionKey]
  if (!compMeta) throw new Error(`Unknown competition: ${competitionKey}`)

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY not set')

  const headers = { 'X-Auth-Token': apiKey }
  const label = compMeta.type === 'tournament' ? String(year) : `${year}/${String(year + 1).slice(2)}`

  console.log(`\n=== Soccer ${compMeta.name} ${label} ===`)

  const sport = await upsertSport('soccer', 'Soccer', '⚽')
  const comp = await upsertCompetition(sport.id, competitionKey, compMeta.name, compMeta.type)
  const season = await upsertSeason(comp.id, year, label)

  const scorersData = await fetchWithDelay(
    `${BASE}/competitions/${compMeta.id}/scorers?season=${year}&limit=50`,
    headers
  ) as any

  for (const entry of scorersData.scorers ?? []) {
    const p = entry.player
    const t = entry.team

    const team = await upsertTeam(sport.id, String(t.id), t.name, t.shortName ?? t.name.substring(0, 15), TEAM_COLORS[t.name] ?? '#888888')
    const nameParts = (p.name ?? '').split(' ')
    const lastName = nameParts.pop() ?? p.name
    const firstName = nameParts.join(' ')
    const player = await upsertPlayer(sport.id, String(p.id), firstName, lastName, p.nationality ?? '')

    await prisma.playerSeason.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
      create: { playerId: player.id, teamId: team.id, seasonId: season.id },
      update: { teamId: team.id },
    })

    const existing = await prisma.soccerPlayerStat.findFirst({ where: { playerId: player.id, seasonId: season.id } })
    const statData = {
      playerId: player.id, seasonId: season.id,
      goals: entry.numberOfGoals ?? 0,
      assists: entry.numberOfGoalAssists ?? 0,
      appearances: entry.playedMatches ?? 0,
    }
    if (existing) {
      await prisma.soccerPlayerStat.update({ where: { id: existing.id }, data: statData })
    } else {
      await prisma.soccerPlayerStat.create({ data: statData })
    }

    console.log(`  ${p.name} — ${entry.numberOfGoals}G ${entry.numberOfGoalAssists ?? 0}A`)
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`Done: ${scorersData.scorers?.length ?? 0} players`)
}
