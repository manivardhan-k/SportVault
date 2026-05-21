import fs from 'fs'
import { execSync, spawn } from 'child_process'
import { parse } from 'csv-parse'
import type { Prisma } from '@prisma/client'
import { prisma } from './utils/db'
import {
  NFL_SEASONAL_BATCH_SIZE,
  NFL_WEEKLY_BATCH_SIZE,
} from './utils/nfl-transaction-config'
import { upsertSport, upsertCompetition, upsertSeason } from './utils/upsert'

type DbOperation = Prisma.PrismaPromise<unknown>

const TEAM_COLORS: Record<string, string> = {
  KC: '#E31837', DAL: '#003594', SF: '#AA0000', PHI: '#004C54',
  BUF: '#00338D', MIA: '#008E97', NE: '#002244', NYJ: '#125740',
  BAL: '#241773', CIN: '#FB4F14', CLE: '#311D00', PIT: '#FFB612',
  HOU: '#03202F', IND: '#002C5F', JAX: '#006778', TEN: '#0C2340',
  DEN: '#FB4F14', LV: '#000000', LAC: '#0073CF', SEA: '#002244',
  ARI: '#97233F', LAR: '#003594', NYG: '#0B2265', WAS: '#773141',
  ATL: '#A71930', CAR: '#0085CA', NO: '#D3BC8D', TB: '#D50A0A',
  CHI: '#0B162A', DET: '#0076B6', GB: '#203731', MIN: '#4F2683',
}

const TEAM_NAMES: Record<string, string> = {
  KC: 'Kansas City Chiefs', DAL: 'Dallas Cowboys', SF: 'San Francisco 49ers',
  PHI: 'Philadelphia Eagles', BUF: 'Buffalo Bills', NE: 'New England Patriots',
  BAL: 'Baltimore Ravens', CIN: 'Cincinnati Bengals', CLE: 'Cleveland Browns',
  PIT: 'Pittsburgh Steelers', HOU: 'Houston Texans', IND: 'Indianapolis Colts',
  JAX: 'Jacksonville Jaguars', TEN: 'Tennessee Titans', DEN: 'Denver Broncos',
  LV: 'Las Vegas Raiders', LAC: 'Los Angeles Chargers', SEA: 'Seattle Seahawks',
  ARI: 'Arizona Cardinals', LAR: 'Los Angeles Rams', NYG: 'New York Giants',
  WAS: 'Washington Commanders', ATL: 'Atlanta Falcons', CAR: 'Carolina Panthers',
  NO: 'New Orleans Saints', TB: 'Tampa Bay Buccaneers', CHI: 'Chicago Bears',
  DET: 'Detroit Lions', GB: 'Green Bay Packers', MIN: 'Minnesota Vikings',
  MIA: 'Miami Dolphins', NYJ: 'New York Jets',
}

const TEAM_CONFERENCES: Record<string, 'AFC' | 'NFC'> = {
  KC: 'AFC', BUF: 'AFC', MIA: 'AFC', NE: 'AFC', NYJ: 'AFC',
  BAL: 'AFC', CIN: 'AFC', CLE: 'AFC', PIT: 'AFC',
  HOU: 'AFC', IND: 'AFC', JAX: 'AFC', TEN: 'AFC',
  DEN: 'AFC', LV: 'AFC', LAC: 'AFC',
  DAL: 'NFC', SF: 'NFC', PHI: 'NFC', SEA: 'NFC',
  ARI: 'NFC', LAR: 'NFC', NYG: 'NFC', WAS: 'NFC',
  ATL: 'NFC', CAR: 'NFC', NO: 'NFC', TB: 'NFC',
  CHI: 'NFC', DET: 'NFC', GB: 'NFC', MIN: 'NFC',
}

const TEAM_ALIASES: Record<string, string> = {
  ARZ: 'ARI',
  JAC: 'JAX',
  LA: 'LAR',
  OAK: 'LV',
  SD: 'LAC',
  STL: 'LAR',
  WSH: 'WAS',
}

type NflGameRecord = {
  eventId: string
  week: number
  gameDate: Date | null
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
}

