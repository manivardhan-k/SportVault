const SAFE_SLUG = /^[a-z0-9-]{1,60}$/
const SAFE_MATCH_ID = /^[A-Za-z0-9-]{1,100}$/
const MIN_YEAR = 1900
const MAX_YEAR = 2100
const KNOWN_SPORTS = new Set(['f1', 'soccer', 'nfl', 'nba', 'cricket', 'tennis', 'mma'])

export function isSafeSlug(value: string): boolean {
  return SAFE_SLUG.test(value)
}

export function isKnownSport(value: string): boolean {
  return KNOWN_SPORTS.has(value)
}

export function isSafeMatchId(value: string): boolean {
  return SAFE_MATCH_ID.test(value)
}

export function parseRouteYear(value: string): number | null {
  if (!/^\d{4}$/.test(value)) return null
  const year = Number(value)
  return year >= MIN_YEAR && year <= MAX_YEAR ? year : null
}

export function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,10}$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function parseBracketTeamId(value: string | null): number | null {
  if (value === '-1') return -1
  return parsePositiveInt(value)
}

export function normalizePositionParam(value: string | null): string | undefined {
  if (!value) return undefined
  const normalized = value.toUpperCase()
  return /^[A-Z]{1,4}$/.test(normalized) ? normalized : undefined
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

export function logApiError(scope: string, error: unknown): void {
  console.error(`[api:${scope}]`, error)
}
