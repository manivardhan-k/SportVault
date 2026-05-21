'use client'

import { useState, useCallback, Fragment, useDeferredValue, useEffect, useMemo, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { PlayerRow } from './PlayerRow'
import { PlayerExpandedStats } from './PlayerExpandedStats'
import { HeroStrip } from './HeroStrip'
import { TeamHeroStrip } from './TeamHeroStrip'
import { getSportConfig } from '@/config/sports'
import { filterRowsByPlayerName } from '@/lib/leaderboard-search'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'
import type { ChartConfig } from '@/types/sport-config'
import { useCompareBasket, basketKey, type BasketItem } from '@/lib/compare-basket'
import { notify } from '@/lib/toast'

function HeaderTooltip({ text }: { text: string }) {
  const [shift, setShift] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const originalRight = rect.right - shift
      const overflowRight = originalRight - window.innerWidth + 5
      if (overflowRight > 0) {
        setShift(-overflowRight)
      } else {
        setShift(0)
      }
    }
  }

  return (
    <span className="group/tooltip relative inline-flex items-center" onMouseEnter={handleMouseEnter}>
      <span
        className="inline-flex h-[13px] w-[13px] items-center justify-center rounded-full border bg-white align-middle text-[8px] leading-none normal-case"
        style={{ color: '#9a9894', borderColor: '#d4d2cd' }}
        aria-label={text}
        tabIndex={0}
      >
        i
      </span>
      <span
        ref={ref}
        role="tooltip"
        className="pointer-events-none absolute bottom-full z-20 mb-2 hidden w-max max-w-[16rem] whitespace-normal rounded-[6px] border border-sv-divider bg-sv-surface px-2.5 py-1.5 text-left text-[10px] normal-case leading-snug tracking-normal text-sv-text-secondary shadow-sm sm:max-w-[32rem] group-hover/tooltip:block group-focus-within/tooltip:block"
        style={{ left: '50%', transform: `translateX(calc(-50% + ${shift}px))` }}
      >
        {text}
      </span>
    </span>
  )
}

interface LeaderboardTableProps {
  data: LeaderboardResponse
  sport: string
  competition: string
  year: number
  chartConfig: ChartConfig
  accentColor: string
  defaultSortKey: string
  hasTeams?: boolean
  teamFilter?: string[]
  positionBarHeight?: number
  showHero?: boolean
  enablePlayerDetails?: boolean
  enableCompare?: boolean
}

