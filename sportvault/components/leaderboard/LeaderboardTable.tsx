'use client'

import { useState, useCallback, Fragment } from 'react'
import { AnimatePresence } from 'framer-motion'
import { PlayerRow } from './PlayerRow'
import { PlayerExpandedStats } from './PlayerExpandedStats'
import { HeroStrip } from './HeroStrip'
import { TeamHeroStrip } from './TeamHeroStrip'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'
import type { ChartConfig } from '@/types/sport-config'

interface LeaderboardTableProps {
  data: LeaderboardResponse
  sport: string
  competition: string
  year: number
  chartConfig: ChartConfig
  accentColor: string
}

export function LeaderboardTable({ data, sport, competition, year, chartConfig, accentColor }: LeaderboardTableProps) {
  const defaultSortKey = data.columns.find(c => c.sortable)?.key ?? ''
  const [heroExpanded, setHeroExpanded] = useState(false)
  const [heroStats, setHeroStats] = useState<PlayerStatsResponse | null>(null)
  const [heroLoading, setHeroLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedStats, setExpandedStats] = useState<PlayerStatsResponse | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState(defaultSortKey)
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

  const isDefaultSort = sortKey === defaultSortKey && sortDir === 'desc'
  const leaderId = isDefaultSort ? sorted[0]?.playerId : null
  const leaderStatValue = Number(sorted[0]?.stats[sortKey] ?? 0)

  const originalRankMap = new Map(data.rows.map((r, i) => [r.playerId, i + 1]))

  const heroRow = data.rows[0]
  const winningTeamName = heroRow?.team.name ?? ''

  // Aggregate stats for winning team across all its players
  const teamRows = data.rows.filter(r => r.team.name === winningTeamName)
  const teamStats: Record<string, number> = {}
  for (const r of teamRows) {
    for (const [k, v] of Object.entries(r.stats)) {
      if (typeof v === 'number') teamStats[k] = (teamStats[k] ?? 0) + v
    }
  }

  const handleHeroToggle = useCallback(async () => {
    if (heroExpanded) {
      setHeroExpanded(false)
      setHeroStats(null)
      return
    }
    setHeroExpanded(true)
    setHeroStats(null)
    setHeroLoading(true)
    try {
      const res = await fetch(`/api/${sport}/${competition}/${year}/player/${heroRow!.playerId}`)
      const json: PlayerStatsResponse = await res.json()
      setHeroStats(json)
    } finally {
      setHeroLoading(false)
    }
  }, [heroExpanded, heroRow, sport, competition, year])

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
    <div>
      {/* Team HeroStrip — sticky top-0 */}
      {heroRow && (
        <TeamHeroStrip
          teamName={heroRow.team.shortName ?? heroRow.team.name}
          teamColor={heroRow.team.colorPrimary}
          accentColor={accentColor}
          sport={sport}
          teamStats={teamStats}
          playerCount={teamRows.length}
        />
      )}

      {/* Player HeroStrip — sticky below team strip (40px), independent expand state */}
      {heroRow && (
        <HeroStrip
          row={heroRow}
          sport={sport}
          accentColor={accentColor}
          isExpanded={heroExpanded}
          onToggle={handleHeroToggle}
          expandedContent={
            <PlayerExpandedStats
              stats={heroStats}
              loading={heroLoading}
              chartConfig={chartConfig}
              accentColor={accentColor}
              onClose={() => { setHeroExpanded(false); setHeroStats(null) }}
              inline
            />
          }
        />
      )}

      {sport === 'nfl' && (
        <p className="px-8 pt-2 pb-1 text-[11px]" style={{ color: '#9a9894' }}>
          Stats sourced from Next Gen Stats (NGS) — may differ slightly from official NFL box scores.
        </p>
      )}

      <table className="w-full text-left">
        {/* thead sticks below team strip (40px) + player strip (52px) */}
        <thead className="sticky top-[92px] z-[7]" style={{ background: '#f2f1ee' }}>
          <tr style={{ height: 38, borderBottom: '1px solid #e4e3df' }}>
            <th
              className="w-12 pl-8 pr-2 py-0 text-[10px] font-medium uppercase tracking-[0.08em] text-center"
              style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
            >
              #
            </th>
            {data.columns.filter(c => c.key !== 'position' && c.key !== '#' && c.key !== 'rank').map(col => {
              const isPlayerCol = col.key === 'driver' || col.key === 'player'
              return (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-3 py-0 text-[10px] font-medium uppercase tracking-[0.08em] whitespace-nowrap
                    ${col.sortable ? 'cursor-pointer select-none' : ''}
                    ${isPlayerCol ? 'text-left' : 'text-center'}`}
                  style={col.sortable && sortKey === col.key ? {
                    fontFamily: 'var(--font-dm-mono), monospace',
                    color: accentColor,
                    borderBottom: `2px solid ${accentColor}`,
                  } : {
                    fontFamily: 'var(--font-dm-mono), monospace',
                    color: '#9a9894',
                  }}
                >
                  {col.label}
                </th>
              )
            })}
            <th className="w-10 pr-8" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <Fragment key={row.playerId}>
              <PlayerRow
                row={row}
                columns={data.columns}
                position={originalRankMap.get(row.playerId) ?? 0}
                isExpanded={expandedId === row.playerId}
                isAmberLeader={row.playerId === leaderId}
                isWinningTeam={row.team.name === winningTeamName}
                amberStatKey={sortKey}
                leaderStatValue={leaderStatValue}
                accentColor={accentColor}
                onToggle={() => handleToggle(row.playerId)}
              />
              <AnimatePresence>
                {expandedId === row.playerId && (
                  <PlayerExpandedStats
                    stats={expandedStats}
                    loading={loadingId === row.playerId}
                    chartConfig={chartConfig}
                    accentColor={accentColor}
                    onClose={() => { setExpandedId(null); setExpandedStats(null) }}
                  />
                )}
              </AnimatePresence>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
