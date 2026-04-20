// Cache interface — swap CacheStore impl to Upstash Redis without changing callers.
// Current impl: in-memory Map (works with no Redis configured).

export interface CacheStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
}

class MemoryCache implements CacheStore {
  private store = new Map<string, { value: string; expiresAt: number }>()

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }
}

// To wire Redis: replace with `new RedisCache()` using @upstash/redis
export const cache: CacheStore = new MemoryCache()

export const TTL = {
  HISTORICAL: 60 * 60 * 24,
  ACTIVE: 60 * 60,
} as const

export function standingsKey(sport: string, competition: string, year: number): string {
  return `standings:${sport}:${competition}:${year}`
}

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await cache.get(key)
  if (cached) return JSON.parse(cached) as T
  const data = await fetcher()
  await cache.set(key, JSON.stringify(data), ttl)
  return data
}
