import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: (process.env.DIRECT_URL ?? process.env.DATABASE_URL)! })
export const prisma = new PrismaClient({ adapter })
