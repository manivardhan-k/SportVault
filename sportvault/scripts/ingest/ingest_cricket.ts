import path from 'node:path'
import type { Prisma } from '@prisma/client'
import { prisma } from './utils/db'
import { upsertCompetition, upsertSeason, upsertSport } from './utils/upsert'
import { runPythonScript } from './utils/python'
import { numberOrZero, streamCsvToArray, validateCsv } from './utils/csv'

const BATCH_SIZE = 100
type DbOperation = Prisma.PrismaPromise<unknown>

const TEAM_COLORS: Record<string, string> = {
  // International
  India: '#0084C4',
  Australia: '#FFD100',
  England: '#002B5B',
  Pakistan: '#006629',
  'South Africa': '#007A4D',
  'New Zealand': '#000000',
  'West Indies': '#7B003A',
  'Sri Lanka': '#002366',
  Bangladesh: '#006A4E',
  Afghanistan: '#0000FF',
  Ireland: '#009E60',
  Zimbabwe: '#D32F2F',

  // IPL
  'Chennai Super Kings': '#FACC15',
  'Mumbai Indians': '#004B8D',
  'Royal Challengers Bangalore': '#EC1C24',
  'Kolkata Knight Riders': '#3A225D',
  'Delhi Capitals': '#00008B',
  'Rajasthan Royals': '#EA1A85',
  'Sunrisers Hyderabad': '#FF822A',
  'Punjab Kings': '#DD1F2D',
  'Lucknow Super Giants': '#0057E2',
  'Gujarat Titans': '#0B4973',
}

const FORMAT_LABEL: Record<'t20i' | 'odi' | 'test' | 'ipl', string> = {
  t20i: 'T20I',
  odi: 'ODI',
  test: 'TEST',
  ipl: 'IPL',
}

function titleFor(type: 't20i' | 'odi' | 'test' | 'ipl') {
  return ({ t20i: 'T20I', odi: 'ODI', test: 'Test', ipl: 'IPL' })[type]
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(' ')
  const lastName = parts.pop() ?? fullName
  return { firstName: parts.join(' '), lastName }
}