function findPython(): string {
  const pyenvPy = `${process.env.HOME}/.pyenv/versions/3.11.14/bin/python3.11`
  const candidates = ['python3.11', pyenvPy, 'python3', 'python']
  return candidates.find(p => {
    try { execSync(`${p} -c "import nfl_data_py"`, { stdio: 'pipe' }); return true } catch { return false }
  }) ?? 'python3'
}

function preflightMemory(): void {
  if (process.platform !== 'darwin') return
  try {
    const out = execSync('vm_stat', { encoding: 'utf-8' })
    const psMatch = out.match(/page size of (\d+) bytes/)
    const pages = (label: string) => {
      const match = out.match(new RegExp(`${label}:\\s+(\\d+)`))
      return match ? Number(match[1]) : 0
    }
    if (!psMatch) return
    const pageSize = Number(psMatch[1])
    const availablePages =
      pages('Pages free') +
      pages('Pages inactive') +
      pages('Pages speculative') +
      pages('Pages purgeable')
    const availableMb = (availablePages * pageSize) / (1024 * 1024)
    if (availableMb < 800) {
      throw new Error(`Only ${availableMb.toFixed(0)} MB reclaimable RAM available. Stop dev servers or close memory-heavy apps before NFL ingest.`)
    }
    console.log(`pre-flight: ${availableMb.toFixed(0)} MB reclaimable RAM`)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Only ')) throw error
  }
}

function runPython(year: number, seasonTypeArg: string, csvPath: string, weeklyCsvPath: string, gamesCsvPath: string): Promise<void> {
  const py = findPython()
  return new Promise((resolve, reject) => {
    const child = spawn(py, [
      'scripts/ingest/fetch_nfl.py',
      '--year', String(year),
      '--output', csvPath,
      '--weekly-output', weeklyCsvPath,
      '--games-output', gamesCsvPath,
      '--season-type', seasonTypeArg,
    ], { stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`Python exited with code ${code}`))
    })
  })
}

function validateCsv(path: string, requiredCols: string[]): void {
  if (!fs.existsSync(path)) throw new Error(`CSV missing: ${path}`)
  const stat = fs.statSync(path)
  if (stat.size === 0) throw new Error(`CSV empty: ${path}`)
  const fd = fs.openSync(path, 'r')
  const buf = Buffer.alloc(2048)
  fs.readSync(fd, buf, 0, 2048, 0)
  fs.closeSync(fd)
  const headerLine = buf.toString('utf-8').split('\n')[0].split(',').map(s => s.trim())
  for (const col of requiredCols) {
    if (!headerLine.includes(col)) throw new Error(`CSV ${path} missing column: ${col}`)
  }
}

