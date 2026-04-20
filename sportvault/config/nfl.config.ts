import type { SportConfig, PositionGroupConfig } from '@/types/sport-config'

const qbGroup: PositionGroupConfig = {
  key: 'QB',
  label: 'Quarterbacks',
  columns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'passing_yards', label: 'Pass Yds', sortable: true },
    { key: 'passing_tds', label: 'TDs', sortable: true },
    { key: 'interceptions', label: 'INTs', sortable: true },
    { key: 'passer_rating', label: 'Rating', sortable: true },
  ],
  defaultSortKey: 'passing_yards',
}

const rbGroup: PositionGroupConfig = {
  key: 'RB',
  label: 'Running Backs',
  columns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'rushing_yards', label: 'Rush Yds', sortable: true },
    { key: 'rushing_tds', label: 'Rush TDs', sortable: true },
    { key: 'receptions', label: 'Rec', sortable: true },
    { key: 'receiving_yards', label: 'Rec Yds', sortable: true },
  ],
  defaultSortKey: 'rushing_yards',
}

const wrteGroup: PositionGroupConfig = {
  key: 'WR',
  label: 'Receivers',
  columns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'targets', label: 'Tgts', sortable: true },
    { key: 'receptions', label: 'Rec', sortable: true },
    { key: 'receiving_yards', label: 'Rec Yds', sortable: true },
    { key: 'receiving_tds', label: 'TDs', sortable: true },
  ],
  defaultSortKey: 'receiving_yards',
}

export const nflConfig: SportConfig = {
  slug: 'nfl',
  name: 'NFL',
  icon: '🏈',
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
