import { prisma } from '@/lib/db'
import { jsonError, logApiError } from '@/lib/api-guards'

export async function GET() {
  try {
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
  } catch (err) {
    logApiError('sports', err)
    return jsonError('Unable to load sports', 500)
  }
}
