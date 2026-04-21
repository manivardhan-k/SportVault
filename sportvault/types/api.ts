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
}

export interface ChartDataPoint {
  label: string | number
  [key: string]: number | string
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
  scatterData?: ScatterDataPoint[]
  scatterAxes?: { x: string; y: string }
}

export interface SeasonMeta {
  year: number
  label: string
  status: 'completed' | 'in_progress' | 'upcoming'
}
