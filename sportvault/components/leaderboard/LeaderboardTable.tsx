'use client'

import { useState, useCallback, Fragment } from 'react'
import { PlayerRow } from './PlayerRow'
import { PlayerExpandedStats } from './PlayerExpandedStats'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'
import type { ChartConfig } from '@/types/sport-config'

interface LeaderboardTableProps {
  data: LeaderboardResponse
  sport: string
  competition: string
  year: number
  chartConfig: ChartConfig
}

export function LeaderboardTable({ data, sport, competition, year, chartConfig }: LeaderboardTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedStats, setExpandedStats] = useState<PlayerStatsResponse | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState(data.columns.find(c => c.sortable)?.key ?? '')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }, [sortKey])

  const sorted = [...data.rows].sort((a, b) => {
    const av = Number(a.stats[sortKey] ?? 0)
    const bv = Number(b.stats[sortKey] ?? 0)
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const handleToggle = useCallback(async (playerId: string) => {
    if (expandedId === playerId) {
      setExpandedId(null)
      setExpandedStats(null)
      return
    }
    setExpandedId(playerId)
    setExpandedStats(null)
    setLoadingId(playerId)
    try {
      const res = await fetch(`/api/${sport}/${competition}/${year}/player/${playerId}`)
      const json: PlayerStatsResponse = await res.json()
      setExpandedStats(json)
    } finally {
      setLoadingId(null)
    }
  }, [expandedId, sport, competition, year])

  return (
    <div className="overflow-x-auto">
      {sport === 'nfl' && (
        <p className="px-4 pt-2 text-[11px] text-zinc-600">
          Stats sourced from Next Gen Stats (NGS) — may differ slightly from official NFL box scores.
        </p>
      )}
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zinc-700">
            {data.columns.map(col => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 ${col.sortable ? 'cursor-pointer select-none hover:text-white' : ''}`}
              >
                {col.label}
                {col.sortable && sortKey === col.key && (
                  <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <Fragment key={row.playerId}>
              <PlayerRow
                row={row}
                columns={data.columns}
                isExpanded={expandedId === row.playerId}
                onToggle={() => handleToggle(row.playerId)}
              />
              {expandedId === row.playerId && (
                <PlayerExpandedStats
                  stats={expandedStats}
                  loading={loadingId === row.playerId}
                  chartConfig={chartConfig}
                  onClose={() => { setExpandedId(null); setExpandedStats(null) }}
                />
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
