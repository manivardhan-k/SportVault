'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { type BasketItem, basketKey } from './compare-url'

export type { BasketItem }
export { basketKey, serializeBasketToUrl, parseCompareUrl } from './compare-url'

export const COMPARE_MAX = 5
const STORAGE_KEY = 'sv-compare-basket-v2'
const LAST_LEADERBOARD_KEY = 'sv-last-leaderboard'

type Store = Record<string, BasketItem[]>
const EMPTY_STORE: Store = {}
const EMPTY_ITEMS: BasketItem[] = []

let cached: Store | null = null

function readAll(): Store {
  if (typeof window === 'undefined') return EMPTY_STORE
  if (cached) return cached
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    cached = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Store : EMPTY_STORE
  } catch {
    cached = EMPTY_STORE
  }
  return cached
}

function writeAll(store: Store) {
  cached = store
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent('sv-basket-change'))
}

function subscribe(callback: () => void): () => void {
  const handler = () => {
    cached = null
    callback()
  }
  window.addEventListener('sv-basket-change', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('sv-basket-change', handler)
    window.removeEventListener('storage', handler)
  }
}

export function useCompareBasket(sport: string | null) {
  const store = useSyncExternalStore(subscribe, readAll, () => EMPTY_STORE)
  const items = useMemo(
    () => (sport ? store[sport] ?? EMPTY_ITEMS : EMPTY_ITEMS),
    [store, sport]
  )

  const add = useCallback((item: BasketItem): { ok: boolean; reason?: string } => {
    if (!sport) return { ok: false, reason: 'No sport context' }
    if (item.sport !== sport) return { ok: false, reason: 'Sport mismatch' }
    const all = readAll()
    const current = all[sport] ?? []
    if (current.some(x => basketKey(x) === basketKey(item))) return { ok: false, reason: 'Already in compare' }
    if (current.length >= COMPARE_MAX) return { ok: false, reason: 'Max 5 players' }
    writeAll({ ...all, [sport]: [...current, item] })
    return { ok: true }
  }, [sport])

  const remove = useCallback((key: string) => {
    if (!sport) return
    const all = readAll()
    const current = all[sport] ?? []
    writeAll({ ...all, [sport]: current.filter(x => basketKey(x) !== key) })
  }, [sport])

  const clear = useCallback(() => {
    if (!sport) return
    const all = readAll()
    if (!all[sport] || all[sport].length === 0) return
    const next: Store = { ...all }
    delete next[sport]
    writeAll(next)
  }, [sport])

  const has = useCallback((key: string) => items.some(x => basketKey(x) === key), [items])

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    if (!sport) return
    if (fromIndex === toIndex) return
    const all = readAll()
    const current = all[sport] ?? []
    if (fromIndex < 0 || fromIndex >= current.length) return
    if (toIndex < 0 || toIndex >= current.length) return
    const next = current.slice()
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    writeAll({ ...all, [sport]: next })
  }, [sport])

  return { items, add, remove, clear, has, reorder }
}

// Last-visited-leaderboard tracking — used by Clear button on /compare page to navigate back.
export function rememberLastLeaderboard(pathname: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(LAST_LEADERBOARD_KEY, pathname)
}
export function readLastLeaderboard(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(LAST_LEADERBOARD_KEY)
}
