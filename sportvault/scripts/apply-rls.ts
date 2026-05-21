import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Use pooler (IPv4) since the direct host is IPv6-only.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function run() {
  const sql = readFileSync('prisma/sql/enable-rls.sql', 'utf8')
  // Split on semicolons that end statements (skip pure comment/blank lines)
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  for (const stmt of statements) {
    console.log(`> ${stmt.slice(0, 80)}...`)
    await prisma.$executeRawUnsafe(stmt)
  }

  // Verify
  const rows: { relname: string; relrowsecurity: boolean }[] = await prisma.$queryRawUnsafe(`
    SELECT relname, relrowsecurity FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
    ORDER BY relname
  `)
  console.log('\nRLS status:')
  for (const r of rows) console.log(`  ${r.relrowsecurity ? '✓' : '✗'} ${r.relname}`)

  await prisma.$disconnect()
}

run().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
