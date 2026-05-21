'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()
  const activeCompetition = pathname.split('/')[2]
  const accent = sportConfig.accentColor
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [underline, setUnderline] = useState({ left: 0, width: 0 })
  const shouldReduce = useReducedMotion()

  useEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activeCompetition]
      const tabs = tabsRef.current
      if (el && tabs) {
        setUnderline({ left: tabs.offsetLeft + el.offsetLeft, width: el.offsetWidth })
      }
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeCompetition, sportConfig.slug])

  const queryString = searchParams.toString()
  const hrefFor = (slug: string) => {
    const base = `/${sportConfig.slug}/${slug}/${defaultYear}`
    return queryString ? `${base}?${queryString}` : base
  }

  return (
    <div className="sv-scrollbar-none relative flex h-[36px] flex-1 items-center overflow-x-auto px-3 sm:px-6">
      {/* Animated underline */}
      <motion.div
        className="absolute bottom-0 h-[2px] rounded-[1px]"
        animate={{ left: underline.left, width: underline.width }}
        transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
        style={{ background: accent }}
      />

      {/* Tabs */}
      <div ref={tabsRef} className="relative flex items-center gap-0">
        {sportConfig.competitions.map(comp => {
          const isActive = activeCompetition === comp.slug
          const isDisabled = !!seededSlugs && seededSlugs.length > 0 && !seededSlugs.includes(comp.slug)

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
              href={hrefFor(comp.slug)}
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
