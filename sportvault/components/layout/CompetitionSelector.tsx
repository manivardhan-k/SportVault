'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { SportConfig } from '@/types/sport-config'

interface CompetitionSelectorProps {
  sportConfig: SportConfig
  defaultYear: number
  seededSlugs?: string[]
}

export function CompetitionSelector({ sportConfig, defaultYear, seededSlugs }: CompetitionSelectorProps) {
  const pathname = usePathname()
  const activeCompetition = pathname.split('/')[2]
  const accent = sportConfig.accentColor
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [underline, setUnderline] = useState({ left: 0, width: 0 })
  const shouldReduce = useReducedMotion()

  useEffect(() => {
    const el = tabRefs.current[activeCompetition]
    if (el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeCompetition, sportConfig.slug])

  return (
    <div className="relative flex items-center flex-1 px-6 h-[36px]">
      {/* Animated underline */}
      <motion.div
        className="absolute bottom-0 h-[2px] rounded-[1px]"
        animate={{ left: underline.left + 24, width: underline.width }}
        transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
        style={{ background: accent }}
      />

      {/* Tabs */}
      <div className="relative flex items-center gap-0">
        {sportConfig.competitions.map(comp => {
          const isActive = activeCompetition === comp.slug
          const isDisabled = !!seededSlugs && !seededSlugs.includes(comp.slug)

          if (isDisabled) {
            return (
              <span
                key={comp.slug}
                className="flex items-center gap-1.5 px-4 h-[36px] text-xs text-sv-text-muted cursor-not-allowed select-none"
                title="No data available"
              >
                <span className="text-[7px]">●</span>
                {comp.name}
              </span>
            )
          }

          return (
            <Link
              key={comp.slug}
              href={`/${sportConfig.slug}/${comp.slug}/${defaultYear}`}
              ref={el => { tabRefs.current[comp.slug] = el }}
              className="flex items-center px-4 h-[36px] text-[13px] transition-colors duration-200"
              style={{
                color: isActive ? '#111110' : '#9a9894',
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {comp.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
