import type { SportConfig } from '@/types/sport-config'

export const f1Config: SportConfig = {
  slug: 'f1',
  name: 'Formula 1',
  icon: '🏎️',
  competitions: [
    {
      slug: 'f1-championship',
      name: 'Championship',
      competitionType: 'championship',
      seasonLabelFormat: 'year',
    },
  ],
  leaderboardColumns: [
    { key: 'position', label: '#', sortable: false },
    { key: 'driver', label: 'Driver', sortable: false },
    { key: 'team', label: 'Constructor', sortable: true },
    { key: 'points', label: 'Pts', sortable: true },
    { key: 'wins', label: 'Wins', sortable: true },
    { key: 'podiums', label: 'Podiums', sortable: true },
    { key: 'poles', label: 'Poles', sortable: true },
  ],
  defaultSortKey: 'points',
  expandedChartConfig: {
    type: 'line',
    primaryDataKey: 'points',
    label: 'Cumulative Points',
    dualMode: true,
  },
  rankingLabel: 'Driver',
  hasTeams: true,
  hasPositionFilter: false,
}
