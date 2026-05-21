import type { SportConfig } from '@/types/sport-config'

export const tennisConfig: SportConfig = {
  slug: 'tennis',
  name: 'Tennis',
  icon: 'TN',
  accentColor: '#2E8B57',
  competitions: [
    { slug: 'atp-overall', name: 'ATP Overall', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'atp-hard', name: 'ATP Hard', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'atp-clay', name: 'ATP Clay', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'atp-grass', name: 'ATP Grass', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'wta-overall', name: 'WTA Overall', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'wta-hard', name: 'WTA Hard', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'wta-clay', name: 'WTA Clay', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'wta-grass', name: 'WTA Grass', competitionType: 'league', seasonLabelFormat: 'year' },
  ],
  leaderboardColumns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'matches', label: 'Mat', sortable: true, tooltip: 'Matches: Total matches played' },
    { key: 'wins', label: 'Wins', sortable: true, tooltip: 'Wins: Total matches won' },
    { key: 'win_pct', label: 'Win%', sortable: true, tooltip: 'Win Percentage: Percentage of matches won' },
    { key: 'aces', label: 'Aces', sortable: true, tooltip: 'Aces: Total unreturnable serves' },
    { key: 'double_faults', label: 'DF', sortable: true, tooltip: 'Double Faults: Total failed serves resulting in lost points' },
    { key: 'first_serve_pct', label: '1st In%', sortable: true, tooltip: '1st Serve In Percentage: Percentage of successful first serves' },
    { key: 'return_won_pct', label: 'Ret Won%', sortable: true, tooltip: 'Return Points Won Percentage: Percentage of return points won' },
    { key: 'rank_year_end', label: 'Rank', sortable: true, tooltip: 'Year-End Rank: Official ranking at the end of the year' },
  ],
  defaultSortKey: 'wins',
  expandedChartConfig: {
    type: 'radar',
    primaryDataKey: 'wins',
    label: 'Stat Profile',
  },
  rankingLabel: 'Player',
  hasTeams: false,
  hasPositionFilter: false,
}
