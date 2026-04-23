import type { SportConfig } from '@/types/sport-config'

export const soccerConfig: SportConfig = {
  slug: 'soccer',
  name: 'Soccer',
  icon: '⚽',
  accentColor: '#00B04F',
  competitions: [
    { slug: 'premier-league', name: 'Premier League', competitionType: 'league', group: 'League', seasonLabelFormat: 'year-range' },
    { slug: 'champions-league', name: 'Champions League', competitionType: 'cup', group: 'Cup', seasonLabelFormat: 'year-range' },
    { slug: 'world-cup', name: 'World Cup', competitionType: 'tournament', group: 'Cup', seasonLabelFormat: 'year' },
  ],
  leaderboardColumns: [
    { key: 'position', label: '#', sortable: false },
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Club', sortable: true },
    { key: 'appearances', label: 'Apps', sortable: true },
    { key: 'goals', label: 'Goals', sortable: true },
    { key: 'assists', label: 'Assists', sortable: true },
    { key: 'ga', label: 'G+A', sortable: true },
    { key: 'minutes', label: 'Mins', sortable: true },
  ],
  defaultSortKey: 'goals',
  expandedChartConfig: {
    type: 'line',
    primaryDataKey: 'goals',
    label: 'Goals Timeline',
  },
  rankingLabel: 'Player',
  hasTeams: true,
  hasPositionFilter: false,
}
