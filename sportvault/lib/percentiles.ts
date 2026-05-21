const LOWER_IS_BETTER = new Set([
  'bowlavg',
  'df',
  'dnfs',
  'doublefaults',
  'eco',
  'economy',
  'ints',
  'interceptions',
  'losses',
  'rank',
  'rankyearend',
])

export function normalizeStatKey(statKey: string): string {
  return statKey.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function isHigherBetter(statKey: string): boolean {
  return !LOWER_IS_BETTER.has(normalizeStatKey(statKey))
}

export function percentileRank(value: number, distribution: number[], statKey?: string): number {
  if (distribution.length === 0) return 0

  const higherBetter = statKey ? isHigherBetter(statKey) : true
  let better = 0
  let equal = 0

  for (const candidate of distribution) {
    if (higherBetter ? candidate < value : candidate > value) better += 1
    else if (candidate === value) equal += 1
  }

  return Math.round(((better + equal * 0.5) / distribution.length) * 100)
}

export function isBestValue(value: number, peers: number[], statKey: string): boolean {
  if (peers.length === 0) return false
  const target = isHigherBetter(statKey)
    ? Math.max(...peers)
    : Math.min(...peers)
  return value === target
}
