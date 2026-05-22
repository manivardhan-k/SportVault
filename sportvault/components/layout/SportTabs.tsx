'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SPORT_CONFIGS } from '@/config/sports'

export function SportTabs() {
  const pathname = usePathname()
  const activeSport = pathname.split('/')[1]
  const btnRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [pill, setPill] = useState({ left: 0, width: 0 })
  const shouldReduce = useReducedMotion()

  useEffect(() => {
    const measure = () => {
      const el = btnRefs.current[activeSport]
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeSport])

  return (
    <div className="flex h-[52px] items-center justify-between gap-2 px-3 sm:px-6">
      {/* Logo — always full text */}
      <Link
        href="/"
        className="text-[13px] sm:text-base font-bold tracking-[0.1em] sm:tracking-[0.14em] text-sv-text-primary whitespace-nowrap hover:opacity-80 transition-opacity duration-150"
        style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}
      >
        SPORTVAULT
      </Link>

      {/* Sport selector pill group */}
      <div
        className="sv-scrollbar-none relative flex min-w-0 items-center overflow-x-auto rounded-full border border-sv-divider bg-white p-1 shadow-[0_1px_0_rgba(17,17,16,0.03)]"
      >
        {/* Animated sliding background pill */}
        <motion.div
          className="absolute top-1 h-[calc(100%-8px)] rounded-full border border-sv-divider bg-sv-surface2 shadow-sm"
          animate={{ left: pill.left, width: pill.width }}
          transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
          style={{ pointerEvents: 'none' }}
        />

        {SPORT_CONFIGS.map(sport => {
          const isActive = activeSport === sport.slug
          const isDisabled = sport.slug === 'soccer' || sport.slug === 'mma'
          return (
            <Link
              key={sport.slug}
              href={`/${sport.slug}`}
              ref={el => { btnRefs.current[sport.slug] = el }}
              className={`relative z-10 flex items-center rounded-full px-3 py-[6px] text-[11px] font-medium whitespace-nowrap transition-colors duration-200 sm:px-[14px] sm:text-xs ${isDisabled ? 'pointer-events-none opacity-40' : ''}`}
              style={{
                color: isActive ? sport.accentColor : '#7a7771',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <span>{sport.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