export function LeaderboardTable({
  data: rawData,
  sport,
  competition,
  year,
  chartConfig,
  accentColor,
  defaultSortKey,
  hasTeams = true,
  teamFilter,
  positionBarHeight = 0,
  showHero = true,
  enablePlayerDetails = true,
  enableCompare = true,
}: LeaderboardTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const baseData = useMemo(() => (
    teamFilter && teamFilter.length > 0
      ? (() => {
          const filterSet = new Set(teamFilter.map(value => value.toUpperCase()))
          const filteredRows = rawData.rows.filter(row => filterSet.has(row.team.shortName.toUpperCase()))
          const teamNames = new Set(filteredRows.map(row => row.team.name))
          const rankings = rawData.teamRankings
            ? Object.fromEntries(Object.entries(rawData.teamRankings).filter(([name]) => teamNames.has(name)))
            : undefined
          return { ...rawData, rows: filteredRows, teamRankings: rankings }
        })()
      : rawData
  ), [rawData, teamFilter])
  const filteredRows = useMemo(
    () => filterRowsByPlayerName(baseData.rows, deferredSearchQuery),
    [baseData.rows, deferredSearchQuery]
  )
  const hasSearch = deferredSearchQuery.trim().length > 0
  const data = useMemo(
    () => hasSearch ? { ...baseData, rows: filteredRows } : baseData,
    [baseData, filteredRows, hasSearch]
  )
  const sportConfig = getSportConfig(sport)
  const teamBased = hasTeams && sportConfig?.hasTeams !== false
  const tooltipByKey = new Map(
    [
      ...(sportConfig?.leaderboardColumns ?? []),
      ...(sportConfig?.positionGroups?.flatMap(group => group.columns) ?? []),
    ]
      .filter(column => column.tooltip)
      .map(column => [column.key, column.tooltip!])
  )
  const columns = data.columns.map(column => ({
    ...column,
    tooltip: column.tooltip ?? tooltipByKey.get(column.key),
  }))
  const [heroExpanded, setHeroExpanded] = useState(false)
  const [heroStats, setHeroStats] = useState<PlayerStatsResponse | null>(null)
  const [heroLoading, setHeroLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedStats, setExpandedStats] = useState<PlayerStatsResponse | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [sortState, setSortState] = useState(() => ({
    key: defaultSortKey,
    dir: 'desc' as 'asc' | 'desc',
    baseKey: defaultSortKey,
  }))
  const isDefaultSort = sortState.baseKey !== defaultSortKey
  const sortKey = isDefaultSort ? defaultSortKey : sortState.key
  const sortDir = isDefaultSort ? 'desc' : sortState.dir
  const [tbodyOpacity, setTbodyOpacity] = useState(1)
  const sortTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { add: addToBasket, remove: removeFromBasket, has: inBasket } = useCompareBasket(sport)

  useEffect(() => {
    return () => {
      if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current)
    }
  }, [])

  const handleToggleCompare = useCallback((row: LeaderboardResponse['rows'][number]) => {
    const item: BasketItem = {
      playerId: row.playerId,
      sport,
      competition,
      year,
      name: row.name,
      teamShortName: row.team.shortName,
      teamColor: row.team.colorPrimary,
    }
    const key = basketKey(item)
    if (inBasket(key)) {
      removeFromBasket(key)
      return
    }
    const result = addToBasket(item)
    if (!result.ok && result.reason) notify(result.reason, 'error')
  }, [addToBasket, removeFromBasket, inBasket, sport, competition, year])

  const handleSort = useCallback((key: string) => {
    setTbodyOpacity(0)
    if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current)
    sortTimeoutRef.current = setTimeout(() => {
      setSortState(current => {
        const currentIsDefault = current.baseKey !== defaultSortKey
        const currentKey = currentIsDefault ? defaultSortKey : current.key
        const currentDir = currentIsDefault ? 'desc' : current.dir

        if (currentKey !== key) {
          return { key, dir: 'desc', baseKey: defaultSortKey }
        }

        if (currentIsDefault) {
          return { key, dir: 'desc', baseKey: defaultSortKey }
        }

        if (currentDir === 'desc') {
          return { key, dir: 'asc', baseKey: defaultSortKey }
        }

        return { key: defaultSortKey, dir: 'desc', baseKey: '__default__' }
      })
      requestAnimationFrame(() => {
        setTbodyOpacity(1)
      })
    }, 150)
  }, [defaultSortKey])

  const teamRankings = baseData.teamRankings
  const teamFallbackRank = useMemo(() => {
    const fallback = new Map<string, number>()
    if (!teamRankings) {
      for (const [index, row] of baseData.rows.entries()) {
        const rank = Number(row.stats.position ?? index + 1) || index + 1
        const previous = fallback.get(row.team.name)
        if (previous == null || rank < previous) fallback.set(row.team.name, rank)
      }
    }
    return fallback
  }, [baseData.rows, teamRankings])

  const sorted = useMemo(() => [...data.rows].sort((a, b) => {
    if (sortKey === 'team') {
      let teamComparison: number
      if (teamRankings) {
        const posA = teamRankings[a.team.name] ?? 999
        const posB = teamRankings[b.team.name] ?? 999
        teamComparison = sortDir === 'desc' ? posA - posB : posB - posA
      } else {
        const rankA = teamFallbackRank.get(a.team.name) ?? 999
        const rankB = teamFallbackRank.get(b.team.name) ?? 999
        teamComparison = sortDir === 'desc' ? rankA - rankB : rankB - rankA
      }
      if (teamComparison !== 0) return teamComparison
      return Number(b.stats[defaultSortKey] ?? 0) - Number(a.stats[defaultSortKey] ?? 0)
    }

    const av = Number(a.stats[sortKey] ?? 0)
    const bv = Number(b.stats[sortKey] ?? 0)
    return sortDir === 'desc' ? bv - av : av - bv
  }), [data.rows, sortKey, sortDir, teamRankings, teamFallbackRank, defaultSortKey])

  const leaderStatValue = Number(sorted[0]?.stats[sortKey] ?? 0)
  const originalRankMap = useMemo(
    () => new Map(baseData.rows.map((row, index) => [row.playerId, index + 1])),
    [baseData.rows]
  )

  const heroRow = showHero && !hasSearch ? baseData.rows[0] : null
  const topTeamName = useMemo(() => {
    if (!showHero || hasSearch) return ''
    if (teamRankings) {
      const topTeam = Object.entries(teamRankings)
        .sort(([, rankA], [, rankB]) => rankA - rankB)[0]?.[0]
      if (topTeam) return topTeam
    }
    return heroRow?.team.name ?? ''
  }, [hasSearch, heroRow, showHero, teamRankings])
  const winningTeamName = topTeamName
  const showTeamHero = Boolean(winningTeamName && teamBased)
  const showPlayerHero = Boolean(heroRow)
  const baseStickyTop = 88 + positionBarHeight
  const teamHeroTop = baseStickyTop
  const playerHeroTop = baseStickyTop + (showTeamHero ? 40 : 0)
  const headerTop = baseStickyTop + (showTeamHero ? 40 : 0) + (showPlayerHero ? 52 : 0)

  const teamRows = useMemo(
    () => baseData.rows.filter(row => row.team.name === winningTeamName),
    [baseData.rows, winningTeamName]
  )
  const teamHeroRow = teamRows[0] ?? heroRow
  const teamStats = useMemo(() => {
    const aggregate: Record<string, number> = {}
    for (const row of teamRows) {
      for (const [key, value] of Object.entries(row.stats)) {
        if (typeof value === 'number') aggregate[key] = (aggregate[key] ?? 0) + value
      }
    }
    return aggregate
  }, [teamRows])

  const leagueValues = useMemo(() => {
    const values: Record<string, number[]> = {}
    const keyToLabelMap: Record<string, string> = {
      completion_pct: 'Comp %',
      completion_percentage: 'Comp %',
      bowl_avg: 'Bowl Avg',
      bowlAvg: 'Bowl Avg',
      first_srv_won_pct: '1st Won%',
      takedown_acc: 'TDAcc%',
    }

    for (const column of baseData.columns) {
      if (column.key !== 'player' && column.key !== 'team' && column.key !== 'position') {
        keyToLabelMap[column.key] = column.label
      }
    }

    for (const row of baseData.rows) {
      for (const [key, value] of Object.entries(row.stats)) {
        if (typeof value !== 'number') continue
        const label = keyToLabelMap[key] ?? key
        if (!values[label]) values[label] = []
        values[label].push(value)
      }
    }

    return values
  }, [baseData.columns, baseData.rows])

  const handleHeroToggle = useCallback(async () => {
    if (!heroRow) return
    if (heroExpanded) {
      setHeroExpanded(false)
      setHeroStats(null)
      return
    }
    setHeroExpanded(true)
    setHeroStats(null)
    setHeroLoading(true)
    try {
      const response = await fetch(`/api/${sport}/${competition}/${year}/player/${heroRow.playerId}`)
      const json: PlayerStatsResponse = await response.json()
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
      const response = await fetch(`/api/${sport}/${competition}/${year}/player/${playerId}`)
      const json: PlayerStatsResponse = await response.json()
      setExpandedStats(json)
    } finally {
      setLoadingId(null)
    }
  }, [expandedId, sport, competition, year])

  return (
    <div>
      <div className="sv-command-strip px-3 py-3 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-2 sm:max-w-[22rem]">
          <span
            className="hidden text-[10px] uppercase tracking-[0.08em] text-sv-text-muted sm:inline"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            Find
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search players"
            className="h-9 w-full rounded-full border px-3.5 text-[13px] outline-none transition-colors placeholder:text-sv-text-muted focus:border-sv-border-strong"
            style={{
              background: '#ffffff',
              borderColor: '#d4d2cd',
              color: '#111110',
            }}
            aria-label="Search players on leaderboard"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="rounded-full border border-sv-divider bg-white px-2.5 py-1.5 text-[10px] uppercase tracking-[0.08em] transition-colors hover:border-sv-border-strong"
              style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span
            className="rounded-full border border-sv-divider bg-white px-2.5 py-1.5 text-[10px] uppercase tracking-[0.08em]"
            style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            {sorted.length} / {baseData.rows.length} shown
          </span>
          {sport === 'nfl' && (
            <span
              className="inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] leading-snug"
              style={{
                borderColor: '#d4d2cd',
                background: '#faf9f7',
                color: '#7a7771',
                fontFamily: 'var(--font-dm-sans), sans-serif',
              }}
            >
              NGS data. Passing yards may run slightly above official NFL box scores.
            </span>
          )}
        </div>
        </div>
      </div>

      {showTeamHero && heroRow && (
        <TeamHeroStrip
          teamName={winningTeamName}
          teamColor={teamHeroRow?.team.colorPrimary ?? accentColor}
          accentColor={accentColor}
          sport={sport}
          teamStats={teamStats}
          playerCount={teamRows.length}
          heroRow={teamHeroRow ?? heroRow}
          topOffset={teamHeroTop}
        />
      )}

      {showPlayerHero && heroRow && (
        <HeroStrip
          row={heroRow}
          sport={sport}
          accentColor={accentColor}
          showTeam={teamBased}
          useTeamColor={teamBased}
          isExpanded={heroExpanded}
          onToggle={handleHeroToggle}
          topOffset={playerHeroTop}
          expandedContent={
            <PlayerExpandedStats
              stats={heroStats}
              loading={heroLoading}
              chartConfig={chartConfig}
              accentColor={accentColor}
              leagueValues={leagueValues}
              onClose={() => { setHeroExpanded(false); setHeroStats(null) }}
              inline
            />
          }
        />
      )}

      <table className="w-full border-separate border-spacing-0 text-left">
        <thead
          className="sticky z-[12] hover:z-[20] focus-within:z-[20]"
          style={{
            top: headerTop,
            background: '#f7f6f3',
          }}
        >
          <tr style={{ height: 40, borderBottom: '1px solid #e4e3df', boxShadow: 'inset 0 -1px 0 #e4e3df' }}>
            <th
              className="w-9 sm:w-12 pl-3 sm:pl-8 pr-2 py-0 text-[10px] font-medium uppercase tracking-[0.08em] text-center"
              style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
            >
              #
            </th>
            {columns.filter(column => column.key !== 'position' && column.key !== '#' && column.key !== 'rank').map(column => {
              const isPlayerColumn = column.key === 'driver' || column.key === 'player'
              const isTeamColumn = column.key === 'team'
              const alwaysVisible = isPlayerColumn || isTeamColumn || column.key === defaultSortKey

              return (
                <th
                  key={column.key}
                  onClick={() => column.sortable && handleSort(column.key)}
                  className={`px-2 sm:px-3 py-0 text-[10px] font-medium uppercase tracking-[0.08em] whitespace-nowrap transition-colors
                    ${column.sortable ? 'cursor-pointer select-none' : ''}
                    ${isPlayerColumn ? 'text-left' : 'text-center'}
                    ${alwaysVisible ? '' : 'hidden sm:table-cell'}`}
                  style={column.sortable && !isDefaultSort && sortKey === column.key ? {
                    fontFamily: 'var(--font-dm-mono), monospace',
                    color: accentColor,
                    boxShadow: `inset 0 -2px 0 ${accentColor}`,
                  } : {
                    fontFamily: 'var(--font-dm-mono), monospace',
                    color: '#9a9894',
                  }}
                >
                  <span className={`inline-grid w-full items-center gap-x-1 ${column.tooltip ? 'grid-cols-[auto_auto_0.75rem]' : 'grid-cols-[auto_0.75rem]'} ${isPlayerColumn ? 'justify-start' : 'justify-center'}`}>
                    <span>{column.label}</span>
                    {column.tooltip && <HeaderTooltip text={column.tooltip} />}
                    {column.sortable && (
                      <span
                        className="inline-flex w-[0.75rem] items-center justify-center text-[9px] transition-colors duration-150"
                        style={{ color: !isDefaultSort && sortKey === column.key ? accentColor : 'transparent' }}
                        aria-hidden={isDefaultSort || sortKey !== column.key}
                      >
                        {sortDir === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </span>
                </th>
              )
            })}
            {enableCompare && <th className="w-8" />}
            {enablePlayerDetails && <th className="w-8 sm:w-10 pr-3 sm:pr-8" />}
          </tr>
        </thead>
        <tbody
          style={{
            opacity: tbodyOpacity,
            transition: 'opacity 150ms ease-in-out',
          }}
        >
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1 + (enableCompare ? 1 : 0) + (enablePlayerDetails ? 1 : 0)}
                className="px-3 sm:px-8 py-8 text-center text-[13px]"
                style={{ color: '#9a9894' }}
              >
                No players match &ldquo;{deferredSearchQuery.trim()}&rdquo;.
              </td>
            </tr>
          )}

          {sorted.map(row => (
            <Fragment key={row.playerId}>
              <PlayerRow
                row={row}
                columns={columns}
                position={originalRankMap.get(row.playerId) ?? 0}
                isExpanded={expandedId === row.playerId}
                isWinningTeam={teamBased ? row.team.name === winningTeamName : row.playerId === heroRow?.playerId}
                leaderStatValue={leaderStatValue}
                accentColor={accentColor}
                defaultSortKey={defaultSortKey}
                hasTeams={teamBased}
                onToggle={enablePlayerDetails ? () => handleToggle(row.playerId) : undefined}
                interactive={enablePlayerDetails}
                inBasket={enableCompare ? inBasket(basketKey({ playerId: row.playerId, sport, competition, year })) : false}
                onToggleCompare={enableCompare ? () => handleToggleCompare(row) : undefined}
              />
              <AnimatePresence>
                {enablePlayerDetails && expandedId === row.playerId && (
                  <PlayerExpandedStats
                    stats={expandedStats}
                    loading={loadingId === row.playerId}
                    chartConfig={chartConfig}
                    accentColor={accentColor}
                    leagueValues={leagueValues}
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
