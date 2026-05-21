'use client'

import { fmtVal } from '@/lib/format'
import { heroConfigForRow } from './HeroStrip'
import type { LeaderboardRow } from '@/types/api'

interface TeamHeroStripProps {
  teamName: string
  teamColor: string
  accentColor: string
  sport: string
  teamStats: Record<string, number>
  playerCount: number
  heroRow: LeaderboardRow
  topOffset?: number
}

export function TeamHeroStrip({ teamName, teamColor, accentColor, sport, teamStats, heroRow, topOffset = 88 }: TeamHeroStripProps) {
  const config = heroConfigForRow(sport, heroRow)
  if (!config) return null
  
  const statDefs = [
    { key: config.primary, label: config.label },
    ...config.secondary
  ]

  return (
    <div
      className="sticky z-[14] flex h-[40px] flex-shrink-0 items-center overflow-hidden bg-sv-surface px-3 sm:px-6"
      style={{ top: topOffset, borderBottom: `1px solid #e4e3df`, borderLeft: `4px solid ${teamColor}`, boxShadow: '0 8px 22px rgba(17,17,16,0.03)' }}
    >
      {/* Champion badge */}
      <div className="flex items-center gap-[6px] mr-3">
        <span
          className="rounded-full border border-sv-divider bg-sv-surface-warm px-2 py-1 text-[10px] tracking-[0.06em]"
          style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
        >
          T1
        </span>
        <div className="w-[6px] h-[6px] rounded-full" style={{ background: accentColor }} />
      </div>

      {/* Team name */}
      <span
        className="mr-2 min-w-0 truncate text-[12px] font-semibold sm:mr-4 sm:text-[13px]"
        style={{ color: '#111110' }}
      >
        {teamName}
      </span>

      <div className="hidden sm:block w-px h-[16px] bg-sv-divider mr-4" />

      {/* Aggregated stats */}
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0 sm:gap-4">
        {statDefs.map(s => (
          <div key={s.key} className="flex items-baseline gap-1 rounded-full border border-sv-divider bg-sv-surface-warm px-2 py-1">
            <span
              className="text-[13px] font-semibold"
              style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#111110' }}
            >
              {fmtVal(teamStats[s.key], s.key)}
            </span>
            <span
              className="text-[10px]"
              style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
