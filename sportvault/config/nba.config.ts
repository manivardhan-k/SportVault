import type { SportConfig } from '@/types/sport-config'

export const nbaConfig: SportConfig = {
  slug: 'nba',
  name: 'NBA',
  icon: '🏀',
  competitions: [
    { slug: 'nba-regular', name: 'Regular Season', competitionType: 'league', seasonLabelFormat: 'year-range' },
    { slug: 'nba-playoffs', name: 'Playoffs', competitionType: 'tournament', seasonLabelFormat: 'year-range' },
  ],
  leaderboardColumns: [
    { key: 'rank', label: 'Rank', sortable: false },
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'ppg', label: 'PPG', sortable: true },
    { key: 'rpg', label: 'RPG', sortable: true },
    { key: 'apg', label: 'APG', sortable: true },
    { key: 'fg_pct', label: 'FG%', sortable: true },
    { key: 'three_pt_pct', label: '3P%', sortable: true },
  ],
  defaultSortKey: 'ppg',
  expandedChartConfig: {
    type: 'line+radar',
    primaryDataKey: 'ppg',
    label: 'Season Stats',
  },
  rankingLabel: 'Player',
  hasTeams: true,
  hasPositionFilter: false,
}
