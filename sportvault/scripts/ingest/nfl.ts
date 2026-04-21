import fs from 'fs'
import { parse } from 'csv-parse/sync'
import { execSync } from 'child_process'
import { prisma } from './utils/db'
import { upsertSport, upsertCompetition, upsertSeason, upsertTeam, upsertPlayer } from './utils/upsert'

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

export async function ingestNfl(year: number, seasonType: 'regular' | 'playoffs' = 'regular') {
  console.log(`\n=== NFL ${year} ${seasonType} ===`)

  const csvPath = `/tmp/nfl_${year}_${seasonType}.csv`
  console.log('Running Python export...')
  const pyenvPy = `${process.env.HOME}/.pyenv/versions/3.11.14/bin/python3.11`
  const py = ['python3.11', pyenvPy, 'python3', 'python'].find(p => {
    try { execSync(`${p} -c "import nfl_data_py"`, { stdio: 'pipe' }); return true } catch { return false }
  }) ?? 'python3'
  const seasonTypeArg = seasonType === 'playoffs' ? 'POST' : 'REG'
  execSync(`${py} scripts/ingest/fetch_nfl.py --year ${year} --output ${csvPath} --season-type ${seasonTypeArg}`, { stdio: 'inherit' })

  const sport = await upsertSport('nfl', 'NFL', '🏈')
  const slug = seasonType === 'playoffs' ? 'nfl-playoffs' : 'nfl-regular'
  const name = seasonType === 'playoffs' ? 'Playoffs' : 'Regular Season'
  const comp = await upsertCompetition(sport.id, slug, name, seasonType === 'playoffs' ? 'tournament' : 'league')
  const season = await upsertSeason(comp.id, year, String(year))

  const raw = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(raw, { columns: true, skip_empty_lines: true }) as Record<string, string>[]

  let count = 0
  for (const row of records) {
    if (!row.player_id || !row.position) continue
    const position = row.position.toUpperCase()
    if (!['QB', 'RB', 'WR', 'TE'].includes(position)) continue

    const abbr = (row.recent_team ?? 'UNK').trim()
    const team = await upsertTeam(sport.id, abbr, TEAM_NAMES[abbr] ?? abbr, abbr, TEAM_COLORS[abbr] ?? '#888888')

    const nameParts = (row.player_name ?? '').trim().split(' ')
    const lastName = nameParts.pop() ?? row.player_name
    const firstName = nameParts.join(' ')
    const player = await upsertPlayer(sport.id, row.player_id, firstName, lastName, '')
    await prisma.player.update({ where: { id: player.id }, data: { position } })

    await prisma.playerSeason.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
      create: { playerId: player.id, teamId: team.id, seasonId: season.id },
      update: { teamId: team.id },
    })

    const stats = {
      passing_yards: Number(row.passing_yards ?? 0),
      passing_tds: Number(row.passing_tds ?? 0),
      interceptions: Number(row.interceptions ?? 0),
      passer_rating: Math.round(Number(row.passer_rating ?? 0) * 10) / 10,
      rushing_yards: Number(row.rushing_yards ?? 0),
      rushing_tds: Number(row.rushing_tds ?? 0),
      receptions: Number(row.receptions ?? 0),
      targets: Number(row.targets ?? 0),
      receiving_yards: Number(row.receiving_yards ?? 0),
      receiving_tds: Number(row.receiving_tds ?? 0),
    }

    const existing = await prisma.nflPlayerStat.findFirst({
      where: { playerId: player.id, seasonId: season.id, seasonType },
    })
    const statData = { playerId: player.id, seasonId: season.id, seasonType, gamesPlayed: Number(row.games ?? 0), stats }
    if (existing) {
      await prisma.nflPlayerStat.update({ where: { id: existing.id }, data: statData })
    } else {
      await prisma.nflPlayerStat.create({ data: statData })
    }
    count++
  }

  console.log(`Done: ${count} skill position players`)
}