function parseMatchDate(value: string | undefined) {
  if (!value) return null
  const normalized = value.includes('T') ? value : `${value}T00:00:00Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function ingestCricket({ year, type }: { year: number; type: 't20i' | 'odi' | 'test' | 'ipl' }) {
  console.log(`\n=== Cricket ${titleFor(type)} ${year} ===`)
  const csvPath = `/tmp/cricket_${type}_${year}.csv`
  const matchCsvPath = `/tmp/cricket_${type}_${year}_matches.csv`

  await runPythonScript(path.join('scripts', 'ingest', 'fetch_cricket.py'), [
    '--year', String(year),
    '--type', type,
    '--output', csvPath,
    '--match-output', matchCsvPath,
  ])

  validateCsv(csvPath, ['player_id', 'player_name', 'team', 'format', 'matches'])
  validateCsv(matchCsvPath, ['player_id', 'match_id', 'match_date', 'format'])
  const [rows, matchRows] = await Promise.all([streamCsvToArray(csvPath), streamCsvToArray(matchCsvPath)])
  if (rows.length === 0) throw new Error(`No cricket rows for ${type} ${year}`)

  const sport = await upsertSport('cricket', 'Cricket', 'CR')
  const comp = await upsertCompetition(sport.id, type, titleFor(type), 'league')
  const season = await upsertSeason(comp.id, year, String(year))

  const teamData = new Map<string, { name: string; shortName: string; color: string }>()
  const playerData = new Map<string, { firstName: string; lastName: string; team: string }>()
  for (const row of rows) {
    const team = row.team?.trim() || 'Unknown'
    if (!teamData.has(team)) {
      teamData.set(team, { name: team, shortName: team.slice(0, 3).toUpperCase(), color: TEAM_COLORS[team] ?? '#0057B8' })
    }
    if (!playerData.has(row.player_id)) {
      const { firstName, lastName } = splitName(row.player_name ?? '')
      playerData.set(row.player_id, { firstName, lastName, team })
    }
  }

  await prisma.team.createMany({
    data: Array.from(teamData.entries()).map(([externalId, team]) => ({
      sportId: sport.id,
      externalId,
      name: team.name,
      shortName: team.shortName,
      colorPrimary: team.color,
    })),
    skipDuplicates: true,
  })
  await prisma.player.createMany({
    data: Array.from(playerData.entries()).map(([externalId, player]) => ({
      sportId: sport.id,
      externalId,
      firstName: player.firstName,
      lastName: player.lastName,
    })),
    skipDuplicates: true,
  })

  const [teams, players] = await Promise.all([
    prisma.team.findMany({ where: { sportId: sport.id, externalId: { in: Array.from(teamData.keys()) } }, select: { id: true, externalId: true } }),
    prisma.player.findMany({ where: { sportId: sport.id, externalId: { in: Array.from(playerData.keys()) } }, select: { id: true, externalId: true } }),
  ])

  const teamIdMap = new Map(teams.map(team => [team.externalId ?? '', team.id]))
  const playerIdMap = new Map(players.map(player => [player.externalId ?? '', player.id]))

  const ops: DbOperation[] = []
  await prisma.cricketMatchStat.deleteMany({
    where: { seasonId: season.id, format: FORMAT_LABEL[type] },
  })

  for (const row of rows) {
    const playerId = playerIdMap.get(row.player_id)
    const teamId = teamIdMap.get(playerData.get(row.player_id)?.team ?? '')
    if (!playerId || !teamId) continue
    ops.push(
      prisma.playerSeason.upsert({
        where: { playerId_seasonId: { playerId, seasonId: season.id } },
        create: { playerId, seasonId: season.id, teamId },
        update: { teamId },
      })
    )
    ops.push(
      prisma.cricketPlayerStat.upsert({
        where: { playerId_seasonId_format: { playerId, seasonId: season.id, format: row.format } },
        create: {
          playerId,
          seasonId: season.id,
          format: row.format,
          matches: numberOrZero(row.matches),
          innings: numberOrZero(row.innings),
          runs: numberOrZero(row.runs),
          average: numberOrZero(row.average),
          strikeRate: numberOrZero(row.strike_rate),
          fifties: numberOrZero(row.fifties),
          hundreds: numberOrZero(row.hundreds),
          wickets: numberOrZero(row.wickets),
          economy: numberOrZero(row.economy),
          bowlAvg: numberOrZero(row.bowl_avg),
        },
        update: {
          matches: numberOrZero(row.matches),
          innings: numberOrZero(row.innings),
          runs: numberOrZero(row.runs),
          average: numberOrZero(row.average),
          strikeRate: numberOrZero(row.strike_rate),
          fifties: numberOrZero(row.fifties),
          hundreds: numberOrZero(row.hundreds),
          wickets: numberOrZero(row.wickets),
          economy: numberOrZero(row.economy),
          bowlAvg: numberOrZero(row.bowl_avg),
        },
      })
    )
  }

  for (const row of matchRows) {
    const playerId = playerIdMap.get(row.player_id)
    if (!playerId) continue
    ops.push(
      prisma.cricketMatchStat.upsert({
        where: { playerId_seasonId_matchId: { playerId, seasonId: season.id, matchId: row.match_id } },
        create: {
          playerId,
          seasonId: season.id,
          format: row.format,
          matchId: row.match_id,
          matchDate: parseMatchDate(row.match_date),
          opponent: row.opponent || null,
          runs: numberOrZero(row.runs),
          ballsFaced: numberOrZero(row.balls_faced),
          dismissed: row.dismissed === 'true',
          wickets: numberOrZero(row.wickets),
          runsConceded: numberOrZero(row.runs_conceded),
          ballsBowled: numberOrZero(row.balls_bowled),
          economy: numberOrZero(row.economy),
        },
        update: {
          format: row.format,
          matchDate: parseMatchDate(row.match_date),
          opponent: row.opponent || null,
          runs: numberOrZero(row.runs),
          ballsFaced: numberOrZero(row.balls_faced),
          dismissed: row.dismissed === 'true',
          wickets: numberOrZero(row.wickets),
          runsConceded: numberOrZero(row.runs_conceded),
          ballsBowled: numberOrZero(row.balls_bowled),
          economy: numberOrZero(row.economy),
        },
      })
    )
  }

  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    await prisma.$transaction(ops.slice(i, i + BATCH_SIZE))
  }
  console.log(`Done: cricket ${type} ${year} seasonRows=${rows.length} matchRows=${matchRows.length}`)
}
