// Cache interface — auto-detects Upstash Redis from env, falls back to in-memory Map.
// Env: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to enable Redis.
import { Redis } from '@upstash/redis'

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

class UpstashCache implements CacheStore {
  private client: Redis
  constructor(url: string, token: string) {
    this.client = new Redis({ url, token })
  }
  async get(key: string): Promise<string | null> {
    const v = await this.client.get<string>(key)
    return v ?? null
  }
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, { ex: ttlSeconds })
  }
  async del(key: string): Promise<void> {
    await this.client.del(key)
  }
}

function makeCache(): CacheStore {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) return new UpstashCache(url, token)
  return new MemoryCache()
}

export const cache: CacheStore = makeCache()

export const TTL = {
  HISTORICAL: 60 * 60 * 24,
  ACTIVE: 60 * 60,
} as const

export function standingsKey(sport: string, competition: string, year: number, variant?: string): string {
  return variant
    ? `standings:${sport}:${competition}:${year}:${variant}`
    : `standings:${sport}:${competition}:${year}`
}

export function bracketKey(sport: string, competition: string, year: number): string {
  return `bracket:${sport}:${competition}:${year}`
}

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await cache.get(key)
  if (cached) {
    try {
      return JSON.parse(cached) as T
    } catch {
      await cache.del(key)
    }
  }
  const data = await fetcher()
  await cache.set(key, JSON.stringify(data), ttl)
  return data
}
