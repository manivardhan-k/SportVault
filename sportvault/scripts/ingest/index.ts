import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })
import { ingestF1 } from './f1'
import { ingestSoccer } from './soccer'
import { ingestNfl } from './nfl'
import { ingestNba } from './nba'
import { prisma } from './utils/db'

const args = process.argv.slice(2)

function arg(flag: string): string | null {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] ?? null : null
}

const sport = arg('--sport')
const year = Number(arg('--year'))
const competition = arg('--competition') ?? 'premier-league'
const seasonType = (arg('--type') ?? 'regular') as 'regular' | 'playoffs'

if (!sport || !year) {
  console.error('Usage: npm run ingest -- --sport <f1|soccer|nfl|nba> --year <year> [--competition <slug>] [--type regular|playoffs]')
  process.exit(1)
}

async function run() {
  switch (sport) {
    case 'f1': await ingestF1(year); break
    case 'soccer': await ingestSoccer(competition, year); break
    case 'nfl': await ingestNfl(year, seasonType); break
    case 'nba': await ingestNba(year, seasonType); break
    default:
      console.error(`Unknown sport: ${sport}`)
      process.exit(1)
  }
  await prisma.$disconnect()
}

run().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
