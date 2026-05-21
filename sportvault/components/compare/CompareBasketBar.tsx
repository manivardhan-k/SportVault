'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useCompareBasket,
  serializeBasketToUrl,
  basketKey,
  rememberLastLeaderboard,
  readLastLeaderboard,
} from '@/lib/compare-basket'
import { deriveSportFromPath } from '@/lib/compare-url'
import { getSportConfig } from '@/config/sports'

export function CompareBasketBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const sport = deriveSportFromPath(pathname, searchParams.get('items'))

  const sportConfig = getSportConfig(sport ?? '')
  const teamBased = sportConfig?.hasTeams !== false

  const onComparePage = pathname?.startsWith('/compare') ?? false

  // When user scrolls near bottom of page, dock the horizontal bar to the TOP so it doesn't
  // block content at the bottom (e.g., player rows).
  const [stickToTop, setStickToTop] = useState(false)
  useEffect(() => {
    if (onComparePage) return

    const onScroll = () => {
      const docH = document.documentElement.scrollHeight
      const winH = window.innerHeight
      const scrollY = window.scrollY
      // Within 96px of page bottom → dock to top.
      setStickToTop(docH - (scrollY + winH) < 96 && docH > winH + 200)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [onComparePage])

  const { items, remove, clear, reorder } = useCompareBasket(sport)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  // Track last leaderboard so Clear from /compare can return there.
  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/compare')) return
    if (pathname.startsWith('/login') || pathname.startsWith('/logout')) return
    if (sport) rememberLastLeaderboard(pathname)
  }, [pathname, sport])

  // Redirect if basket becomes empty while on compare page
  const prevItemsLength = useRef(items.length)
  useEffect(() => {
    if (onComparePage && prevItemsLength.current > 0 && items.length === 0) {
      const dest = readLastLeaderboard() ?? (sport ? `/${sport}` : '/')
      router.push(dest)
    }
    prevItemsLength.current = items.length
  }, [onComparePage, items.length, router, sport])

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDraggedIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overIdx !== idx) setOverIdx(idx)
  }
  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedIdx !== null && draggedIdx !== idx) reorder(draggedIdx, idx)
    setDraggedIdx(null)
    setOverIdx(null)
  }
  const handleDragEnd = () => {
    setDraggedIdx(null)
    setOverIdx(null)
  }

  const handleClear = () => {
    clear()
    if (pathname?.startsWith('/compare')) {
      const dest = readLastLeaderboard() ?? (sport ? `/${sport}` : '/')
      router.push(dest)
    }
  }

  if (onComparePage) return null

  // Position styles per mode. Outer fixed; use margin auto for centering to avoid layout transform conflicts.
  // stickToTop: docks below hero strip (128px + 52px hero height = 180px) + 8px gap
  const containerStyle: React.CSSProperties = stickToTop
    ? { left: 0, right: 0, top: teamBased ? 188 : 148, bottom: 'auto', margin: '0 auto', width: 'fit-content', maxWidth: 'min(92vw, 720px)' }
    : { left: 0, right: 0, bottom: 16, top: 'auto', margin: '0 auto', width: 'fit-content', maxWidth: 'min(92vw, 720px)' }

  const targetTransform = { x: 0, y: 0, opacity: 1 }

  // Spring on x/y for organic feel.
  const initialTransform = { x: 0, y: 120, opacity: 0 }
  const exitTransform = { x: 0, y: 120, opacity: 0 }

  return (
    <AnimatePresence>
      {items.length > 0 && sport && (
        <motion.div
          layout
          initial={initialTransform}
          animate={targetTransform}
          exit={exitTransform}
          transition={{ type: 'spring', stiffness: 130, damping: 22, mass: 1 }}
          className="fixed z-50 px-3 py-3 rounded-2xl shadow-lg"
          style={{
            background: '#111110',
            color: '#faf9f7',
            fontFamily: 'var(--font-dm-sans), sans-serif',
            ...containerStyle,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key="horizontal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-row items-center gap-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] uppercase tracking-[0.12em]"
                  style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
                >
                  Compare
                </span>
              </div>

              <div className="flex flex-row items-center gap-2 flex-wrap">
                {items.map((it, idx) => {
                  const isDragging = draggedIdx === idx
                  const isOver = overIdx === idx && draggedIdx !== null && draggedIdx !== idx
                  return (
                    <div
                      key={basketKey(it)}
                      draggable
                      onDragStart={handleDragStart(idx)}
                      onDragOver={handleDragOver(idx)}
                      onDrop={handleDrop(idx)}
                      onDragEnd={handleDragEnd}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] cursor-grab active:cursor-grabbing"
                      style={{
                        background: isOver ? '#3a3a3a' : '#2a2a2a',
                        opacity: isDragging ? 0.4 : 1,
                        borderLeft: isOver ? `2px solid ${it.teamColor}` : '2px solid transparent',
                      }}
                      title={`Drag to reorder · ${it.name} ${it.teamShortName} ${it.year}`}
                    >
                      <span
                        aria-hidden
                        className="text-[10px]"
                        style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
                      >
                        ⋮⋮
                      </span>
                      <span
                        aria-hidden
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: it.teamColor }}
                      />
                      <span className="whitespace-nowrap">{it.name}</span>
                      <button
                        onClick={() => remove(basketKey(it))}
                        aria-label={`Remove ${it.name}`}
                        className="text-[12px] leading-none px-1"
                        style={{ color: '#9a9894' }}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/compare?items=${encodeURIComponent(serializeBasketToUrl(items))}`}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap"
                  style={{ background: '#faf9f7', color: '#111110' }}
                >
                  View ({items.length})
                </Link>
                <button
                  onClick={handleClear}
                  className="text-[11px] underline"
                  style={{ color: '#9a9894' }}
                >
                  clear
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
