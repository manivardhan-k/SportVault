import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: (process.env.DIRECT_URL ?? process.env.DATABASE_URL)! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const teamDups = await prisma.$queryRawUnsafe<{ sport_id: number; external_id: string; n: bigint }[]>(`
    SELECT "sportId" AS sport_id, "externalId" AS external_id, COUNT(*) AS n
    FROM teams
    WHERE "externalId" IS NOT NULL
    GROUP BY "sportId", "externalId"
    HAVING COUNT(*) > 1
  `)
  const playerDups = await prisma.$queryRawUnsafe<{ sport_id: number; external_id: string; n: bigint }[]>(`
    SELECT "sportId" AS sport_id, "externalId" AS external_id, COUNT(*) AS n
    FROM players
    WHERE "externalId" IS NOT NULL
    GROUP BY "sportId", "externalId"
    HAVING COUNT(*) > 1
  `)
  console.log(`team duplicates on (sportId, externalId): ${teamDups.length}`)
  if (teamDups.length) console.log(teamDups)
  console.log(`player duplicates on (sportId, externalId): ${playerDups.length}`)
  if (playerDups.length) console.log(playerDups)

  const teamNullExt = await prisma.team.count({ where: { externalId: null } })
  const playerNullExt = await prisma.player.count({ where: { externalId: null } })
  console.log(`teams with NULL externalId: ${teamNullExt}`)
  console.log(`players with NULL externalId: ${playerNullExt}`)

  await prisma.$disconnect()
}
main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
