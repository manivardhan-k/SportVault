import assert from 'node:assert/strict'

import { filterRowsByPlayerName } from '../../lib/leaderboard-search'
import { isBestValue, percentileRank } from '../../lib/percentiles'

const filtered = filterRowsByPlayerName(
  [
    {
      playerId: '1',
      name: 'Patrick Mahomes',
      team: { name: 'Chiefs', shortName: 'KC', colorPrimary: '#e31837', colorSecondary: '#ffb81c' },
      stats: {},
    },
    {
      playerId: '2',
      name: 'Joe Burrow',
      team: { name: 'Bengals', shortName: 'CIN', colorPrimary: '#fb4f14', colorSecondary: '#000000' },
      stats: {},
    },
  ],
  'maho'
)

assert.equal(filtered.length, 1)
assert.equal(filtered[0]?.name, 'Patrick Mahomes')

assert.equal(percentileRank(40, [10, 20, 40, 80], 'Wins'), 63)
assert.equal(percentileRank(2, [1, 2, 4, 8], 'Rank'), 63)
assert.equal(isBestValue(2, [1, 2, 4, 8], 'Rank'), false)
assert.equal(isBestValue(1, [1, 2, 4, 8], 'Rank'), true)
assert.equal(isBestValue(8, [1, 2, 4, 8], 'Wins'), true)

console.log('leaderboard search + percentile helpers look safe')
