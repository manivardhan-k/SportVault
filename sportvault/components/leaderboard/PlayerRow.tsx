'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ColumnDef } from '@/types/sport-config'
import type { LeaderboardRow } from '@/types/api'
import { fmtVal } from '@/lib/format'

interface PlayerRowProps {
  row: LeaderboardRow
  columns: ColumnDef[]
  position: number
  isExpanded: boolean
  isWinningTeam: boolean
  leaderStatValue: number
  accentColor: string
  defaultSortKey?: string
  hasTeams?: boolean
  onToggle?: () => void
  interactive?: boolean
  inBasket?: boolean
  onToggleCompare?: () => void
}

export function PlayerRow({
  row, columns, position, isExpanded, isWinningTeam, leaderStatValue, accentColor, defaultSortKey, hasTeams = true, onToggle,
  interactive = true, inBasket, onToggleCompare,
}: PlayerRowProps) {
  const shouldReduce = useReducedMotion()
  const color = hasTeams ? row.team.colorPrimary : '#d4d2cd'

  const primarySortableCol = columns.find(c => c.sortable)
  const primaryVal = primarySortableCol ? Number(row.stats[primarySortableCol.key] ?? 0) : 0
  const barPct = hasTeams && leaderStatValue > 0 ? Math.min(100, Math.round((primaryVal / leaderStatValue) * 100)) : 0

  const goldColor = '#d97706'

  return (
    <motion.tr
      className={`group relative ${interactive ? 'cursor-pointer' : ''}`}
      style={{
        borderBottom: '1px solid #ebe9e4',
        backgroundColor: isExpanded ? '#fbfaf7' : '#ffffff',
        boxShadow: isExpanded ? `inset 0 0 0 1px ${accentColor}22` : 'none',
      }}
      whileHover={interactive && !shouldReduce ? { backgroundColor: '#fbfaf7' } : undefined}
      transition={shouldReduce ? { duration: 0 } : {
        backgroundColor: { duration: 0.15 },
      }}
      onClick={onToggle}
    >
      {/* Stat bar overlay */}
      {barPct > 0 && (
        <td
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: `${barPct}%`,
            backgroundColor: color,
            opacity: 0.045,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Position */}
      <td className="relative w-9 py-0 pl-3 pr-2 text-center sm:w-12 sm:pl-8" style={{ height: 58 }}>
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[5px]"
          style={{ background: color }}
        />
        <span
          className="inline-flex min-w-[1.7rem] items-center justify-center rounded-full border px-1.5 py-1 text-[11px]"
          style={{ fontFamily: 'var(--font-dm-mono), monospace', color: position <= 3 ? '#111110' : '#9a9894', borderColor: position <= 3 ? '#d4d2cd' : 'transparent', background: position <= 3 ? '#fbfaf7' : 'transparent' }}
        >
          {position}
        </span>
      </td>

      {columns.map(col => {
        const isPlayerCol = col.key === 'driver' || col.key === 'player'
        const isTeamCol = col.key === 'team'
        const isPositionCol = col.key === 'position' || col.key === '#' || col.key === 'rank'

        if (isPositionCol) return null

        const alwaysVisible = isPlayerCol || isTeamCol || col.key === defaultSortKey
        const mobileHide = alwaysVisible ? '' : 'hidden sm:table-cell'

        if (isPlayerCol) {
          return (
            <td key={col.key} className={`px-2 sm:px-3 py-0 ${mobileHide}`}>
              <motion.span
                className="text-[13px] font-semibold leading-tight sm:text-[14px]"
                style={{ color: isWinningTeam ? goldColor : '#111110' }}
                whileHover={{ color: accentColor }}
                transition={{ duration: 0.15 }}
              >
                {row.name}
              </motion.span>
            </td>
          )
        }

        if (isTeamCol) {
          return (
            <td key={col.key} className={`px-2 sm:px-3 py-0 text-center ${mobileHide}`}>
              <span
                className="rounded-full border border-sv-divider bg-sv-surface-warm px-2 py-1 text-[11px] sm:text-[12px]"
                style={{ color: isWinningTeam ? goldColor : '#5a5955' }}
                title={row.team.name}
              >
                {row.team.shortName ?? row.team.name}
              </span>
            </td>
          )
        }

        return (
          <td key={col.key} className={`px-2 sm:px-3 py-0 text-center ${mobileHide}`}>
            <span
              className="text-[12px] font-medium tabular-nums sm:text-[13px]"
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                color: isWinningTeam ? goldColor : '#111110',
              }}
            >
              {fmtVal(row.stats[col.key], col.key)}
            </span>
          </td>
        )
      })}

      {/* Compare toggle — custom-styled, fits row aesthetic */}
      {onToggleCompare && (
        <td className="w-8 py-0 text-center">
          <button
            type="button"
            role="checkbox"
            aria-checked={!!inBasket}
            aria-label={`${inBasket ? 'Remove' : 'Add'} ${row.name} ${inBasket ? 'from' : 'to'} compare`}
            onClick={e => { e.stopPropagation(); onToggleCompare() }}
            className="inline-flex h-[15px] w-[15px] items-center justify-center rounded-[4px] transition-colors duration-150"
            style={{
              border: `1px solid ${inBasket ? accentColor : '#d4d2cd'}`,
              background: inBasket ? accentColor : 'transparent',
              opacity: inBasket ? 1 : 0.6,
              cursor: 'pointer',
            }}
          >
            {inBasket && (
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M2 5.2 L4.2 7.2 L8 3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </td>
      )}

      {/* Expand chevron */}
      {interactive && (
        <td className="w-8 sm:w-10 pr-3 sm:pr-8 py-0 text-right">
          <motion.span
            className="text-[11px]"
            style={{ display: 'inline-block', color: '#9a9894' }}
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={shouldReduce ? { duration: 0 } : { duration: 0.25 }}
          >▾</motion.span>
        </td>
      )}
    </motion.tr>
  )
}
