import { prisma } from '@/lib/db'

export async function GET() {
  const sports = await prisma.sport.findMany({
    include: {
      competitions: {
        include: {
          seasons: { orderBy: { year: 'desc' } },
        },
      },
    },
  })
  return Response.json(sports)
}
