import { getF1PlayerStats } from '@/lib/queries/f1'
import { getSoccerPlayerStats } from '@/lib/queries/soccer'
import { getNflPlayerStats } from '@/lib/queries/nfl'
import { getNbaPlayerStats } from '@/lib/queries/nba'
import { getCricketPlayerStats } from '@/lib/queries/cricket'
import { getTennisPlayerStats } from '@/lib/queries/tennis'
import { getMmaPlayerStats } from '@/lib/queries/mma'
import { isSafeSlug, jsonError, logApiError, parsePositiveInt, parseRouteYear } from '@/lib/api-guards'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sport: string; competition: string; year: string; id: string }> }
) {
  const { sport, competition, year: yearStr, id } = await params
  const year = parseRouteYear(yearStr)
  const playerId = parsePositiveInt(id)

  if (!isSafeSlug(sport) || !isSafeSlug(competition) || year == null || playerId == null) {
    return jsonError('Invalid player stats request', 400)
  }

  try {
    let data
    switch (sport) {
      case 'f1': data = await getF1PlayerStats(playerId, year); break
      case 'soccer': data = await getSoccerPlayerStats(playerId, competition, year); break
      case 'nfl': data = await getNflPlayerStats(playerId, competition, year); break
      case 'nba': data = await getNbaPlayerStats(playerId, competition, year); break
      case 'cricket': data = await getCricketPlayerStats(playerId, competition, year); break
      case 'tennis': data = await getTennisPlayerStats(playerId, competition, year); break
      case 'mma': data = await getMmaPlayerStats(playerId, competition, year); break
      default: return jsonError('Unknown sport', 400)
    }
    return Response.json(data)
  } catch (err) {
    logApiError('player', err)
    return jsonError('Unable to load player stats', 500)
  }
}
