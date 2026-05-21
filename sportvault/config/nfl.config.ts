import type { SportConfig, PositionGroupConfig } from '@/types/sport-config'

const qbGroup: PositionGroupConfig = {
  key: 'QB',
  label: 'Quarterbacks',
  aliases: ['QB'],
  columns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true, tooltip: 'Team: The team the player plays for' },
    { key: 'games', label: 'G', sortable: true, tooltip: 'Games: Total matches played' },
    { key: 'passing_yards', label: 'Pass Yds', sortable: true, tooltip: 'Passing Yards: Total yards gained from passing' },
    { key: 'passing_tds', label: 'Pass TDs', sortable: true, tooltip: 'Passing Touchdowns: Total touchdowns scored from passing' },
    { key: 'interceptions', label: 'INTs', sortable: true, tooltip: 'Interceptions: Total passes intercepted by the defense' },
    { key: 'passer_rating', label: 'Rating', sortable: true, tooltip: 'Passer Rating: A standardized measure of passing performance' },
  ],
  defaultSortKey: 'passing_yards',
}

const rbGroup: PositionGroupConfig = {
  key: 'RB',
  label: 'Running Backs',
  aliases: ['RB'],
  columns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true, tooltip: 'Team: The team the player plays for' },
    { key: 'games', label: 'G', sortable: true, tooltip: 'Games: Total matches played' },
    { key: 'rushing_yards', label: 'Rush Yds', sortable: true, tooltip: 'Rushing Yards: Total yards gained from rushing' },
    { key: 'rushing_tds', label: 'Rush TD', sortable: true, tooltip: 'Rushing Touchdowns: Total touchdowns scored from rushing' },
    { key: 'receptions', label: 'Rec', sortable: true, tooltip: 'Receptions: Total passes caught' },
    { key: 'receiving_yards', label: 'Rec Yds', sortable: true, tooltip: 'Receiving Yards: Total yards gained from receptions' },
  ],
  defaultSortKey: 'rushing_yards',
}

const wrteGroup: PositionGroupConfig = {
  key: 'WR',
  label: 'Receivers',
  aliases: ['WR', 'TE'],
  columns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true, tooltip: 'Team: The team the player plays for' },
    { key: 'games', label: 'G', sortable: true, tooltip: 'Games: Total matches played' },
    { key: 'targets', label: 'Tgts', sortable: true, tooltip: 'Targets: Total times targeted by a pass' },
    { key: 'receptions', label: 'Rec', sortable: true, tooltip: 'Receptions: Total passes caught' },
    { key: 'receiving_yards', label: 'Rec Yds', sortable: true, tooltip: 'Receiving Yards: Total yards gained from receptions' },
    { key: 'receiving_tds', label: 'Rec TD', sortable: true, tooltip: 'Receiving Touchdowns: Total touchdowns scored from receptions' },
  ],
  defaultSortKey: 'receiving_yards',
}

export const nflConfig: SportConfig = {
  accentColor: '#013369',
  slug: 'nfl',
  name: 'NFL',
  icon: 'NFL',
  competitions: [
    { slug: 'nfl-regular', name: 'Regular Season', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'nfl-playoffs', name: 'Playoffs', competitionType: 'tournament', seasonLabelFormat: 'year' },
  ],
  leaderboardColumns: qbGroup.columns,
  defaultSortKey: 'passing_yards',
  expandedChartConfig: {
    type: 'bar',
    primaryDataKey: 'stat',
    label: 'Weekly Stats',
  },
  rankingLabel: 'Player',
  hasTeams: true,
  hasPositionFilter: true,
  positionGroups: [qbGroup, rbGroup, wrteGroup],
}
