import { getF1PlayerStats } from '@/lib/queries/f1'
import { getSoccerPlayerStats } from '@/lib/queries/soccer'
import { getNflPlayerStats } from '@/lib/queries/nfl'
import { getNbaPlayerStats } from '@/lib/queries/nba'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sport: string; competition: string; year: string; id: string }> }
) {
  const { sport, competition, year: yearStr, id } = await params
  const year = Number(yearStr)
  const playerId = Number(id)

  try {
    let data
    switch (sport) {
      case 'f1': data = await getF1PlayerStats(playerId, year); break
      case 'soccer': data = await getSoccerPlayerStats(playerId, competition, year); break
      case 'nfl': data = await getNflPlayerStats(playerId, competition, year); break
      case 'nba': data = await getNbaPlayerStats(playerId, competition, year); break
      default: return Response.json({ error: 'Unknown sport' }, { status: 400 })
    }
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
