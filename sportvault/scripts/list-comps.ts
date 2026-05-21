import { config } from 'dotenv'
config({ path: '.env.local' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
async function r() {
  const c = await prisma.competition.findMany({ select: { slug: true, sport: { select: { slug: true } } } })
  console.log(c)
  const seasons = await prisma.season.findMany({ select: { year: true, competition: { select: { slug: true } } }, orderBy: { year: 'asc' } })
  console.log('\nSeasons:')
  for (const s of seasons) console.log(`  ${s.competition.slug} ${s.year}`)
  await prisma.$disconnect()
}
r()
