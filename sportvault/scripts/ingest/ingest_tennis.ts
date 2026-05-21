import path from 'node:path'
import type { Prisma } from '@prisma/client'
import { prisma } from './utils/db'
import { upsertCompetition, upsertSeason, upsertSport } from './utils/upsert'
import { runPythonScript } from './utils/python'
import { numberOrZero, streamCsvToArray, validateCsv } from './utils/csv'

const BATCH_SIZE = 100
type DbOperation = Prisma.PrismaPromise<unknown>

const SURFACES = ['ALL', 'HARD', 'CLAY', 'GRASS'] as const
const COUNTRY_COLORS: Record<string, string> = {
  USA: '#3C3B6E',
  ESP: '#AA151B',
  SRB: '#0C4076',
  ITA: '#009246',
  GBR: '#012169',
  AUS: '#012169',
  FRA: '#0055A4',
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(' ')
  const lastName = parts.pop() ?? fullName
  return { firstName: parts.join(' '), lastName }
}

function competitionSlug(tour: string, surface: string) {
  return `${tour.toLowerCase()}-${surface === 'ALL' ? 'overall' : surface.toLowerCase()}`
}

function competitionName(tour: string, surface: string) {
  return `${tour.toUpperCase()} ${surface === 'ALL' ? 'Overall' : surface[0] + surface.slice(1).toLowerCase()}`
}

export async function ingestTennis({ year, tour }: { year: number; tour: 'atp' | 'wta' }) {
  console.log(`\n=== Tennis ${tour.toUpperCase()} ${year} ===`)
  const csvPath = `/tmp/tennis_${tour}_${year}.csv`

  await runPythonScript(path.join('scripts', 'ingest', 'fetch_tennis.py'), [
    '--year', String(year),
    '--tour', tour,
    '--output', csvPath,
  ])

  validateCsv(csvPath, ['player_id', 'player_name', 'tour', 'surface', 'matches', 'wins'])
  const rows = await streamCsvToArray(csvPath)
  if (rows.length === 0) throw new Error(`No tennis rows for ${tour} ${year}`)

  const sport = await upsertSport('tennis', 'Tennis', 'TN')

  const seasonBySurface = new Map<string, number>()
  for (const surface of SURFACES) {
    const comp = await upsertCompetition(sport.id, competitionSlug(tour, surface), competitionName(tour, surface), 'league')
    const season = await upsertSeason(comp.id, year, String(year))
    seasonBySurface.set(surface, season.id)
  }

  const teamData = new Map<string, { name: string; shortName: string; color: string }>()
  const playerData = new Map<string, { firstName: string; lastName: string; nationality: string; teamCode: string }>()
  for (const row of rows) {
    const code = (row.nationality ?? 'INTL').trim() || 'INTL'
    if (!teamData.has(code)) {
      teamData.set(code, { name: code, shortName: code, color: COUNTRY_COLORS[code] ?? '#2E8B57' })
    }
    if (!playerData.has(row.player_id)) {
      const { firstName, lastName } = splitName(row.player_name ?? '')
      playerData.set(row.player_id, { firstName, lastName, nationality: code, teamCode: code })
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
      nationality: player.nationality,
    })),
    skipDuplicates: true,
  })

  const [teams, players] = await Promise.all([
    prisma.team.findMany({
      where: { sportId: sport.id, externalId: { in: Array.from(teamData.keys()) } },
      select: { id: true, externalId: true },
    }),
    prisma.player.findMany({
      where: { sportId: sport.id, externalId: { in: Array.from(playerData.keys()) } },
      select: { id: true, externalId: true },
    }),
  ])

  const teamIdByCode = new Map(teams.map(team => [team.externalId ?? '', team.id]))
  const playerIdByExternal = new Map(players.map(player => [player.externalId ?? '', player.id]))

  const playerSeasonOps: DbOperation[] = []
  const seenPlayerSeason = new Set<string>()
  for (const row of rows) {
    const seasonId = seasonBySurface.get(row.surface)
    const playerId = playerIdByExternal.get(row.player_id)
    const teamId = teamIdByCode.get(playerData.get(row.player_id)?.teamCode ?? '')
    if (!seasonId || !playerId || !teamId) continue
    const key = `${playerId}:${seasonId}`
    if (seenPlayerSeason.has(key)) continue
    seenPlayerSeason.add(key)
    playerSeasonOps.push(
      prisma.playerSeason.upsert({
        where: { playerId_seasonId: { playerId, seasonId } },
        create: { playerId, seasonId, teamId },
        update: { teamId },
      })
    )
  }
  for (let i = 0; i < playerSeasonOps.length; i += BATCH_SIZE) {
    await prisma.$transaction(playerSeasonOps.slice(i, i + BATCH_SIZE))
  }

  const statOps: DbOperation[] = []
  for (const row of rows) {
    const seasonId = seasonBySurface.get(row.surface)
    const playerId = playerIdByExternal.get(row.player_id)
    if (!seasonId || !playerId) continue
    statOps.push(
      prisma.tennisPlayerStat.upsert({
        where: {
          playerId_seasonId_tour_surface: {
            playerId,
            seasonId,
            tour: row.tour,
            surface: row.surface,
          },
        },
        create: {
          playerId,
          seasonId,
          tour: row.tour,
          surface: row.surface,
          matches: numberOrZero(row.matches),
          wins: numberOrZero(row.wins),
          aces: numberOrZero(row.aces),
          doubleFaults: numberOrZero(row.double_faults),
          firstServePct: numberOrZero(row.first_serve_pct),
          firstSrvWonPct: numberOrZero(row.first_srv_won_pct),
          returnWonPct: numberOrZero(row.return_won_pct),
          rankYearEnd: numberOrZero(row.rank_year_end),
        },
        update: {
          matches: numberOrZero(row.matches),
          wins: numberOrZero(row.wins),
          aces: numberOrZero(row.aces),
          doubleFaults: numberOrZero(row.double_faults),
          firstServePct: numberOrZero(row.first_serve_pct),
          firstSrvWonPct: numberOrZero(row.first_srv_won_pct),
          returnWonPct: numberOrZero(row.return_won_pct),
          rankYearEnd: numberOrZero(row.rank_year_end),
        },
      })
    )
  }
  for (let i = 0; i < statOps.length; i += BATCH_SIZE) {
    await prisma.$transaction(statOps.slice(i, i + BATCH_SIZE))
  }

  console.log(`Done: ${rows.length} tennis rows`)
}
