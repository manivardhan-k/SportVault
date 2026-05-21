import type { SportConfig } from '@/types/sport-config'

export const cricketConfig: SportConfig = {
  slug: 'cricket',
  name: 'Cricket',
  icon: 'CR',
  accentColor: '#0057B8',
  competitions: [
    { slug: 't20i', name: 'T20I', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'odi', name: 'ODI', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'test', name: 'Test', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'ipl', name: 'IPL', competitionType: 'league', seasonLabelFormat: 'year' },
  ],
  leaderboardColumns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true, tooltip: 'Team: The team the player plays for' },
    { key: 'matches', label: 'Mat', sortable: true, tooltip: 'Matches: Total matches played' },
    { key: 'innings', label: 'Inn', sortable: true, tooltip: 'Innings: Total innings batted or bowled' },
    { key: 'runs', label: 'Runs', sortable: true, tooltip: 'Runs: Total runs scored' },
    { key: 'average', label: 'Avg', sortable: true, tooltip: 'Batting Average: Average runs scored per out' },
    { key: 'strike_rate', label: 'SR', sortable: true, tooltip: 'Strike Rate: Runs scored per 100 balls faced' },
    { key: 'wickets', label: 'WK', sortable: true, tooltip: 'Wickets: Total wickets taken' },
    { key: 'economy', label: 'Eco', sortable: true, tooltip: 'Economy Rate: Average runs conceded per over' },
  ],
  defaultSortKey: 'runs',
  expandedChartConfig: {
    type: 'bar-tabs',
    primaryDataKey: 'runs',
    label: 'Match by Match',
  },
  rankingLabel: 'Player',
  hasTeams: true,
  hasPositionFilter: false,
}
