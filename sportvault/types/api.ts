import type { ColumnDef } from './sport-config'

export interface TeamRef {
  name: string
  shortName: string
  colorPrimary: string
  colorSecondary: string
}

export interface LeaderboardRow {
  playerId: string
  name: string
  team: TeamRef
  stats: Record<string, number | string>
}

export interface LeaderboardResponse {
  sport: string
  competition: string
  year: number
  columns: ColumnDef[]
  rows: LeaderboardRow[]
  /** Maps team name → standings position (1 = best). Used for team-based sorting. */
  teamRankings?: Record<string, number>
}

export interface ChartDataPoint {
  label: string | number
  [key: string]: number | string
}

export interface ChartTab {
  key: string
  label: string
  summaryStats: Record<string, number | string>
  chartData?: ChartDataPoint[]
  title?: string
}

export interface ScatterDataPoint {
  name: string
  x: number
  y: number
  color: string
  isSelected: boolean
}

export interface PlayerStatsResponse {
  playerId: string
  name: string
  team: TeamRef
  season: number
  chartData: ChartDataPoint[]
  summaryStats: Record<string, number | string>
  leaguePercentiles?: Record<string, number>
  secondaryChartData?: ChartDataPoint[]
  chartTabs?: ChartTab[]
  scatterData?: ScatterDataPoint[]
  scatterAxes?: { x: string; y: string }
}

export interface SeasonMeta {
  year: number
  label: string
  status: 'completed' | 'in_progress' | 'upcoming'
}

export interface BracketMatchTeam {
  id: number
  shortName: string
  name: string
  colorPrimary: string
  colorSecondary: string
  wins: number
  isWinner: boolean
}

export interface BracketMatch {
  id: string
  round: number
  conference: string
  seriesOrder: number
  winnerTeamId: number | null
  team1: BracketMatchTeam
  team2: BracketMatchTeam
  isComplete: boolean
}

export interface BracketSide {
  label: string
  round1Label: string
  semisLabel: string
  finalLabel: string
  round1: BracketMatch[]
  semis: BracketMatch[]
  final: BracketMatch | null
}

export interface BracketResponse {
  sport: string
  year: number
  left: BracketSide
  right: BracketSide
  finalsLabel: string
  finals: BracketMatch | null
}
