import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })
import { ingestF1 } from './f1'
import { ingestSoccer } from './soccer'
import { ingestNfl } from './nfl'
import { ingestNba } from './nba'
import { ingestCricket } from './ingest_cricket'
import { ingestTennis } from './ingest_tennis'
import { ingestMma } from './ingest_mma'
import { prisma } from './utils/db'

const args = process.argv.slice(2)
const usage = 'Usage: npm run ingest -- --sport <f1|soccer|nfl|nba|cricket|tennis|mma> --year <year> [--competition <slug>] [--type regular|playoffs|t20i|odi|test|ipl] [--tour atp|wta]'

if (args.includes('--help') || args.includes('-h')) {
  console.log(usage)
  process.exit(0)
}

function arg(flag: string): string | null {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] ?? null : null
}

const sport = arg('--sport')
const year = Number(arg('--year'))
const competition = arg('--competition') ?? 'premier-league'
const seasonType = (arg('--type') ?? 'regular') as 'regular' | 'playoffs'
const tour = (arg('--tour') ?? 'atp') as 'atp' | 'wta'

if (!sport || !year) {
  console.error(usage)
  process.exit(1)
}

async function run() {
  switch (sport) {
    case 'f1': await ingestF1(year); break
    case 'soccer': await ingestSoccer(competition, year); break
    case 'nfl': await ingestNfl(year, seasonType); break
    case 'nba': await ingestNba(year, seasonType); break
    case 'cricket': await ingestCricket({ year, type: seasonType as 't20i' | 'odi' | 'test' | 'ipl' }); break
    case 'tennis': await ingestTennis({ year, tour }); break
    case 'mma': await ingestMma({ year }); break

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
