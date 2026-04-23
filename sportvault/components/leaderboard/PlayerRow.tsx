'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ColumnDef } from '@/types/sport-config'
import type { LeaderboardRow } from '@/types/api'

interface PlayerRowProps {
  row: LeaderboardRow
  columns: ColumnDef[]
  position: number
  isExpanded: boolean
  isAmberLeader: boolean
  isWinningTeam: boolean
  amberStatKey: string
  leaderStatValue: number
  accentColor: string
  onToggle: () => void
}

export function PlayerRow({
  row, columns, position, isExpanded, isAmberLeader, isWinningTeam, amberStatKey, leaderStatValue, accentColor, onToggle,
}: PlayerRowProps) {
  const shouldReduce = useReducedMotion()
  const color = row.team.colorPrimary

  const primarySortableCol = columns.find(c => c.sortable)
  const primaryVal = primarySortableCol ? Number(row.stats[primarySortableCol.key] ?? 0) : 0
  const barPct = leaderStatValue > 0 ? Math.min(100, Math.round((primaryVal / leaderStatValue) * 100)) : 0

  const goldColor = '#d97706'

  return (
    <motion.tr
      className="group relative cursor-pointer"
      style={{
        borderBottom: '1px solid #e4e3df',
        borderLeft: `5px solid ${color}`,
        backgroundColor: isExpanded ? '#faf9f7' : '#ffffff',
      }}
      whileHover={shouldReduce ? undefined : { backgroundColor: '#faf9f7' }}
      transition={shouldReduce ? { duration: 0 } : { duration: 0.15 }}
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
            opacity: 0.05,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Position */}
      <td className="w-12 pl-8 pr-2 py-0 text-center" style={{ height: 56 }}>
        <span
          className="text-[13px]"
          style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
        >
          {position}
        </span>
      </td>

      {columns.map(col => {
        const isAmber = isAmberLeader && col.key === amberStatKey
        const isPlayerCol = col.key === 'driver' || col.key === 'player'
        const isTeamCol = col.key === 'team'
        const isPositionCol = col.key === 'position' || col.key === '#' || col.key === 'rank'

        if (isPositionCol) return null

        if (isPlayerCol) {
          return (
            <td key={col.key} className="px-3 py-0">
              <motion.span
                className="text-[14px] font-medium leading-tight"
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
            <td key={col.key} className="px-3 py-0 text-center">
              <span
                className="text-[13px]"
                style={{ color: isWinningTeam ? goldColor : '#5a5955' }}
              >
                {row.team.shortName ?? row.team.name}
              </span>
            </td>
          )
        }

        return (
          <td key={col.key} className="px-3 py-0 text-center">
            <span
              className="text-[13px] font-medium tabular-nums"
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                color: isAmber ? goldColor : isWinningTeam ? goldColor : '#111110',
              }}
            >
              {row.stats[col.key] ?? '—'}
            </span>
          </td>
        )
      })}

      {/* Expand chevron */}
      <td className="w-10 pr-8 py-0 text-right">
        <motion.span
          className="text-[11px]"
          style={{ display: 'inline-block', color: '#9a9894' }}
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={shouldReduce ? { duration: 0 } : { duration: 0.25 }}
        >▾</motion.span>
      </td>
    </motion.tr>
  )
}
