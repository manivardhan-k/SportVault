import { getCached, TTL } from '@/lib/cache'
import { getNbaPlayoffMatchStats } from '@/lib/queries/nba-match-stats'
import { getNflPlayoffMatchStats } from '@/lib/queries/nfl-match-stats'
import { isSafeMatchId, isSafeSlug, jsonError, logApiError, normalizePositionParam, parseBracketTeamId, parseRouteYear } from '@/lib/api-guards'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sport: string; competition: string; year: string; matchId: string }> }
) {
  const { sport, competition, year: yearStr, matchId } = await params
  const year = parseRouteYear(yearStr)
  const { searchParams } = new URL(req.url)
  const position = normalizePositionParam(searchParams.get('position'))
  const team1Id = parseBracketTeamId(searchParams.get('team1Id'))
  const team2Id = parseBracketTeamId(searchParams.get('team2Id'))
  let decodedMatchId: string

  try {
    decodedMatchId = decodeURIComponent(matchId)
  } catch {
    return jsonError('Invalid match stats request', 400)
  }

  if (!isSafeSlug(sport) || !isSafeSlug(competition) || year == null || !isSafeMatchId(decodedMatchId)) {
    return jsonError('Invalid match stats request', 400)
  }

  if (
    !((sport === 'nba' && competition === 'nba-playoffs') ||
      (sport === 'nfl' && competition === 'nfl-playoffs'))
  ) {
    return jsonError('Match stats are only available for NBA and NFL playoffs right now', 404)
  }

  try {
    const data = await getCached(
      `bracket-match:v3:${sport}:${competition}:${year}:${decodedMatchId}:${position ?? ''}:${team1Id ?? ''}:${team2Id ?? ''}`,
      () => {
        return sport === 'nba'
          ? getNbaPlayoffMatchStats(year, decodedMatchId)
          : getNflPlayoffMatchStats({
              year,
              matchId: decodedMatchId,
              position,
              team1Id: team1Id ?? undefined,
              team2Id: team2Id ?? undefined,
            })
      },
      TTL.HISTORICAL
    )
    return Response.json(data)
  } catch (err) {
    logApiError('bracket-match', err)
    return jsonError('Unable to load match stats', 500)
  }
}
