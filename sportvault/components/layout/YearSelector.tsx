'use client'

import Link from 'next/link'
import type { SeasonMeta } from '@/types/api'

interface YearSelectorProps {
  seasons: SeasonMeta[]
  activeYear: number
  sport: string
  competition: string
  accentColor: string
}

export function YearSelector({ seasons, activeYear, sport, competition, accentColor }: YearSelectorProps) {
  return (
    <div className="flex items-center gap-0 ml-auto pr-6">
      {seasons.map(s => {
        const isActive = s.year === activeYear
        const isDisabled = s.status !== 'completed'

        if (isDisabled) {
          return (
            <span
              key={s.year}
              className="px-2 h-[36px] flex items-center text-xs cursor-not-allowed select-none"
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                color: '#9a9894',
              }}
            >
              {s.label}
            </span>
          )
        }

        return (
          <Link
            key={s.year}
            href={`/${sport}/${competition}/${s.year}`}
            className="px-2 h-[36px] flex items-center text-xs transition-colors duration-200"
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? accentColor : '#9a9894',
            }}
          >
            {s.label}
          </Link>
        )
      })}
    </div>
  )
}
