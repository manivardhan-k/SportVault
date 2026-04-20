import { type NextRequest } from 'next/server'
import { getCached, standingsKey, TTL } from '@/lib/cache'
import { getF1Standings } from '@/lib/queries/f1'
import { getSoccerStandings } from '@/lib/queries/soccer'
import { getNflStandings } from '@/lib/queries/nfl'
import { getNbaStandings } from '@/lib/queries/nba'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sport: string; competition: string; year: string }> }
) {
  const { sport, competition, year: yearStr } = await params
  const year = Number(yearStr)
  const position = req.nextUrl.searchParams.get('position') ?? 'QB'

  const key = standingsKey(sport, competition, year) + (sport === 'nfl' ? `:${position}` : '')

  try {
    const data = await getCached(key, () => {
      switch (sport) {
        case 'f1': return getF1Standings(year)
        case 'soccer': return getSoccerStandings(competition, year)
        case 'nfl': return getNflStandings(competition, year, position)
        case 'nba': return getNbaStandings(competition, year)
        default: throw new Error(`Unknown sport: ${sport}`)
      }
    }, TTL.HISTORICAL)

    return Response.json(data)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
