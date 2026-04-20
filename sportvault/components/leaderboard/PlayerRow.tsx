'use client'

import { TeamColorDot } from './TeamColorDot'
import type { ColumnDef } from '@/types/sport-config'
import type { LeaderboardRow } from '@/types/api'

interface PlayerRowProps {
  row: LeaderboardRow
  columns: ColumnDef[]
  isExpanded: boolean
  onToggle: () => void
}

export function PlayerRow({ row, columns, isExpanded, onToggle }: PlayerRowProps) {
  const color = row.team.colorPrimary

  return (
    <tr
      className={`cursor-pointer border-b border-zinc-800 transition-colors hover:bg-zinc-900 ${isExpanded ? 'bg-zinc-900' : ''}`}
      style={{ borderLeft: `4px solid ${color}` }}
      onClick={onToggle}
    >
      {columns.map(col => (
        <td key={col.key} className="px-4 py-3 text-sm">
          {col.key === 'driver' || col.key === 'player' ? (
            <span className="flex items-center gap-2">
              <TeamColorDot color={color} />
              {row.name}
            </span>
          ) : col.key === 'team' ? (
            <span className="text-zinc-400">{row.team.name}</span>
          ) : (
            <span>{row.stats[col.key] ?? '—'}</span>
          )}
        </td>
      ))}
    </tr>
  )
}
