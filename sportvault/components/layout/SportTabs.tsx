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
    const el = btnRefs.current[activeSport]
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeSport])

  return (
    <div className="flex items-center justify-between px-6 h-[52px]">
      {/* Logo */}
      <span
        className="text-base font-bold tracking-[0.14em] text-sv-text-primary select-none"
        style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}
      >
        SPORTVAULT
      </span>

      {/* Sport selector pill group */}
      <div
        className="relative flex items-center rounded-lg p-[3px] border border-sv-divider"
        style={{ background: '#f2f1ee' }}
      >
        {/* Animated sliding background pill */}
        <motion.div
          className="absolute top-[3px] h-[calc(100%-6px)] rounded-md bg-sv-surface border border-sv-divider shadow-sm"
          animate={{ left: pill.left + 3, width: pill.width }}
          transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
          style={{ pointerEvents: 'none' }}
        />

        {SPORT_CONFIGS.map(sport => {
          const isActive = activeSport === sport.slug
          return (
            <Link
              key={sport.slug}
              href={`/${sport.slug}`}
              ref={el => { btnRefs.current[sport.slug] = el }}
              className="relative z-10 flex items-center gap-[5px] rounded-md px-[14px] py-[5px] text-xs font-medium transition-colors duration-200 whitespace-nowrap"
              style={{
                color: isActive ? sport.accentColor : '#5a5955',
              }}
            >
              <span className="text-[10px]">{sport.icon}</span>
              {sport.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
