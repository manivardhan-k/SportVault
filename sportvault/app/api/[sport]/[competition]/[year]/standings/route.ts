import { type NextRequest } from 'next/server'
import { getCached, standingsKey, TTL } from '@/lib/cache'
import { getF1Standings } from '@/lib/queries/f1'
import { getSoccerStandings } from '@/lib/queries/soccer'
import { getNflStandings } from '@/lib/queries/nfl'
import { getNbaStandings } from '@/lib/queries/nba'
import { getCricketLeaderboard } from '@/lib/queries/cricket'
import { getTennisLeaderboard } from '@/lib/queries/tennis'
import { getMmaLeaderboard } from '@/lib/queries/mma'
import { isKnownSport, isSafeSlug, jsonError, logApiError, normalizePositionParam, parseRouteYear } from '@/lib/api-guards'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sport: string; competition: string; year: string }> }
) {
  const { sport, competition, year: yearStr } = await params
  const year = parseRouteYear(yearStr)
  const position = normalizePositionParam(req.nextUrl.searchParams.get('position')) ?? 'QB'

  if (!isSafeSlug(sport) || !isSafeSlug(competition) || year == null) {
    return jsonError('Invalid standings request', 400)
  }

  if (!isKnownSport(sport)) {
    return jsonError('Unknown sport', 400)
  }

  const key = standingsKey(sport, competition, year, sport === 'nfl' ? position.toUpperCase() : undefined)

  try {
    const data = await getCached(key, () => {
      switch (sport) {
        case 'f1': return getF1Standings(year)
        case 'soccer': return getSoccerStandings(competition, year)
        case 'nfl': return getNflStandings(competition, year, position)
        case 'nba': return getNbaStandings(competition, year)
        case 'cricket': return getCricketLeaderboard(competition, year)
        case 'tennis': return getTennisLeaderboard(competition, year)
        case 'mma': return getMmaLeaderboard(competition, year)
        default: throw new Error('Unknown sport')
      }
    }, TTL.HISTORICAL)

    return Response.json(data)
  } catch (err) {
    logApiError('standings', err)
    return jsonError('Unable to load standings', 500)
  }
}
