import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'

const WEIGHT_CLASS_BY_SLUG: Record<string, string> = {
  'ufc-flyweight': 'Flyweight',
  'ufc-bantamweight': 'Bantamweight',
  'ufc-featherweight': 'Featherweight',
  'ufc-lightweight': 'Lightweight',
  'ufc-welterweight': 'Welterweight',
  'ufc-middleweight': 'Middleweight',
  'ufc-light-heavyweight': 'Light Heavyweight',
  'ufc-heavyweight': 'Heavyweight',
  'ufc-womens-strawweight': "Women's Strawweight",
  'ufc-womens-flyweight': "Women's Flyweight",
  'ufc-womens-bantamweight': "Women's Bantamweight",
  'ufc-womens-featherweight': "Women's Featherweight",
  'ufc-catch-weight': 'Catch Weight',
}

function parseWeightClass(competition: string) {
  return WEIGHT_CLASS_BY_SLUG[competition] ?? competition.replace(/^ufc-/, '').replace(/-/g, ' ')
}

function titleCase(value: string) {
  return value.split(' ').map(part => part ? part[0].toUpperCase() + part.slice(1) : part).join(' ')
}

function pseudoTeam(weightClass: string) {
  const label = titleCase(weightClass)
  return {
    name: label,
    shortName: label,
    colorPrimary: '#d4d2cd',
    colorSecondary: '#d4d2cd',
  }
}

function buildSummaryStats(stat: {
  fights: number
  wins: number
  losses: number
  sigStrikesPerMin: number | null
  sigStrikeAcc: number | null
  takedownAvg: number | null
  takedownAcc: number | null
  subAvg: number | null
}) {
  return {
    Fights: stat.fights,
    Wins: stat.wins,
    Losses: stat.losses,
    'Win%': stat.fights > 0 ? Math.round((stat.wins / stat.fights) * 1000) / 10 : 0,
    SLpM: stat.sigStrikesPerMin ?? 0,
    'StrAcc%': stat.sigStrikeAcc ?? 0,
    TDAvg: stat.takedownAvg ?? 0,
    'TDAcc%': stat.takedownAcc ?? 0,
    SubAvg: stat.subAvg ?? 0,
  }
}

export async function getMmaLeaderboard(competition: string, year: number): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({ where: { competition: { slug: competition }, year } })
  if (!season) throw new Error(`No MMA season for ${competition} ${year}`)

  const weightClass = parseWeightClass(competition)
  const stats = await prisma.mmaFighterStat.findMany({
    where: { seasonId: season.id, weightClass },
    include: { player: true },
    orderBy: [{ wins: 'desc' }, { fights: 'desc' }],
  })

  const rows = stats.map((s, i) => ({
    playerId: String(s.playerId),
    name: `${s.player.firstName ?? ''} ${s.player.lastName}`.trim(),
    team: pseudoTeam(s.weightClass),
    stats: {
      position: i + 1,
      fights: s.fights,
      wins: s.wins,
      losses: s.losses,
      win_pct: s.fights > 0 ? Math.round((s.wins / s.fights) * 1000) / 10 : 0,
      sig_strikes_per_min: s.sigStrikesPerMin ?? 0,
      sig_strike_acc: s.sigStrikeAcc ?? 0,
      takedown_avg: s.takedownAvg ?? 0,
      takedown_acc: s.takedownAcc ?? 0,
      sub_avg: s.subAvg ?? 0,
    },
  }))

  return {
    sport: 'mma',
    competition,
    year,
    columns: [
      { key: 'position', label: '#', sortable: false },
      { key: 'player', label: 'Fighter', sortable: false },
      { key: 'fights', label: 'Fights', sortable: true },
      { key: 'wins', label: 'Wins', sortable: true },
      { key: 'losses', label: 'Losses', sortable: true },
      { key: 'win_pct', label: 'Win%', sortable: true },
      { key: 'sig_strikes_per_min', label: 'SLpM', sortable: true },
      { key: 'sig_strike_acc', label: 'StrAcc%', sortable: true },
      { key: 'takedown_avg', label: 'TDAvg', sortable: true },
      { key: 'sub_avg', label: 'SubAvg', sortable: true },
    ],
    rows,
  }
}

export async function getMmaLeagueMaxStats(competition: string, year: number): Promise<Record<string, number>> {
  const leaderboard = await getMmaLeaderboard(competition, year)
  const maxes: Record<string, number> = {}
  for (const row of leaderboard.rows) {
    for (const [k, v] of Object.entries(row.stats)) {
      if (typeof v === 'number') maxes[k] = Math.max(maxes[k] ?? 0, v)
    }
  }
  return maxes
}

export async function getMmaPlayerStats(playerId: number, competition: string, year: number): Promise<PlayerStatsResponse> {
  const season = await prisma.season.findFirst({ where: { competition: { slug: competition }, year } })
  if (!season) throw new Error('Season not found')

  const weightClass = parseWeightClass(competition)
  const stat = await prisma.mmaFighterStat.findFirst({
    where: { playerId, seasonId: season.id, weightClass },
    include: { player: true },
  })

  if (!stat) throw new Error('Fighter not found')

  return {
    playerId: String(playerId),
    name: `${stat.player.firstName ?? ''} ${stat.player.lastName}`.trim(),
    team: pseudoTeam(stat.weightClass),
    season: year,
    chartData: [],
    summaryStats: buildSummaryStats(stat),
  }
}
