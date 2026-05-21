export interface BasketItem {
  playerId: string
  sport: string
  competition: string
  year: number
  name: string
  teamShortName: string
  teamColor: string
}

const MAX_COMPARE_ITEMS = 5
const SAFE_ID = /^\d{1,10}$/
const SAFE_SLUG = /^[a-z0-9-]{1,60}$/
const MIN_YEAR = 1900
const MAX_YEAR = 2100

export function basketKey(item: Pick<BasketItem, 'playerId' | 'sport' | 'competition' | 'year'>): string {
  return `${item.playerId}|${item.sport}|${item.competition}|${item.year}`
}

export function serializeBasketToUrl(items: BasketItem[]): string {
  return items.map(i => `${i.playerId}:${i.sport}:${i.competition}:${i.year}`).join(',')
}

export function parseCompareUrl(items: string | null): { playerId: string; sport: string; competition: string; year: number }[] {
  if (!items) return []
  return items.split(',').slice(0, MAX_COMPARE_ITEMS).map(s => {
    const [playerId, sport, competition, yearStr] = s.split(':')
    return { playerId, sport, competition, year: Number(yearStr) }
  }).filter(x => (
    SAFE_ID.test(x.playerId) &&
    KNOWN_SPORTS.has(x.sport) &&
    SAFE_SLUG.test(x.competition) &&
    Number.isInteger(x.year) &&
    x.year >= MIN_YEAR &&
    x.year <= MAX_YEAR
  ))
}

const KNOWN_SPORTS = new Set(['f1', 'soccer', 'nfl', 'nba', 'cricket', 'tennis', 'mma'])

export function deriveSportFromPath(pathname: string | null, itemsParam: string | null): string | null {
  if (!pathname) return null
  if (pathname.startsWith('/compare')) {
    const items = parseCompareUrl(itemsParam)
    return items[0]?.sport ?? null
  }
  const seg = pathname.split('/')[1] ?? ''
  return KNOWN_SPORTS.has(seg) ? seg : null
}
