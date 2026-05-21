import Link from 'next/link'
import { CompareView } from '@/components/compare/CompareView'
import { enrichComparedPlayersWithLeaguePercentiles, inferNflComparePosition } from '@/lib/compare/league-percentiles'
import { getF1PlayerStats } from '@/lib/queries/f1'
import { getF1Standings } from '@/lib/queries/f1'
import { getNbaPlayerStats } from '@/lib/queries/nba'
import { getNbaStandings } from '@/lib/queries/nba'
import { getNflPlayerStats } from '@/lib/queries/nfl'
import { getNflStandings } from '@/lib/queries/nfl'
import { getSoccerPlayerStats } from '@/lib/queries/soccer'
import { getSoccerStandings } from '@/lib/queries/soccer'
import { getCricketPlayerStats } from '@/lib/queries/cricket'
import { getCricketLeaderboard } from '@/lib/queries/cricket'
import { getTennisPlayerStats } from '@/lib/queries/tennis'
import { getTennisLeaderboard } from '@/lib/queries/tennis'
import { getMmaPlayerStats } from '@/lib/queries/mma'
import { getMmaLeaderboard } from '@/lib/queries/mma'
import type { PlayerStatsResponse } from '@/types/api'
import { parseCompareUrl } from '@/lib/compare-url'

export const dynamic = 'force-dynamic'

interface ComparedPlayer {
  sport: string
  competition: string
  year: number
  stats: PlayerStatsResponse
}

async function fetchPlayer(
  playerId: string,
  sport: string,
  competition: string,
  year: number
): Promise<ComparedPlayer | null> {
  const id = Number(playerId)
  try {
    let stats: PlayerStatsResponse
    switch (sport) {
      case 'f1':     stats = await getF1PlayerStats(id, year); break
      case 'nba':    stats = await getNbaPlayerStats(id, competition, year); break
      case 'nfl':    stats = await getNflPlayerStats(id, competition, year); break
      case 'soccer': stats = await getSoccerPlayerStats(id, competition, year); break
      case 'cricket': stats = await getCricketPlayerStats(id, competition, year); break
      case 'tennis': stats = await getTennisPlayerStats(id, competition, year); break
      case 'mma': stats = await getMmaPlayerStats(id, competition, year); break
      default: return null
    }
    return { sport, competition, year, stats }
  } catch {
    return null
  }
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string }>
}) {
  const sp = await searchParams
  const parsed = parseCompareUrl(sp.items ?? null)

  if (parsed.length === 0) {
    return (
      <div className="px-8 py-16 text-center" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <p className="text-[14px]" style={{ color: '#9a9894' }}>
          No players selected. Pick rows from any leaderboard via the checkbox column.
        </p>
        <Link href="/" className="inline-block mt-4 text-[13px] underline" style={{ color: '#111110' }}>
          ← Home
        </Link>
      </div>
    )
  }

  const players = (await Promise.all(
    parsed.map(p => fetchPlayer(p.playerId, p.sport, p.competition, p.year))
  )).filter((x): x is ComparedPlayer => x !== null)

  if (players.length === 0) {
    return (
      <div className="px-8 py-16 text-center">
        <p className="text-[14px]" style={{ color: '#9a9894' }}>Failed to load any selected players.</p>
      </div>
    )
  }

  const sports = new Set(players.map(p => p.sport))
  if (sports.size > 1) {
    return (
      <div className="px-8 py-16 text-center">
        <p className="text-[14px]" style={{ color: '#9a9894' }}>
          Compare supports one sport at a time. Selection includes: {Array.from(sports).join(', ')}.
        </p>
      </div>
    )
  }

  const enrichedPlayers = await enrichComparedPlayersWithLeaguePercentiles(players, async player => {
    switch (player.sport) {
      case 'f1':
        return getF1Standings(player.year)
      case 'nba':
        return getNbaStandings(player.competition, player.year)
      case 'nfl':
        return getNflStandings(player.competition, player.year, inferNflComparePosition(player.stats.summaryStats))
      case 'soccer':
        return getSoccerStandings(player.competition, player.year)
      case 'cricket':
        return getCricketLeaderboard(player.competition, player.year)
      case 'tennis':
        return getTennisLeaderboard(player.competition, player.year)
      case 'mma':
        return getMmaLeaderboard(player.competition, player.year)
      default:
        throw new Error('Unknown sport')
    }
  })

  return <CompareView players={enrichedPlayers} />
}
