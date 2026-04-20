import { prisma } from './utils/db'
import { fetchWithDelay } from './utils/http'
import { upsertSport, upsertCompetition, upsertSeason, upsertTeam, upsertPlayer } from './utils/upsert'

const BASE = 'https://api.jolpi.ca/ergast/f1'

const TEAM_COLORS: Record<string, string> = {
  'Red Bull': '#3671C6',
  'Ferrari': '#E8002D',
  'Mercedes': '#27F4D2',
  'McLaren': '#FF8000',
  'Aston Martin': '#358C75',
  'Alpine F1 Team': '#FF87BC',
  'Williams': '#64C4FF',
  'AlphaTauri': '#5E8FAA',
  'RB F1 Team': '#5E8FAA',
  'Alfa Romeo': '#C92D4B',
  'Sauber': '#00E48B',
  'Haas F1 Team': '#B6BABD',
}

export async function ingestF1(year: number) {
  console.log(`\n=== F1 ${year} ===`)

  const sport = await upsertSport('f1', 'Formula 1', '🏎️')
  const comp = await upsertCompetition(sport.id, 'f1-championship', 'Championship', 'championship')
  const season = await upsertSeason(comp.id, year, String(year))

  // Driver standings
  const standingsData = await fetchWithDelay(`${BASE}/${year}/driverStandings.json`) as any
  const standings = standingsData.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []

  for (const entry of standings) {
    const d = entry.Driver
    const c = entry.Constructors[0]

    const team = await upsertTeam(sport.id, c.constructorId, c.name, c.name.substring(0, 20), TEAM_COLORS[c.name] ?? '#888888')
    const player = await upsertPlayer(sport.id, d.driverId, d.givenName, d.familyName, d.nationality)

    await prisma.playerSeason.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
      create: { playerId: player.id, teamId: team.id, seasonId: season.id },
      update: { teamId: team.id },
    })

    await prisma.f1DriverStanding.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
      create: {
        playerId: player.id, seasonId: season.id,
        finalPosition: Number(entry.position),
        totalPoints: Number(entry.points),
        wins: Number(entry.wins),
      },
      update: {
        finalPosition: Number(entry.position),
        totalPoints: Number(entry.points),
        wins: Number(entry.wins),
      },
    })
    console.log(`  P${entry.position} ${d.givenName} ${d.familyName} — ${entry.points}pts`)
  }

  // Race results (for charts) — paginate since Jolpica returns ~6 per page
  const races: any[] = []
  let offset = 0
  while (true) {
    const page = await fetchWithDelay(`${BASE}/${year}/results.json?limit=100&offset=${offset}`, {}, 300) as any
    const batch = page.MRData?.RaceTable?.Races ?? []
    races.push(...batch)
    const total = Number(page.MRData?.total ?? 0)
    offset += batch.length
    if (offset >= total || batch.length === 0) break
  }

  for (const race of races) {
    for (const result of race.Results) {
      const player = await prisma.player.findFirst({
        where: { sportId: sport.id, externalId: result.Driver.driverId },
      })
      if (!player) continue

      const existing = await prisma.f1RaceResult.findFirst({
        where: { playerId: player.id, seasonId: season.id, round: Number(race.round) },
      })

      const raceData = {
        playerId: player.id,
        seasonId: season.id,
        round: Number(race.round),
        raceName: race.raceName,
        finishPosition: Number(result.position),
        gridPosition: Number(result.grid),
        points: Number(result.points),
        status: result.status,
        fastestLap: result.FastestLap?.rank === '1',
      }

      if (existing) {
        await prisma.f1RaceResult.update({ where: { id: existing.id }, data: raceData })
      } else {
        await prisma.f1RaceResult.create({ data: raceData })
      }
    }
  }

  // Sprint results — paginate same way
  const sprintRaces: any[] = []
  let sprintOffset = 0
  while (true) {
    const page = await fetchWithDelay(`${BASE}/${year}/sprint.json?limit=100&offset=${sprintOffset}`, {}, 300) as any
    const batch = page.MRData?.RaceTable?.Races ?? []
    sprintRaces.push(...batch)
    const total = Number(page.MRData?.total ?? 0)
    sprintOffset += batch.length
    if (sprintOffset >= total || batch.length === 0) break
  }

  for (const race of sprintRaces) {
    for (const result of race.SprintResults ?? []) {
      const player = await prisma.player.findFirst({
        where: { sportId: sport.id, externalId: result.Driver.driverId },
      })
      if (!player) continue

      const existing = await prisma.f1RaceResult.findFirst({
        where: { playerId: player.id, seasonId: season.id, round: Number(race.round) },
      })
      const sprintPts = Number(result.points)
      if (existing) {
        await prisma.f1RaceResult.update({ where: { id: existing.id }, data: { sprintPoints: sprintPts } })
      }
    }
  }

  console.log(`Done: ${standings.length} drivers, ${races.length} races, ${sprintRaces.length} sprint events`)
}
