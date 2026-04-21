export interface ColumnDef {
  key: string
  label: string
  sortable: boolean
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'radar' | 'line+radar' | 'scatter'
  primaryDataKey: string
  label: string
  dualMode?: boolean
}

export interface CompetitionConfig {
  slug: string
  name: string
  competitionType: 'league' | 'cup' | 'championship' | 'tournament'
  group?: string
  seasonLabelFormat: 'year' | 'year-range'
}

export interface PositionGroupConfig {
  key: string
  label: string
  columns: ColumnDef[]
  defaultSortKey: string
}

export interface SportConfig {
  slug: string
  name: string
  icon: string
  competitions: CompetitionConfig[]
  leaderboardColumns: ColumnDef[]
  defaultSortKey: string
  expandedChartConfig: ChartConfig
  rankingLabel: string
  hasTeams: boolean
  hasPositionFilter: boolean
  positionGroups?: PositionGroupConfig[]
}
