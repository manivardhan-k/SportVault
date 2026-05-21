import type { SportConfig } from '@/types/sport-config'

export const soccerConfig: SportConfig = {
  slug: 'soccer',
  name: 'Soccer',
  icon: 'SOC',
  accentColor: '#00B04F',
  competitions: [
    { slug: 'premier-league', name: 'Premier League', competitionType: 'league', group: 'League', seasonLabelFormat: 'year-range' },
    { slug: 'champions-league', name: 'Champions League', competitionType: 'cup', group: 'Cup', seasonLabelFormat: 'year-range' },
    { slug: 'world-cup', name: 'World Cup', competitionType: 'tournament', group: 'Cup', seasonLabelFormat: 'year' },
  ],
  leaderboardColumns: [
    { key: 'position', label: '#', sortable: false },
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Club', sortable: true, tooltip: 'Club: The team the player plays for' },
    { key: 'appearances', label: 'Apps', sortable: true, tooltip: 'Appearances: Total matches played' },
    { key: 'goals', label: 'Goals', sortable: true, tooltip: 'Goals: Total goals scored' },
    { key: 'assists', label: 'Assists', sortable: true, tooltip: 'Assists: Total goal assists' },
    { key: 'ga', label: 'G+A', sortable: true, tooltip: 'Goals + Assists: Total goal contributions' },
    { key: 'minutes', label: 'Mins', sortable: true, tooltip: 'Minutes: Total minutes played' },
  ],
  defaultSortKey: 'goals',
  expandedChartConfig: {
    type: 'radar',
    primaryDataKey: 'goals',
    label: 'Stat Profile',
  },
  rankingLabel: 'Player',
  hasTeams: true,
  hasPositionFilter: false,
}
