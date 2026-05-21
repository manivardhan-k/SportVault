import path from 'node:path'
import type { Prisma } from '@prisma/client'
import { prisma } from './utils/db'
import { upsertCompetition, upsertSeason, upsertSport } from './utils/upsert'
import { runPythonScript } from './utils/python'
import { numberOrZero, streamCsvToArray, validateCsv } from './utils/csv'

const BATCH_SIZE = 100
type DbOperation = Prisma.PrismaPromise<unknown>

function slugify(value: string) {
  return value.toLowerCase().replace(/women's/g, 'womens').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(' ')
  const lastName = parts.pop() ?? fullName
  return { firstName: parts.join(' '), lastName }
}

export async function ingestMma({ year }: { year: number }) {
  console.log(`\n=== MMA ${year} ===`)
  const csvPath = process.env.MMA_CSV_PATH || `/tmp/mma_${year}.csv`

  if (!process.env.MMA_CSV_PATH) {
    await runPythonScript(path.join('scripts', 'ingest', 'fetch_mma.py'), [
      '--year', String(year),
      '--output', csvPath,
    ])
  } else {
    console.log(`[mma] reusing csv ${csvPath}`)
  }

  validateCsv(csvPath, ['player_id', 'player_name', 'weight_class', 'fights', 'wins'])
  const rows = await streamCsvToArray(csvPath)
  if (rows.length === 0) throw new Error(`No mma rows for ${year}`)

  const sport = await upsertSport('mma', 'MMA', 'MMA')
  const seasonByWeightClass = new Map<string, number>()
  const teamByWeightClass = new Map<string, number>()

  for (const row of rows) {
    const weightClass = row.weight_class?.trim() || 'Open Weight'
    if (seasonByWeightClass.has(weightClass)) continue
    const slug = `ufc-${slugify(weightClass)}`
    const comp = await upsertCompetition(sport.id, slug, weightClass, 'league')
    const season = await upsertSeason(comp.id, year, String(year))
    seasonByWeightClass.set(weightClass, season.id)

    const team = await prisma.team.upsert({
      where: { sportId_externalId: { sportId: sport.id, externalId: weightClass } },
      create: { sportId: sport.id, externalId: weightClass, name: weightClass, shortName: weightClass, colorPrimary: '#B22222' },
      update: { name: weightClass, shortName: weightClass, colorPrimary: '#B22222' },
    })
    teamByWeightClass.set(weightClass, team.id)
  }

  const existingSeasonIds = (await prisma.season.findMany({
    where: { year, competition: { sportId: sport.id } },
    select: { id: true },
  })).map(season => season.id)

  if (existingSeasonIds.length > 0) {
    await prisma.$transaction([
      prisma.mmaFighterStat.deleteMany({ where: { seasonId: { in: existingSeasonIds } } }),
      prisma.playerSeason.deleteMany({ where: { seasonId: { in: existingSeasonIds } } }),
    ])
  }

  const playerOps: DbOperation[] = []
  const statOps: DbOperation[] = []
  for (const row of rows) {
    const weightClass = row.weight_class?.trim() || 'Open Weight'
    const seasonId = seasonByWeightClass.get(weightClass)
    const teamId = teamByWeightClass.get(weightClass)
    if (!seasonId || !teamId) continue

    const { firstName, lastName } = splitName(row.player_name ?? '')
    const player = await prisma.player.upsert({
      where: { sportId_externalId: { sportId: sport.id, externalId: row.player_id } },
      create: {
        sportId: sport.id,
        externalId: row.player_id,
        firstName,
        lastName,
        nationality: row.nationality ?? '',
      },
      update: {
        firstName,
        lastName,
        nationality: row.nationality ?? '',
      },
    })

    playerOps.push(
      prisma.playerSeason.upsert({
        where: { playerId_seasonId: { playerId: player.id, seasonId } },
        create: { playerId: player.id, seasonId, teamId },
        update: { teamId },
      })
    )
    statOps.push(
      prisma.mmaFighterStat.upsert({
        where: { playerId_seasonId_weightClass: { playerId: player.id, seasonId, weightClass } },
        create: {
          playerId: player.id,
          seasonId,
          weightClass,
          fights: numberOrZero(row.fights),
          wins: numberOrZero(row.wins),
          losses: numberOrZero(row.losses),
          sigStrikesPerMin: numberOrZero(row.sig_strikes_per_min),
          sigStrikeAcc: numberOrZero(row.sig_strike_acc),
          takedownAvg: numberOrZero(row.takedown_avg),
          takedownAcc: numberOrZero(row.takedown_acc),
          subAvg: numberOrZero(row.sub_avg),
        },
        update: {
          fights: numberOrZero(row.fights),
          wins: numberOrZero(row.wins),
          losses: numberOrZero(row.losses),
          sigStrikesPerMin: numberOrZero(row.sig_strikes_per_min),
          sigStrikeAcc: numberOrZero(row.sig_strike_acc),
          takedownAvg: numberOrZero(row.takedown_avg),
          takedownAcc: numberOrZero(row.takedown_acc),
          subAvg: numberOrZero(row.sub_avg),
        },
      })
    )
  }

  for (let i = 0; i < playerOps.length; i += BATCH_SIZE) {
    await prisma.$transaction(playerOps.slice(i, i + BATCH_SIZE))
  }
  for (let i = 0; i < statOps.length; i += BATCH_SIZE) {
    await prisma.$transaction(statOps.slice(i, i + BATCH_SIZE))
  }
  console.log(`Done: mma ${year} rows=${rows.length}`)
}
