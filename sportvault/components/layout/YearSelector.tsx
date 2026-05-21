'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { SeasonMeta } from '@/types/api'

interface YearSelectorProps {
  seasons: SeasonMeta[]
  activeYear: number
  sport: string
  competition: string
  accentColor: string
}

export function YearSelector({ seasons, activeYear, sport, competition, accentColor }: YearSelectorProps) {
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()

  return (
    <div
      className="year-scroll flex items-center ml-auto overflow-x-auto whitespace-nowrap min-w-0 pr-3 sm:pr-6"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' as React.CSSProperties['msOverflowStyle'] }}
    >
      <style>{`.year-scroll::-webkit-scrollbar{display:none}`}</style>
      <div className="flex items-center">
        {seasons.map(s => {
          const isActive = s.year === activeYear
          const isDisabled = s.status !== 'completed'

          if (isDisabled) {
            return (
              <span
                key={s.year}
                className="px-1.5 sm:px-2 h-[36px] flex items-center text-[11px] sm:text-xs cursor-not-allowed select-none whitespace-nowrap"
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
              href={queryString ? `/${sport}/${competition}/${s.year}?${queryString}` : `/${sport}/${competition}/${s.year}`}
              className="px-1.5 sm:px-2 h-[36px] flex items-center text-[11px] sm:text-xs transition-colors duration-200 whitespace-nowrap"
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
    </div>
  )
}