function numberOrZero(value: string | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function canonicalTeamAbbr(raw: string, knownTeams: Set<string>): string {
  const cleaned = raw.trim().toUpperCase()
  const aliased = TEAM_ALIASES[cleaned] ?? cleaned
  if (knownTeams.has(aliased)) return aliased
  return aliased
}

function parseGameDate(value: string | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function streamCsvToArray(path: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = []
  const parser = fs.createReadStream(path).pipe(parse({ columns: true, skip_empty_lines: true }))
  for await (const row of parser as AsyncIterable<Record<string, string>>) rows.push(row)
  return rows
}

export async function ingestNfl(year: number, seasonType: 'regular' | 'playoffs' = 'regular') {
  console.log(`\n=== NFL ${year} ${seasonType} ===`)
  preflightMemory()

  const csvPath = `/tmp/nfl_${year}_${seasonType}.csv`
  const weeklyCsvPath = `/tmp/nfl_${year}_${seasonType}_weekly.csv`
  const gamesCsvPath = `/tmp/nfl_${year}_${seasonType}_games.csv`
  const seasonTypeArg = seasonType === 'playoffs' ? 'POST' : 'REG'

  console.log('[1/4] python export...')
  await runPython(year, seasonTypeArg, csvPath, weeklyCsvPath, gamesCsvPath)

  validateCsv(csvPath, ['player_id', 'position', 'recent_team', 'player_name'])
  if (fs.existsSync(weeklyCsvPath)) validateCsv(weeklyCsvPath, ['player_id', 'week'])
  if (fs.existsSync(gamesCsvPath)) validateCsv(gamesCsvPath, ['game_id', 'week', 'home_team', 'away_team', 'home_score', 'away_score'])

  const sport = await upsertSport('nfl', 'NFL', 'NFL')
  const slug = seasonType === 'playoffs' ? 'nfl-playoffs' : 'nfl-regular'
  const name = seasonType === 'playoffs' ? 'Playoffs' : 'Regular Season'
  const comp = await upsertCompetition(sport.id, slug, name, seasonType === 'playoffs' ? 'tournament' : 'league')
  const season = await upsertSeason(comp.id, year, String(year))

  // ---------- Stage A: seasonal ----------
  console.log('[2/4] streaming seasonal CSV...')
  const seasonalRows = await streamCsvToArray(csvPath)
  console.log(`  parsed ${seasonalRows.length} seasonal rows`)
  if (seasonalRows.length === 0) {
    throw new Error(`No seasonal rows exported for NFL ${year} ${seasonType}; leaving database unchanged.`)
  }

  // dimension pass: distinct teams + players
  const teamData = new Map<string, { name: string; shortName: string; color: string }>()
  const playerData = new Map<string, { firstName: string; lastName: string; position: string }>()
  for (const r of seasonalRows) {
    const rawAbbr = ((r.recent_team ?? '').trim() || 'UNK')
    const abbr = TEAM_ALIASES[rawAbbr] ?? rawAbbr
    if (!teamData.has(abbr)) {
      teamData.set(abbr, {
        name: TEAM_NAMES[abbr] ?? abbr,
        shortName: abbr,
        color: TEAM_COLORS[abbr] ?? '#888888',
      })
    }
    const pid = r.player_id
    const pos = (r.position ?? '').toUpperCase()
    if (!pid || !['QB', 'RB', 'WR', 'TE'].includes(pos)) continue
    if (!playerData.has(pid)) {
      const nameParts = (r.player_name ?? '').trim().split(' ')
      const lastName = nameParts.pop() ?? r.player_name ?? ''
      const firstName = nameParts.join(' ')
      playerData.set(pid, { firstName, lastName, position: pos })
    }
  }

  // Batch insert teams (skipDuplicates needs (sportId, externalId) unique)
  if (teamData.size > 0) {
    await prisma.team.createMany({
      data: Array.from(teamData.entries()).map(([extId, t]) => ({
        sportId: sport.id, externalId: extId, name: t.name, shortName: t.shortName, colorPrimary: t.color,
      })),
      skipDuplicates: true,
    })
    // Refresh existing rows' name/color (createMany skips, doesn't update)
    const teamUpdates = Array.from(teamData.entries()).map(([extId, t]) =>
      prisma.team.update({
        where: { sportId_externalId: { sportId: sport.id, externalId: extId } },
        data: { name: t.name, shortName: t.shortName, colorPrimary: t.color },
      })
    )
    for (let i = 0; i < teamUpdates.length; i += NFL_SEASONAL_BATCH_SIZE) {
      await prisma.$transaction(teamUpdates.slice(i, i + NFL_SEASONAL_BATCH_SIZE))
    }
  }

  // Batch insert players (skill positions only)
  if (playerData.size > 0) {
    await prisma.player.createMany({
      data: Array.from(playerData.entries()).map(([extId, p]) => ({
        sportId: sport.id, externalId: extId, firstName: p.firstName, lastName: p.lastName, position: p.position,
      })),
      skipDuplicates: true,
    })
    const playerUpdates = Array.from(playerData.entries()).map(([extId, p]) =>
      prisma.player.update({
        where: { sportId_externalId: { sportId: sport.id, externalId: extId } },
        data: { firstName: p.firstName, lastName: p.lastName, position: p.position },
      })
    )
    for (let i = 0; i < playerUpdates.length; i += NFL_SEASONAL_BATCH_SIZE) {
      await prisma.$transaction(playerUpdates.slice(i, i + NFL_SEASONAL_BATCH_SIZE))
    }
  }

  // Build externalId → DB id maps
  const teams = await prisma.team.findMany({
    where: { sportId: sport.id, externalId: { in: Array.from(teamData.keys()) } },
    select: { id: true, externalId: true },
  })
  const teamIdMap = new Map(teams.map(t => [t.externalId!, t.id]))

  const players = await prisma.player.findMany({
    where: { sportId: sport.id, externalId: { in: Array.from(playerData.keys()) } },
    select: { id: true, externalId: true },
  })
  const playerIdMap = new Map(players.map(p => [p.externalId!, p.id]))

  // PlayerSeason + stat fact pass (batched)
  console.log('[3/4] writing seasonal stats...')
  const factOps: DbOperation[] = []
  let statRowCount = 0
  for (const r of seasonalRows) {
    const playerId = playerIdMap.get(r.player_id)
    const teamAbbr = ((r.recent_team ?? '').trim() || 'UNK')
    const teamId = teamIdMap.get(teamAbbr)
    if (!playerId || !teamId) continue

    factOps.push(
      prisma.playerSeason.upsert({
        where: { playerId_seasonId: { playerId, seasonId: season.id } },
        create: { playerId, teamId, seasonId: season.id },
        update: { teamId },
      })
    )

    const attempts = numberOrZero(r.attempts)
    const completions = numberOrZero(r.completions)
    const stats = {
      passing_yards: numberOrZero(r.passing_yards),
      passing_tds: numberOrZero(r.passing_tds),
      interceptions: numberOrZero(r.interceptions),
      completions,
      attempts,
      completion_pct: attempts > 0 ? Math.round((completions / attempts) * 1000) / 10 : 0,
      passer_rating: Math.round(numberOrZero(r.passer_rating) * 10) / 10,
      rushing_yards: numberOrZero(r.rushing_yards),
      rushing_tds: numberOrZero(r.rushing_tds),
      receptions: numberOrZero(r.receptions),
      targets: numberOrZero(r.targets),
      receiving_yards: numberOrZero(r.receiving_yards),
      receiving_tds: numberOrZero(r.receiving_tds),
    }

    factOps.push(
      prisma.nflPlayerStat.upsert({
        where: { playerId_seasonId_seasonType: { playerId, seasonId: season.id, seasonType } },
        create: { playerId, seasonId: season.id, seasonType, gamesPlayed: numberOrZero(r.games), stats },
        update: { gamesPlayed: numberOrZero(r.games), stats },
      })
    )
    statRowCount++
  }

  for (let i = 0; i < factOps.length; i += NFL_SEASONAL_BATCH_SIZE) {
    await prisma.$transaction(factOps.slice(i, i + NFL_SEASONAL_BATCH_SIZE))
  }
  if (statRowCount === 0 || playerIdMap.size === 0) {
    throw new Error(`No seasonal stat rows matched DB players for NFL ${year} ${seasonType}; refusing stale-row cleanup.`)
  }
  const currentPlayerIds = Array.from(playerIdMap.values())
  const staleSeasonal = await prisma.nflPlayerStat.deleteMany({
    where: { seasonId: season.id, seasonType, playerId: { notIn: currentPlayerIds } },
  })
  console.log(`  upserted ${statRowCount} player-season stat rows`)
  if (staleSeasonal.count > 0) {
    console.log(`  removed ${staleSeasonal.count} stale player-season stat rows`)
  }

  // Free stage A heap before stage B
  seasonalRows.length = 0
  teamData.clear()
  playerData.clear()
  factOps.length = 0

  // ---------- Stage B: weekly ----------
  let weeklyCount = 0
  if (!fs.existsSync(weeklyCsvPath)) {
    console.log('[4/4] no weekly CSV — skipping')
  } else {
    console.log('[4/4] streaming weekly CSV → batched upserts...')
    const parser = fs.createReadStream(weeklyCsvPath).pipe(parse({ columns: true, skip_empty_lines: true }))
    let buffer: DbOperation[] = []
    let nextWeeklyLog = 1000

    const flush = async () => {
      if (!buffer.length) return
      await prisma.$transaction(buffer)
      weeklyCount += buffer.length
      buffer = []
      if (weeklyCount >= nextWeeklyLog) {
        console.log(`  weekly upserts: ${weeklyCount}`)
        while (nextWeeklyLog <= weeklyCount) nextWeeklyLog += 1000
      }
    }

    for await (const row of parser as AsyncIterable<Record<string, string>>) {
      const playerId = playerIdMap.get(row.player_id)
      if (!playerId) continue
      const week = Number(row.week)
      if (!week) continue

      const weekStats: Record<string, number> = {}
      for (const col of [
        'passing_yards', 'passing_tds', 'interceptions', 'completions', 'attempts',
        'completion_percentage', 'passer_rating', 'rushing_yards', 'rushing_tds',
        'receptions', 'receiving_yards', 'receiving_tds', 'fantasy_points',
      ]) {
        if (row[col] !== undefined && row[col] !== '') weekStats[col] = numberOrZero(row[col])
      }
      if (!weekStats.completion_percentage && weekStats.attempts > 0) {
        weekStats.completion_pct = Math.round((weekStats.completions / weekStats.attempts) * 1000) / 10
      }

      buffer.push(
        prisma.nflWeeklyStat.upsert({
          where: { playerId_seasonId_seasonType_week: { playerId, seasonId: season.id, seasonType, week } },
          create: { playerId, seasonId: season.id, seasonType, week, stats: weekStats },
          update: { stats: weekStats },
        })
      )
      if (buffer.length >= NFL_WEEKLY_BATCH_SIZE) await flush()
    }
    await flush()
    if (weeklyCount === 0) {
      throw new Error(`No weekly rows were written for NFL ${year} ${seasonType}; investigate export before continuing.`)
    }
    const staleWeekly = await prisma.nflWeeklyStat.deleteMany({
      where: { seasonId: season.id, seasonType, playerId: { notIn: currentPlayerIds } },
    })
    if (staleWeekly.count > 0) {
      console.log(`  removed ${staleWeekly.count} stale weekly stat rows`)
    }
  }

  const finalSeasonal = await prisma.nflPlayerStat.count({ where: { seasonId: season.id, seasonType } })
  const finalWeekly = await prisma.nflWeeklyStat.count({ where: { seasonId: season.id, seasonType } })

  if (fs.existsSync(gamesCsvPath)) {
    console.log('[5/5] writing team standings and playoff bracket...')
    await ingestNflGames({
      gamesCsvPath,
      seasonId: season.id,
      sportId: sport.id,
      seasonType,
    })
  }

  console.log(`done. wrote ${weeklyCount} weekly upserts. nflPlayerStat=${finalSeasonal}, nflWeeklyStat=${finalWeekly}`)
}

async function ingestNflGames({
  gamesCsvPath,
  seasonId,
  sportId,
  seasonType,
}: {
  gamesCsvPath: string
  seasonId: number
  sportId: number
  seasonType: 'regular' | 'playoffs'
}) {
  const rawRows = await streamCsvToArray(gamesCsvPath)
  if (rawRows.length === 0) return

  const teams = await prisma.team.findMany({
    where: { sportId },
    select: { id: true, externalId: true, name: true },
  })
  const knownTeams = new Set(teams.map(team => team.externalId ?? '').filter(Boolean))
  const teamIdByAbbr = new Map(teams.filter(team => team.externalId).map(team => [team.externalId!, team.id]))
  const teamNameByAbbr = new Map(teams.filter(team => team.externalId).map(team => [team.externalId!, team.name]))

  const games: NflGameRecord[] = rawRows
    .map(row => {
      const homeTeam = canonicalTeamAbbr(row.home_team ?? '', knownTeams)
      const awayTeam = canonicalTeamAbbr(row.away_team ?? '', knownTeams)
      return {
        eventId: row.game_id || `${seasonId}-${seasonType}-${row.week}-${awayTeam}-${homeTeam}`,
        week: numberOrZero(row.week),
        gameDate: parseGameDate(row.gameday),
        homeTeam,
        awayTeam,
        homeScore: numberOrZero(row.home_score),
        awayScore: numberOrZero(row.away_score),
      }
    })
    .filter(game => game.week > 0 && teamIdByAbbr.has(game.homeTeam) && teamIdByAbbr.has(game.awayTeam))
    .sort((a, b) => {
      const aTime = a.gameDate?.getTime() ?? 0
      const bTime = b.gameDate?.getTime() ?? 0
      return a.week === b.week ? aTime - bTime : a.week - b.week
    })

  if (games.length === 0) return

  if (seasonType === 'regular') {
    await writeRegularSeasonStandings({ games, seasonId, teamIdByAbbr })
    return
  }

  await writePlayoffBracket({ games, seasonId, teamIdByAbbr })
  await writePlayoffStandings({ games, seasonId, teamIdByAbbr, teamNameByAbbr })
}

async function writeRegularSeasonStandings({
  games,
  seasonId,
  teamIdByAbbr,
}: {
  games: NflGameRecord[]
  seasonId: number
  teamIdByAbbr: Map<string, number>
}) {
  const records = new Map<string, {
    played: number
    won: number
    lost: number
    drawn: number
    pointsFor: number
    pointsAgainst: number
  }>()

  const ensureRecord = (abbr: string) => {
    if (!records.has(abbr)) {
      records.set(abbr, { played: 0, won: 0, lost: 0, drawn: 0, pointsFor: 0, pointsAgainst: 0 })
    }
    return records.get(abbr)!
  }

  for (const game of games) {
    const home = ensureRecord(game.homeTeam)
    const away = ensureRecord(game.awayTeam)

    home.played += 1
    away.played += 1
    home.pointsFor += game.homeScore
    home.pointsAgainst += game.awayScore
    away.pointsFor += game.awayScore
    away.pointsAgainst += game.homeScore

    if (game.homeScore > game.awayScore) {
      home.won += 1
      away.lost += 1
    } else if (game.homeScore < game.awayScore) {
      away.won += 1
      home.lost += 1
    } else {
      home.drawn += 1
      away.drawn += 1
    }
  }

  const ordered = Array.from(records.entries()).sort((a, b) => {
    const aWinPct = (a[1].won + a[1].drawn * 0.5) / Math.max(a[1].played, 1)
    const bWinPct = (b[1].won + b[1].drawn * 0.5) / Math.max(b[1].played, 1)
    if (bWinPct !== aWinPct) return bWinPct - aWinPct
    if (b[1].won !== a[1].won) return b[1].won - a[1].won
    const aDiff = a[1].pointsFor - a[1].pointsAgainst
    const bDiff = b[1].pointsFor - b[1].pointsAgainst
    if (bDiff !== aDiff) return bDiff - aDiff
    if (b[1].pointsFor !== a[1].pointsFor) return b[1].pointsFor - a[1].pointsFor
    return a[0].localeCompare(b[0])
  })

  await prisma.teamStanding.deleteMany({ where: { seasonId } })
  await prisma.teamStanding.createMany({
    data: ordered.map(([abbr, record], index) => ({
      teamId: teamIdByAbbr.get(abbr)!,
      seasonId,
      position: index + 1,
      played: record.played,
      won: record.won,
      drawn: record.drawn,
      lost: record.lost,
      points: record.won,
      extra: {
        pointDiff: record.pointsFor - record.pointsAgainst,
        pointsAgainst: record.pointsAgainst,
        pointsFor: record.pointsFor,
        seasonType: 'regular',
        winPct: Math.round(((record.won + record.drawn * 0.5) / Math.max(record.played, 1)) * 1000) / 1000,
      },
    })),
  })
}

async function writePlayoffBracket({
  games,
  seasonId,
  teamIdByAbbr,
}: {
  games: NflGameRecord[]
  seasonId: number
  teamIdByAbbr: Map<string, number>
}) {
  const uniqueWeeks = Array.from(new Set(games.map(game => game.week))).sort((a, b) => a - b)
  const roundByWeek = new Map(uniqueWeeks.map((week, index) => [week, index + 1]))

  const grouped = new Map<string, NflGameRecord[]>()
  for (const game of games) {
    const roundNumber = roundByWeek.get(game.week) ?? 1
    const homeConference = TEAM_CONFERENCES[game.homeTeam]
    const awayConference = TEAM_CONFERENCES[game.awayTeam]
    const conference =
      roundNumber === 4 || homeConference !== awayConference
        ? 'Finals'
        : homeConference ?? awayConference ?? 'Finals'
    const key = `${roundNumber}:${conference}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(game)
  }

  await prisma.nflPlayoffGame.deleteMany({ where: { seasonId } })

  const createData = Array.from(grouped.entries()).flatMap(([key, groupGames]) => {
    const [roundStr, conference] = key.split(':')
    const roundNumber = Number(roundStr)
    return groupGames
      .sort((a, b) => {
        const aTime = a.gameDate?.getTime() ?? 0
        const bTime = b.gameDate?.getTime() ?? 0
        if (aTime !== bTime) return aTime - bTime
        return `${a.awayTeam}-${a.homeTeam}`.localeCompare(`${b.awayTeam}-${b.homeTeam}`)
      })
      .map((game, index) => {
        const team1Id = teamIdByAbbr.get(game.awayTeam)!
        const team2Id = teamIdByAbbr.get(game.homeTeam)!
        const winnerTeamId = game.awayScore > game.homeScore
          ? team1Id
          : game.homeScore > game.awayScore
            ? team2Id
            : null

        return {
          seasonId,
          roundNumber,
          conference,
          gameOrder: index + 1,
          eventId: game.eventId,
          gameDate: game.gameDate,
          team1Id,
          team2Id,
          team1Score: game.awayScore,
          team2Score: game.homeScore,
          winnerTeamId,
        }
      })
  })

  if (createData.length > 0) {
    await prisma.nflPlayoffGame.createMany({ data: createData })
  }
}

async function writePlayoffStandings({
  games,
  seasonId,
  teamIdByAbbr,
  teamNameByAbbr,
}: {
  games: NflGameRecord[]
  seasonId: number
  teamIdByAbbr: Map<string, number>
  teamNameByAbbr: Map<string, string>
}) {
  const roundByWeek = new Map(
    Array.from(new Set(games.map(game => game.week)))
      .sort((a, b) => a - b)
      .map((week, index) => [week, index + 1])
  )

  const playoffStats = new Map<string, { played: number; won: number; lost: number; pointsFor: number; pointsAgainst: number }>()
  const ensureStats = (abbr: string) => {
    if (!playoffStats.has(abbr)) {
      playoffStats.set(abbr, { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 })
    }
    return playoffStats.get(abbr)!
  }

  for (const game of games) {
    const away = ensureStats(game.awayTeam)
    const home = ensureStats(game.homeTeam)
    away.played += 1
    home.played += 1
    away.pointsFor += game.awayScore
    away.pointsAgainst += game.homeScore
    home.pointsFor += game.homeScore
    home.pointsAgainst += game.awayScore

    if (game.awayScore > game.homeScore) {
      away.won += 1
      home.lost += 1
    } else if (game.homeScore > game.awayScore) {
      home.won += 1
      away.lost += 1
    }
  }

  const orderedGames = [...games].sort((a, b) => {
    const roundDiff = (roundByWeek.get(b.week) ?? 0) - (roundByWeek.get(a.week) ?? 0)
    if (roundDiff !== 0) return roundDiff
    const aTime = a.gameDate?.getTime() ?? 0
    const bTime = b.gameDate?.getTime() ?? 0
    return aTime - bTime
  })

  const positions: string[] = []
  const seen = new Set<string>()
  const finalGame = orderedGames.find(game => (roundByWeek.get(game.week) ?? 0) === 4)
  if (finalGame) {
    const champion = finalGame.awayScore > finalGame.homeScore ? finalGame.awayTeam : finalGame.homeTeam
    const runnerUp = finalGame.awayScore > finalGame.homeScore ? finalGame.homeTeam : finalGame.awayTeam
    positions.push(champion, runnerUp)
    seen.add(champion)
    seen.add(runnerUp)
  }

  for (const game of orderedGames) {
    const actualLoser = game.awayScore > game.homeScore ? game.homeTeam : game.homeScore > game.awayScore ? game.awayTeam : null
    if (!actualLoser || seen.has(actualLoser)) continue
    positions.push(actualLoser)
    seen.add(actualLoser)
  }

  await prisma.teamStanding.deleteMany({ where: { seasonId } })
  await prisma.teamStanding.createMany({
    data: positions
      .filter(abbr => teamIdByAbbr.has(abbr))
      .map((abbr, index) => {
        const stats = playoffStats.get(abbr) ?? { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }
        return {
          teamId: teamIdByAbbr.get(abbr)!,
          seasonId,
          position: index + 1,
          played: stats.played,
          won: stats.won,
          drawn: 0,
          lost: stats.lost,
          points: stats.won,
          extra: {
            conference: TEAM_CONFERENCES[abbr] ?? null,
            pointsAgainst: stats.pointsAgainst,
            pointsFor: stats.pointsFor,
            seasonType: 'playoffs',
            teamName: teamNameByAbbr.get(abbr) ?? abbr,
          },
        }
      }),
  })
}
