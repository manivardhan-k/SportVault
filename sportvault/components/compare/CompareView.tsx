'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCompareBasket, basketKey } from '@/lib/compare-basket'
import { getSportConfig } from '@/config/sports'
import { isBestValue } from '@/lib/percentiles'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import type { PlayerStatsResponse } from '@/types/api'

interface ComparedPlayer {
  sport: string
  competition: string
  year: number
  stats: PlayerStatsResponse
}

interface CompareViewProps {
  players: ComparedPlayer[]
}

const BASE_RADAR_EXCLUDE = new Set(['Games'])
const INDIVIDUAL_COMPARE_COLORS = ['#1d4ed8', '#d97706', '#be123c', '#0f766e', '#7c3aed', '#b45309', '#2563eb', '#c2410c']

function compareKey(p: ComparedPlayer): string {
  return `${p.stats.playerId}|${p.sport}|${p.competition}|${p.year}`
}

export function CompareView({ players: initialPlayers }: CompareViewProps) {
  const sport = initialPlayers[0]?.sport ?? null
  const sportConfig = sport ? getSportConfig(sport) : null
  const teamBased = sportConfig?.hasTeams !== false
  const radarExclude = useMemo(
    () => new Set([...BASE_RADAR_EXCLUDE, ...(sportConfig?.expandedChartConfig.excludeKeys ?? [])]),
    [sportConfig]
  )
  const { items: basket, reorder: basketReorder, remove: basketRemove } = useCompareBasket(sport)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [hoveredLineKey, setHoveredLineKey] = useState<string | null>(null)

  // Order players by basket if it covers all initial players (same browser); else use URL order.
  const players = useMemo(() => {
    if (basket.length === 0) return initialPlayers
    const byKey = new Map(initialPlayers.map(p => [compareKey(p), p]))
    const ordered: ComparedPlayer[] = []
    const seen = new Set<string>()
    for (const it of basket) {
      const k = basketKey(it)
      const p = byKey.get(k)
      if (p && !seen.has(k)) { ordered.push(p); seen.add(k) }
    }
    return ordered.length > 0 ? ordered : initialPlayers
  }, [basket, initialPlayers])

  // Sync URL when order changes so reload + share preserves order.
  useEffect(() => {
    if (players.length === 0) return
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('items', players.map(p => `${p.stats.playerId}:${p.sport}:${p.competition}:${p.year}`).join(','))
      window.history.replaceState(null, '', url.toString())
    } catch { /* noop */ }
  }, [players])

  const reorderTo = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return
    if (basket.length > 0) {
      basketReorder(fromIdx, toIdx)
    }
  }

  const onDragStart = (idx: number) => (e: React.DragEvent) => {
    setDraggedIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overIdx !== idx) setOverIdx(idx)
  }
  const onDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedIdx !== null && draggedIdx !== idx) reorderTo(draggedIdx, idx)
    setDraggedIdx(null)
    setOverIdx(null)
  }
  const onDragEnd = () => { setDraggedIdx(null); setOverIdx(null) }

  // Union of summary stat keys (numeric), excluding ignore list
  const allKeys: string[] = []
  for (const p of players) {
    for (const [k, v] of Object.entries(p.stats.summaryStats)) {
      if (radarExclude.has(k)) continue
      if (typeof v !== 'number') continue
      if (!allKeys.includes(k)) allKeys.push(k)
    }
  }

  // Per-stat max across cohort for radar normalization (cohort percentile)
  const cohortMax: Record<string, number> = {}
  for (const k of allKeys) {
    let m = 0
    for (const p of players) {
      const v = p.stats.summaryStats[k]
      if (typeof v === 'number' && v > m) m = v
    }
    cohortMax[k] = m
  }

  const hasLeaguePercentiles = players.some(p => Object.keys(p.stats.leaguePercentiles ?? {}).length > 0)

  // Radar data: one row per axis, one numeric column per player
  const radarData = allKeys.map(label => {
    const point: Record<string, string | number> = { label }
    for (const p of players) {
      const percentile = p.stats.leaguePercentiles?.[label]
      if (typeof percentile === 'number') {
        point[playerKey(p)] = percentile
        continue
      }

      const rawValue = p.stats.summaryStats[label]
      const num = typeof rawValue === 'number' ? rawValue : 0
      const max = cohortMax[label] ?? 0
      point[playerKey(p)] = max > 0 ? Math.round((num / max) * 100) : 0
    }
    return point
  })

  // Line chart: for sports with chartData (F1 cumulative points), overlay each player's series
  const lineKey = sport === 'f1' ? 'points' : null
  const hasLineData = lineKey && players.every(p => p.stats.chartData.length > 0)
  const lineData = hasLineData ? buildLineOverlay(players, lineKey) : null

  return (
    <div className="px-3 sm:px-8 py-4 sm:py-6 max-w-[1400px] mx-auto" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div className="mb-4 sm:mb-6 text-center">
        <h1 className="text-[18px] sm:text-[22px] font-semibold" style={{ color: '#111110' }}>
          Compare ({players.length})
        </h1>
      </div>

      {/* Player chips — drag to reorder */}
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {players.map((p, idx) => {
          const isDragging = draggedIdx === idx
          const isOver = overIdx === idx && draggedIdx !== null && draggedIdx !== idx
          const playerColor = compareColor(p, idx, teamBased)
          return (
            <div
              key={playerKey(p)}
              draggable
              onDragStart={onDragStart(idx)}
              onDragOver={onDragOver(idx)}
              onDrop={onDrop(idx)}
              onDragEnd={onDragEnd}
              onMouseEnter={() => setHoveredLineKey(playerKey(p))}
              onMouseLeave={() => setHoveredLineKey(null)}
              className="flex items-center gap-2 px-3 py-2 rounded-md cursor-grab active:cursor-grabbing select-none"
              style={{
                background: isOver ? '#faf9f7' : '#ffffff',
                border: `1px solid ${isOver ? playerColor : '#e4e3df'}`,
                opacity: isDragging ? 0.4 : (hoveredLineKey && hoveredLineKey !== playerKey(p) ? 0.6 : 1),
                transition: 'background 0.12s, border-color 0.12s, opacity 0.12s',
              }}
              title="Drag to reorder"
            >
              <span
                aria-hidden
                className="text-[11px]"
                style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                ⋮⋮
              </span>
              <span aria-hidden className="w-2.5 h-2.5 rounded-full" style={{ background: playerColor }} />
              <div>
                <div className="text-[13px] font-medium" style={{ color: '#111110' }}>{p.stats.name}</div>
                <div
                  className="text-[10px] uppercase tracking-[0.08em]"
                  style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
                >
                  {metaLabel(p, teamBased)}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Remove ${p.stats.name} from compare`}
                onClick={(e) => { e.stopPropagation(); basketRemove(compareKey(p)) }}
                onMouseDown={e => e.stopPropagation()}
                draggable={false}
                onDragStart={e => e.stopPropagation()}
                className="ml-2 w-5 h-5 flex items-center justify-center rounded-full text-[14px] leading-none cursor-pointer"
                style={{ color: '#9a9894', background: 'transparent' }}
                title="Remove"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <p
        className="text-[10px] uppercase tracking-[0.08em] mb-6"
        style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
      >
        Drag chips to reorder
      </p>

      {/* Stat cards: rows = stat keys, cols = players */}
      <section className="mb-10">
        <h2
          className="text-[11px] uppercase tracking-[0.12em] mb-3"
          style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
        >
          Summary stats
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e4e3df' }}>
                <th
                  className="py-2 pr-4 text-[10px] uppercase tracking-[0.08em]"
                  style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
                >
                  Stat
                </th>
                {players.map(p => (
                  <th
                    key={playerKey(p)}
                    className="py-2 px-3 text-[12px] font-medium text-center transition-opacity duration-150"
                    onMouseEnter={() => setHoveredLineKey(playerKey(p))}
                    onMouseLeave={() => setHoveredLineKey(null)}
                    style={{
                      color: '#111110',
                      opacity: hoveredLineKey && hoveredLineKey !== playerKey(p) ? 0.4 : 1
                    }}
                  >
                    {p.stats.name}
                    <div className="text-[10px] font-normal" style={{ color: '#9a9894' }}>
                      {metaLabel(p, teamBased)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allStatKeys(players).map(key => (
                <tr key={key} style={{ borderBottom: '1px solid #e4e3df' }}>
                  <td
                    className="py-2 pr-4 text-[12px]"
                    style={{ color: '#5a5955', fontFamily: 'var(--font-dm-mono), monospace' }}
                  >
                    {key}
                  </td>
                  {players.map(p => {
                    const v = p.stats.summaryStats[key]
                    const isLeader = isCohortLeader(key, p, players)
                    const playerColor = compareColor(p, players.indexOf(p), teamBased)
                    return (
                      <td
                        key={playerKey(p)}
                        className="py-2 px-3 text-[13px] text-center tabular-nums transition-opacity duration-150"
                        onMouseEnter={() => setHoveredLineKey(playerKey(p))}
                        onMouseLeave={() => setHoveredLineKey(null)}
                        style={{
                          fontFamily: 'var(--font-dm-mono), monospace',
                          color: isLeader ? playerColor : '#111110',
                          fontWeight: isLeader ? 600 : 400,
                          opacity: hoveredLineKey && hoveredLineKey !== playerKey(p) ? 0.4 : 1
                        }}
                      >
                        {v ?? '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Radar overlay — prefer full-league percentiles, fallback to cohort scaling if server values missing */}
      {radarData.length >= 3 && (
        <section className="mb-10">
          <h2
            className="text-[11px] uppercase tracking-[0.12em] mb-3"
            style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            {hasLeaguePercentiles ? 'League percentile profile' : 'Stat profile'}
          </h2>
          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: 1000 }}>
              <ResponsiveContainer width="100%" height={450}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e4e3df" />
                  <PolarAngleAxis dataKey="label" tick={{ fill: '#5a5955', fontSize: 11 }} />
                  {players.map(p => {
                    const isHovered = hoveredLineKey === playerKey(p)
                    const isDimmed = hoveredLineKey !== null && !isHovered
                    const playerColor = compareColor(p, players.indexOf(p), teamBased)
                    return (
                      <Radar
                        key={playerKey(p)}
                        name={`${p.stats.name} ${seasonLabel(p)}`}
                        dataKey={playerKey(p)}
                        stroke={playerColor}
                        strokeWidth={isHovered ? 3 : 2}
                        strokeOpacity={isDimmed ? 0.2 : 1}
                        fill={playerColor}
                        fillOpacity={isDimmed ? 0.05 : isHovered ? 0.3 : 0.15}
                      />
                    )
                  })}
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    onMouseEnter={entry => setHoveredLineKey(legendDataKey(entry))}
                    onMouseLeave={() => setHoveredLineKey(null)}
                  />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e4e3df', borderRadius: 6, fontSize: 12, color: '#111110' }}
                    formatter={(_val: unknown, _name: unknown, entry: unknown) => {
                      const e = entry as { dataKey?: string; payload?: { label?: string }; name?: string }
                      const dk = e.dataKey ?? ''
                      const label = e.payload?.label ?? ''
                      const player = players.find(p => playerKey(p) === dk)
                      const raw = player?.stats.summaryStats[label]
                      const percentile = player?.stats.leaguePercentiles?.[label]
                      return [
                        typeof percentile === 'number'
                          ? `${raw ?? _val as string | number} · ${percentile}th pctile`
                          : raw ?? _val as string | number,
                        e.name ?? '',
                      ]
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Line overlay (F1) */}
      {lineData && (
        <section className="mb-10">
          <h2
            className="text-[11px] uppercase tracking-[0.12em] mb-3"
            style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            Cumulative points by round
          </h2>
          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: 900 }}>
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={lineData} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e3df" />
                  <XAxis
                    dataKey="label"
                    stroke="#e4e3df"
                    tick={{ fontSize: 11, fill: '#9a9894' }}
                    tickMargin={8}
                    label={{ value: 'Round', position: 'bottom', offset: 0, fill: '#9a9894', fontSize: 11 }}
                  />
                  <YAxis stroke="#e4e3df" tick={{ fontSize: 11, fill: '#9a9894' }} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e4e3df', borderRadius: 4, fontSize: 12 }}
                    labelStyle={{ color: '#9a9894' }}
                    labelFormatter={label => `Round ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                    onMouseEnter={entry => setHoveredLineKey(legendDataKey(entry))}
                    onMouseLeave={() => setHoveredLineKey(null)}
                  />
                  {players.map(p => {
                    const isHovered = hoveredLineKey === playerKey(p)
                    const isDimmed = hoveredLineKey !== null && !isHovered
                    const playerColor = compareColor(p, players.indexOf(p), teamBased)
                    return (
                      <Line
                        key={playerKey(p)}
                        type="monotone"
                        name={`${p.stats.name} ${seasonLabel(p)}`}
                        dataKey={playerKey(p)}
                        stroke={playerColor}
                        strokeWidth={isHovered ? 4 : 2}
                        strokeOpacity={isDimmed ? 0.2 : 1}
                        dot={false}
                        activeDot={{ r: isHovered ? 6 : 4 }}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function playerKey(p: ComparedPlayer): string {
  return `p_${p.stats.playerId}_${p.year}`
}

function seasonLabel(p: ComparedPlayer): string {
  return `${p.year}`
}

function metaLabel(p: ComparedPlayer, teamBased: boolean): string {
  return teamBased ? `${p.stats.team.shortName} · ${seasonLabel(p)}` : seasonLabel(p)
}

function allStatKeys(players: ComparedPlayer[]): string[] {
  const seen: string[] = []
  for (const p of players) {
    for (const k of Object.keys(p.stats.summaryStats)) {
      if (!seen.includes(k)) seen.push(k)
    }
  }
  return seen
}

function isCohortLeader(key: string, p: ComparedPlayer, players: ComparedPlayer[]): boolean {
  const v = p.stats.summaryStats[key]
  if (typeof v !== 'number') return false
  const peers: number[] = []
  for (const q of players) {
    const qv = q.stats.summaryStats[key]
    if (typeof qv === 'number') peers.push(qv)
  }
  return players.length > 1 && isBestValue(v, peers, key)
}

function buildLineOverlay(players: ComparedPlayer[], dataKey: string): Record<string, number | string>[] {
  // Find max round across players
  let maxRound = 0
  for (const p of players) {
    for (const pt of p.stats.chartData) {
      const r = Number(pt.label)
      if (r > maxRound) maxRound = r
    }
  }
  const out: Record<string, number | string>[] = []
  for (let r = 1; r <= maxRound; r++) {
    const point: Record<string, number | string> = { label: r }
    for (const p of players) {
      const matched = p.stats.chartData.find(pt => Number(pt.label) === r)
      if (matched) {
        const v = matched[dataKey]
        if (typeof v === 'number') point[playerKey(p)] = v
      }
    }
    out.push(point)
  }
  return out
}

function legendDataKey(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') return null
  const dataKey = (entry as { dataKey?: unknown }).dataKey
  return typeof dataKey === 'string' ? dataKey : null
}

function compareColor(p: ComparedPlayer, index: number, teamBased: boolean): string {
  if (teamBased) return p.stats.team.colorPrimary
  return INDIVIDUAL_COMPARE_COLORS[colorHash(playerKey(p), index) % INDIVIDUAL_COMPARE_COLORS.length]
}

function colorHash(value: string, index: number): number {
  let hash = index
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
