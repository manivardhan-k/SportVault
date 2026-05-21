import type { SportConfig } from '@/types/sport-config'

export const nbaConfig: SportConfig = {
  slug: 'nba',
  name: 'NBA',
  icon: 'NBA',
  accentColor: '#C9082A',
  competitions: [
    { slug: 'nba-regular', name: 'Regular Season', competitionType: 'league', seasonLabelFormat: 'year-range' },
    { slug: 'nba-playoffs', name: 'Playoffs', competitionType: 'tournament', seasonLabelFormat: 'year-range' },
  ],
  leaderboardColumns: [
    { key: 'rank', label: 'Rank', sortable: false },
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true, tooltip: 'Team: The team the player plays for' },
    { key: 'games', label: 'G', sortable: true, tooltip: 'Games Played: Total matches played' },
    { key: 'ppg', label: 'PPG', sortable: true, tooltip: 'Points Per Game: Average points scored per game' },
    { key: 'rpg', label: 'RPG', sortable: true, tooltip: 'Rebounds Per Game: Average rebounds per game' },
    { key: 'apg', label: 'APG', sortable: true, tooltip: 'Assists Per Game: Average assists per game' },
    { key: 'fg_pct', label: 'FG%', sortable: true, tooltip: 'Field Goal Percentage: Percentage of shots made' },
    { key: 'three_pt_pct', label: '3P%', sortable: true, tooltip: '3-Point Percentage: Percentage of 3-point shots made' },
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
