import { percentileRank } from '@/lib/percentiles'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'

export interface ComparedPlayerLike {
  sport: string
  competition: string
  year: number
  stats: PlayerStatsResponse
}

type LeagueFetcher<T extends ComparedPlayerLike> = (player: T) => Promise<LeaderboardResponse>

const SUMMARY_TO_ROW_KEY: Record<string, Record<string, string>> = {
  cricket: {
    Mat: 'matches',
    Inn: 'innings',
    Runs: 'runs',
    Avg: 'average',
    SR: 'strike_rate',
    '50s': 'fifties',
    '100s': 'hundreds',
    WK: 'wickets',
    Eco: 'economy',
    'Bowl Avg': 'bowl_avg',
  },
  f1: {
    Points: 'points',
    Wins: 'wins',
    Podiums: 'podiums',
    Poles: 'poles',
    DNFs: 'dnfs',
  },
  mma: {
    Fights: 'fights',
    Wins: 'wins',
    Losses: 'losses',
    'Win%': 'win_pct',
    SLpM: 'sig_strikes_per_min',
    'StrAcc%': 'sig_strike_acc',
    TDAvg: 'takedown_avg',
    'TDAcc%': 'takedown_acc',
    SubAvg: 'sub_avg',
  },
  nba: {
    Games: 'games',
    PPG: 'ppg',
    RPG: 'rpg',
    APG: 'apg',
    'FG%': 'fg_pct',
    '3P%': 'three_pt_pct',
  },
  nfl: {
    G: 'games',
    'Pass Yds': 'passing_yards',
    'Pass TDs': 'passing_tds',
    INTs: 'interceptions',
    'Comp %': 'completion_pct',
    Rating: 'passer_rating',
    'Rush Yds': 'rushing_yards',
    'Rush TD': 'rushing_tds',
    Rec: 'receptions',
    'Rec Yds': 'receiving_yards',
    'Rec TD': 'receiving_tds',
    Tgts: 'targets',
  },
  soccer: {
    Goals: 'goals',
    Assists: 'assists',
    'G+A': 'ga',
    Apps: 'appearances',
    Mins: 'minutes',
  },
  tennis: {
    Mat: 'matches',
    Wins: 'wins',
    'Win%': 'win_pct',
    Aces: 'aces',
    DF: 'double_faults',
    '1st In%': 'first_serve_pct',
    '1st Won%': 'first_srv_won_pct',
    'Ret Won%': 'return_won_pct',
    Rank: 'rank_year_end',
  },
}

function buildLeagueCacheKey(player: ComparedPlayerLike): string {
  const variant = player.sport === 'nfl'
    ? inferNflComparePosition(player.stats.summaryStats)
    : 'default'
  return `${player.sport}:${player.competition}:${player.year}:${variant}`
}

function buildDistributions(leaderboard: LeaderboardResponse): Record<string, number[]> {
  const distributions: Record<string, number[]> = {}

  for (const row of leaderboard.rows) {
    for (const [key, value] of Object.entries(row.stats)) {
      if (typeof value !== 'number') continue
      if (!distributions[key]) distributions[key] = []
      distributions[key].push(value)
    }
  }

  return distributions
}

function rowStatKeyForSummary(sport: string, summaryKey: string): string {
  return SUMMARY_TO_ROW_KEY[sport]?.[summaryKey] ?? summaryKey
}

function withLeaguePercentiles<T extends ComparedPlayerLike>(
  player: T,
  leaderboard: LeaderboardResponse
): T {
  const distributions = buildDistributions(leaderboard)
  const leaguePercentiles: Record<string, number> = {}

  for (const [summaryKey, rawValue] of Object.entries(player.stats.summaryStats)) {
    if (typeof rawValue !== 'number') continue
    const rowStatKey = rowStatKeyForSummary(player.sport, summaryKey)
    const distribution = distributions[rowStatKey] ?? []
    if (distribution.length === 0) continue
    leaguePercentiles[summaryKey] = percentileRank(rawValue, distribution, summaryKey)
  }

  return {
    ...player,
    stats: {
      ...player.stats,
      leaguePercentiles,
    },
  }
}

export function inferNflComparePosition(summaryStats: Record<string, number | string>): string {
  if ('Pass Yds' in summaryStats || 'Pass TDs' in summaryStats || 'Comp %' in summaryStats || 'Rating' in summaryStats) {
    return 'QB'
  }
  if ('Tgts' in summaryStats || 'Rec TD' in summaryStats) {
    return 'WR'
  }
  if ('Rush Yds' in summaryStats || 'Rush TD' in summaryStats) {
    return 'RB'
  }
  return 'QB'
}

export async function enrichComparedPlayersWithLeaguePercentiles<T extends ComparedPlayerLike>(
  players: T[],
  fetchLeague: LeagueFetcher<T>
): Promise<T[]> {
  const fetchTasks = new Map<string, Promise<LeaderboardResponse | null>>()

  for (const player of players) {
    const cacheKey = buildLeagueCacheKey(player)
    if (fetchTasks.has(cacheKey)) continue
    fetchTasks.set(cacheKey, fetchLeague(player).catch(() => null))
  }

  const leagues = new Map<string, LeaderboardResponse | null>()
  for (const [cacheKey, promise] of fetchTasks) {
    leagues.set(cacheKey, await promise)
  }

  return players.map(player => {
    const league = leagues.get(buildLeagueCacheKey(player))
    return league ? withLeaguePercentiles(player, league) : player
  })
}
