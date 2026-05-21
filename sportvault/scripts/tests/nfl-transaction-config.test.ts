import assert from 'node:assert/strict'

import {
  NFL_SEASONAL_BATCH_SIZE,
  NFL_WEEKLY_BATCH_SIZE,
} from '../ingest/utils/nfl-transaction-config'

assert.equal(NFL_SEASONAL_BATCH_SIZE, 100)
assert.ok(
  NFL_WEEKLY_BATCH_SIZE < NFL_SEASONAL_BATCH_SIZE,
  'weekly batches should be smaller than seasonal batches to avoid Prisma timeout pressure'
)

console.log('nfl transaction config looks safe')
