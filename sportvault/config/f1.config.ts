import type { SportConfig } from '@/types/sport-config'

export const f1Config: SportConfig = {
  slug: 'f1',
  name: 'Formula 1',
  icon: 'F1',
  accentColor: '#E10600',
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
    { key: 'team', label: 'Constructor', sortable: true, tooltip: 'Constructor: The team the driver races for' },
    { key: 'points', label: 'Pts', sortable: true, tooltip: 'Points: Total championship points earned' },
    { key: 'wins', label: 'Wins', sortable: true, tooltip: 'Wins: Total race victories' },
    { key: 'podiums', label: 'Podiums', sortable: true, tooltip: 'Podiums: Total top-3 finishes' },
    { key: 'poles', label: 'Poles', sortable: true, tooltip: 'Poles: Total pole positions in qualifying' },
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
