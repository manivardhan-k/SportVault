import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function run() {
  const targets = [
    { sport: 'f1', competition: 'f1-championship' },
    { sport: 'nba', competition: 'nba-regular' },
    { sport: 'nba', competition: 'nba-playoffs' },
  ]
  const years = [2023, 2024, 2025]

  console.log(`\n${'sport'.padEnd(8)}${'comp'.padEnd(16)}${'year'.padEnd(8)}${'seeded'.padEnd(10)}rows`)
  console.log('-'.repeat(60))

  for (const t of targets) {
    for (const y of years) {
      const season = await prisma.season.findFirst({
        where: { competition: { slug: t.competition }, year: y },
      })
      let rows = 0
      if (season) {
        if (t.sport === 'f1') {
          rows = await prisma.f1DriverStanding.count({ where: { seasonId: season.id } })
        } else if (t.competition === 'nba-playoffs') {
          rows = await prisma.nbaPlayoffSeries.count({ where: { seasonId: season.id } })
        } else {
          rows = await prisma.nbaPlayerStat.count({ where: { seasonId: season.id } })
        }
      }
      const seeded = season ? '✓' : '✗'
      console.log(`${t.sport.padEnd(8)}${t.competition.padEnd(16)}${String(y).padEnd(8)}${seeded.padEnd(10)}${rows}`)
    }
  }

  await prisma.$disconnect()
}

run().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
