'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { PositionGroupConfig } from '@/types/sport-config'

interface PositionSelectorProps {
  groups: PositionGroupConfig[]
  activePosition: string
  accentColor: string
}

function shortLabel(group: PositionGroupConfig): string {
  if (group.key === 'WR') return 'WR/TE'
  return group.key
}

export function PositionSelector({ groups, activePosition, accentColor }: PositionSelectorProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [pill, setPill] = useState({ left: 0, width: 0 })
  const shouldReduce = useReducedMotion()

  useEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activePosition]
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activePosition, groups])

  const hrefFor = (key: string) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set('position', key)
    const query = next.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  return (
    <div
      className="sticky z-[16] flex min-h-[52px] items-center border-b px-3 py-2 sm:px-8"
      style={{
        top: '88px',
        borderColor: '#e4e3df',
        backgroundColor: '#fbfaf7',
      }}
    >
      <div
        className="relative inline-flex rounded-full border bg-white p-1 shadow-[0_1px_0_rgba(17,17,16,0.03)]"
        style={{ borderColor: '#e4e3df' }}
      >
        <motion.div
          className="absolute top-1 h-[calc(100%-8px)] rounded-full border bg-sv-surface2"
          animate={{ left: pill.left, width: pill.width }}
          transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
          style={{
            borderColor: `${accentColor}55`,
            pointerEvents: 'none',
          }}
        />
        {groups.map(group => {
          const isActive = group.key === activePosition
          return (
            <Link
              key={group.key}
              href={hrefFor(group.key)}
              ref={el => { tabRefs.current[group.key] = el }}
              className="relative z-10 inline-flex h-8 items-center rounded-full px-3 text-[10px] font-medium uppercase tracking-[0.08em] transition-colors"
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                color: isActive ? '#111110' : '#7a7771',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <span className="sm:hidden">{shortLabel(group)}</span>
              <span className="hidden sm:inline">{group.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
