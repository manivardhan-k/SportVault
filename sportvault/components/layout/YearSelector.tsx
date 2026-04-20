'use client'

import Link from 'next/link'
import type { SeasonMeta } from '@/types/api'

interface YearSelectorProps {
  seasons: SeasonMeta[]
  activeYear: number
  sport: string
  competition: string
}

export function YearSelector({ seasons, activeYear, sport, competition }: YearSelectorProps) {
  return (
    <aside className="w-32 shrink-0 border-l border-zinc-800 px-3 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Season</p>
      <ul className="flex flex-col gap-1">
        {seasons.map(s => {
          const isDisabled = s.status !== 'completed'
          const isActive = s.year === activeYear

          if (isDisabled) {
            return (
              <li key={s.year} className="cursor-not-allowed rounded px-2 py-1 text-sm text-zinc-600">
                {s.label}
              </li>
            )
          }

          return (
            <li key={s.year}>
              <Link
                href={`/${sport}/${competition}/${s.year}`}
                className={`block rounded px-2 py-1 text-sm transition-colors ${
                  isActive ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {s.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
