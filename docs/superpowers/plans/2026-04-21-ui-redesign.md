# SportVault UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the editorial dark UI redesign (The Athletic / F1TV aesthetic) across the full SportVault app per the spec at `docs/superpowers/specs/2026-04-20-ui-redesign-design.md`.

**Architecture:** Replace existing zinc-palette ad-hoc styling with a consistent design system using Sora + JetBrains Mono + Inter fonts, a defined color palette, sport accent colors, amber sort highlight, and hero strip. The leaderboard shell, row design, expanded row, and competition/year selectors all get redesigned in place — no new routing or API changes needed.

**Tech Stack:** Next.js 16, Tailwind CSS v4, `next/font/google` (Sora, JetBrains Mono, Inter), Recharts (existing), TypeScript.

---

## File Map — Created / Modified

| File | Action | Responsibility |
|------|--------|----------------|
| `app/globals.css` | Modify | CSS variables for palette, font vars |
| `app/layout.tsx` | Modify | Load Sora + JetBrains Mono + Inter fonts; redesigned header |
| `components/layout/SportTabs.tsx` | Modify | Accent-color active underline, typography-only tabs |
| `components/layout/CompetitionSelector.tsx` | Modify | Plain text links, accent underline, `●` disabled prefix |
| `components/layout/YearSelector.tsx` | Modify | Inline pill row (not sidebar), JetBrains Mono, ◄► chevrons |
| `components/leaderboard/HeroStrip.tsx` | **Create** | Season leader strip — static, never reacts to sort |
| `components/leaderboard/LeaderboardTable.tsx` | Modify | Integrate HeroStrip, amber sort highlight, sticky header, bar behind rows |
| `components/leaderboard/PlayerRow.tsx` | Modify | 3px left border, position in JetBrains Mono, Sora name, stat bars |
| `components/leaderboard/PlayerExpandedStats.tsx` | Modify | Stat cards redesign, chart toggle only for F1, `+ Compare` placeholder |
| `app/[sport]/[competition]/[year]/page.tsx` | Modify | Remove sidebar layout, inline YearSelector above table |
| `config/f1.config.ts` | Modify | Add `accentColor` field (sport configs) |
| `config/soccer.config.ts` | Modify | Add `accentColor` field |
| `config/nfl.config.ts` | Modify | Add `accentColor` field |
| `config/nba.config.ts` | Modify | Add `accentColor` field |
| `types/sport-config.ts` | Modify | Add `accentColor: string` to `SportConfig` |

---

## Task 1: Design Tokens — Fonts + CSS Variables

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add Sora, JetBrains Mono, Inter to layout.tsx**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Sora, JetBrains_Mono, Inter } from 'next/font/google'
import { SportTabs } from '@/components/layout/SportTabs'
import './globals.css'

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'SportVault',
  description: 'Historical sports data — F1, Soccer, NFL, NBA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${mono.variable} ${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-sv-bg font-inter text-sv-text-primary antialiased">
        <header className="sticky top-0 z-10 bg-sv-bg/95 backdrop-blur">
          <div className="flex items-center justify-between px-6 h-12">
            <span className="font-sora text-lg font-bold tracking-tight text-sv-text-primary">SPORTVAULT</span>
            <SportTabs />
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Replace globals.css with design token variables**

```css
/* app/globals.css */
@import "tailwindcss";

@theme inline {
  /* Background layers */
  --color-sv-bg:          #080808;
  --color-sv-surface:     #111111;
  --color-sv-surface-raised: #1a1a1a;
  --color-sv-divider:     #1c1c1c;

  /* Text */
  --color-sv-text-primary:   #f0f0f0;
  --color-sv-text-secondary: #888888;
  --color-sv-text-muted:     #444444;

  /* Semantic */
  --color-sv-positive:   #27ae60;
  --color-sv-negative:   #c0392b;
  --color-sv-amber:      #f5a623;

  /* Sport accents */
  --color-sv-f1:     #E10600;
  --color-sv-soccer: #00B04F;
  --color-sv-nfl:    #013369;
  --color-sv-nba:    #C9082A;

  /* Fonts */
  --font-sora:  var(--font-sora);
  --font-inter: var(--font-inter);
  --font-mono:  var(--font-mono);
}

body {
  background-color: #080808;
  color: #f0f0f0;
}
```

- [ ] **Step 3: Verify dev server starts without errors**

```bash
cd sportvault && npm run dev
```

Expected: No compilation errors. App loads at http://localhost:3000.

---

## Task 2: Add `accentColor` to SportConfig

**Files:**
- Modify: `types/sport-config.ts`
- Modify: `config/f1.config.ts`
- Modify: `config/soccer.config.ts`
- Modify: `config/nfl.config.ts`
- Modify: `config/nba.config.ts`

- [ ] **Step 1: Add field to SportConfig type**

In `types/sport-config.ts`, add `accentColor: string` to the `SportConfig` interface:

```typescript
export interface SportConfig {
  slug: string
  name: string
  icon: string
  accentColor: string   // ← add this
  competitions: CompetitionConfig[]
  leaderboardColumns: ColumnDef[]
  defaultSortKey: string
  expandedChartConfig: ChartConfig
  rankingLabel: string
  hasTeams: boolean
  hasPositionFilter: boolean
  positionGroups?: PositionGroupConfig[]
}
```

- [ ] **Step 2: Add accentColor to each sport config**

In `config/f1.config.ts`, add `accentColor: '#E10600'` to the exported config object.
In `config/soccer.config.ts`, add `accentColor: '#00B04F'`.
In `config/nfl.config.ts`, add `accentColor: '#013369'`.
In `config/nba.config.ts`, add `accentColor: '#C9082A'`.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 3: Redesign Sport Tabs (Header)

**Files:**
- Modify: `components/layout/SportTabs.tsx`

- [ ] **Step 1: Rewrite SportTabs**

```typescript
// components/layout/SportTabs.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SPORT_CONFIGS } from '@/config/sports'

export function SportTabs() {
  const pathname = usePathname()
  const activeSport = pathname.split('/')[1]

  return (
    <nav className="flex items-center gap-4">
      {SPORT_CONFIGS.map((sport, i) => {
        const isActive = activeSport === sport.slug
        return (
          <span key={sport.slug} className="flex items-center gap-4">
            {i > 0 && <span className="text-sv-text-muted select-none">·</span>}
            <Link
              href={`/${sport.slug}`}
              className="flex items-center gap-1.5 pb-0.5 text-sm font-medium font-inter transition-colors"
              style={isActive ? {
                color: sport.accentColor,
                borderBottom: `2px solid ${sport.accentColor}`,
              } : {
                color: '#888888',
              }}
            >
              <span className="text-xs">{sport.icon}</span>
              {sport.name}
            </Link>
          </span>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 4: Redesign Competition Tabs

**Files:**
- Modify: `components/layout/CompetitionSelector.tsx`

- [ ] **Step 1: Rewrite CompetitionSelector**

```typescript
// components/layout/CompetitionSelector.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SportConfig } from '@/types/sport-config'

interface CompetitionSelectorProps {
  sportConfig: SportConfig
  defaultYear: number
  seededSlugs?: string[]
}

export function CompetitionSelector({ sportConfig, defaultYear, seededSlugs }: CompetitionSelectorProps) {
  const pathname = usePathname()
  const activeCompetition = pathname.split('/')[2]
  const accent = sportConfig.accentColor

  return (
    <div className="flex items-center gap-6 border-b border-sv-divider px-6 h-10">
      {sportConfig.competitions.map(comp => {
        const isActive = activeCompetition === comp.slug
        const isDisabled = !!seededSlugs && !seededSlugs.includes(comp.slug)

        if (isDisabled) {
          return (
            <span
              key={comp.slug}
              className="flex items-center gap-1 text-sm font-inter text-sv-text-muted cursor-not-allowed select-none"
              title="No data available"
            >
              <span>●</span>
              {comp.name}
            </span>
          )
        }

        return (
          <Link
            key={comp.slug}
            href={`/${sportConfig.slug}/${comp.slug}/${defaultYear}`}
            className="flex items-center pb-0.5 text-sm font-inter transition-colors"
            style={isActive ? {
              color: '#f0f0f0',
              borderBottom: `2px solid ${accent}`,
            } : {
              color: '#888888',
            }}
          >
            {comp.name}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 5: Redesign Year Selector (Inline Pill Row)

**Files:**
- Modify: `components/layout/YearSelector.tsx`
- Modify: `app/[sport]/[competition]/[year]/page.tsx`

- [ ] **Step 1: Rewrite YearSelector as inline row (not sidebar)**

```typescript
// components/layout/YearSelector.tsx
'use client'

import Link from 'next/link'
import type { SeasonMeta } from '@/types/api'

interface YearSelectorProps {
  seasons: SeasonMeta[]
  activeYear: number
  sport: string
  competition: string
  accentColor: string
}

export function YearSelector({ seasons, activeYear, sport, competition, accentColor }: YearSelectorProps) {
  return (
    <div className="flex items-center justify-end gap-3 px-6 py-2">
      {seasons.map(s => {
        const isActive = s.year === activeYear
        const isDisabled = s.status !== 'completed'

        if (isDisabled) {
          return (
            <span key={s.year} className="font-mono text-sm text-sv-text-muted cursor-not-allowed select-none">
              {s.label}
            </span>
          )
        }

        return (
          <Link
            key={s.year}
            href={`/${sport}/${competition}/${s.year}`}
            className="font-mono text-sm transition-colors"
            style={isActive ? { color: '#f0f0f0' } : { color: '#444444' }}
          >
            {s.label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Update LeaderboardPage to use inline layout**

Replace the current flex-with-sidebar layout in `app/[sport]/[competition]/[year]/page.tsx`:

```typescript
// app/[sport]/[competition]/[year]/page.tsx
import { notFound } from 'next/navigation'
import { getSportConfig } from '@/config/sports'
import { prisma } from '@/lib/db'
import { CompetitionSelector } from '@/components/layout/CompetitionSelector'
import { YearSelector } from '@/components/layout/YearSelector'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { getCached, standingsKey, TTL } from '@/lib/cache'
import { getF1Standings } from '@/lib/queries/f1'
import { getSoccerStandings } from '@/lib/queries/soccer'
import { getNflStandings } from '@/lib/queries/nfl'
import { getNbaStandings } from '@/lib/queries/nba'
import type { SeasonMeta } from '@/types/api'

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ sport: string; competition: string; year: string }>
}) {
  const { sport, competition, year: yearStr } = await params
  const year = Number(yearStr)

  const config = getSportConfig(sport)
  if (!config) notFound()

  const [seasonsRaw, seededComps] = await Promise.all([
    prisma.season.findMany({
      where: { competition: { slug: competition } },
      orderBy: { year: 'desc' },
    }),
    prisma.competition.findMany({
      where: { sport: { slug: sport }, seasons: { some: {} } },
      select: { slug: true },
    }),
  ])
  const seededSlugs = seededComps.map(c => c.slug)

  let standingsData
  try {
    standingsData = await getCached(
      standingsKey(sport, competition, year),
      () => {
        switch (sport) {
          case 'f1': return getF1Standings(year)
          case 'soccer': return getSoccerStandings(competition, year)
          case 'nfl': return getNflStandings(competition, year)
          case 'nba': return getNbaStandings(competition, year)
          default: throw new Error('Unknown sport')
        }
      },
      TTL.HISTORICAL
    )
  } catch {
    notFound()
  }

  const seasons: SeasonMeta[] = seasonsRaw.map(s => ({
    year: s.year,
    label: s.label ?? String(s.year),
    status: s.status as SeasonMeta['status'],
  }))

  return (
    <div className="flex flex-1 flex-col">
      <CompetitionSelector sportConfig={config} defaultYear={year} seededSlugs={seededSlugs} />
      <YearSelector
        seasons={seasons}
        activeYear={year}
        sport={sport}
        competition={competition}
        accentColor={config.accentColor}
      />
      <div className="flex-1 overflow-y-auto">
        <LeaderboardTable
          data={standingsData!}
          sport={sport}
          competition={competition}
          year={year}
          chartConfig={config.expandedChartConfig}
          accentColor={config.accentColor}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: Will show error that `LeaderboardTable` doesn't accept `accentColor` yet — fix in next task.

---

## Task 6: Redesign Column Headers + Sort Highlight

**Files:**
- Modify: `components/leaderboard/LeaderboardTable.tsx`

The `LeaderboardTable` needs:
- `accentColor` prop threaded through
- Column headers: all-caps 11px, letter-spacing, text-muted; active sort = thin accent underline (not arrow)
- Sticky header
- Amber rule: top value in active sort column gets `color: #f5a623`
- NFl disclaimer styled to new muted style

- [ ] **Step 1: Rewrite LeaderboardTable**

```typescript
// components/leaderboard/LeaderboardTable.tsx
'use client'

import { useState, useCallback, Fragment } from 'react'
import { PlayerRow } from './PlayerRow'
import { PlayerExpandedStats } from './PlayerExpandedStats'
import { HeroStrip } from './HeroStrip'
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
  const defaultSort = data.columns.find(c => c.sortable)?.key ?? ''
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedStats, setExpandedStats] = useState<PlayerStatsResponse | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState(defaultSort)
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

  // Amber rule: index 0 in sorted order is the leader for active sort
  const leaderId = sortDir === 'desc' ? sorted[0]?.playerId : sorted[sorted.length - 1]?.playerId

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

  // Hero strip always uses default sort (first row from data as received)
  const heroRow = data.rows[0]

  return (
    <div>
      {heroRow && (
        <HeroStrip
          row={heroRow}
          sport={sport}
          accentColor={accentColor}
        />
      )}
      {sport === 'nfl' && (
        <p className="px-6 pt-2 text-[11px] text-sv-text-muted">
          Stats sourced from Next Gen Stats (NGS) — may differ slightly from official NFL box scores.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="sticky top-[88px] z-10 bg-sv-bg">
            <tr className="border-b border-sv-divider">
              {data.columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-sv-text-muted ${col.sortable ? 'cursor-pointer select-none hover:text-sv-text-secondary' : ''}`}
                  style={col.sortable && sortKey === col.key ? {
                    borderBottom: `2px solid ${accentColor}`,
                    color: '#888888',
                  } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <Fragment key={row.playerId}>
                <PlayerRow
                  row={row}
                  columns={data.columns}
                  position={index + 1}
                  isExpanded={expandedId === row.playerId}
                  isAmberLeader={row.playerId === leaderId}
                  amberStatKey={sortKey}
                  leaderStatValue={Number(sorted[0]?.stats[sortKey] ?? 0)}
                  onToggle={() => handleToggle(row.playerId)}
                  accentColor={accentColor}
                />
                {expandedId === row.playerId && (
                  <PlayerExpandedStats
                    stats={expandedStats}
                    loading={loadingId === row.playerId}
                    chartConfig={chartConfig}
                    accentColor={accentColor}
                    onClose={() => { setExpandedId(null); setExpandedStats(null) }}
                  />
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: Errors for missing `HeroStrip`, and updated `PlayerRow`/`PlayerExpandedStats` props. These are fixed in subsequent tasks — note them, continue.

---

## Task 7: Create HeroStrip Component

**Files:**
- Create: `components/leaderboard/HeroStrip.tsx`

The hero strip shows the default-sort leader. It is **static** — never changes when the user re-sorts. It receives `data.rows[0]` (default server sort order).

Per-sport hero stats per spec:
- F1: `points` (primary) · Wins · Pole Positions
- Soccer: `goals` (primary) · Assists · Apps
- NFL QB: `passing_yards` (primary) · TDs · INTs
- NBA: `pointsPerGame` (primary) · RPG · APG

- [ ] **Step 1: Create HeroStrip.tsx**

```typescript
// components/leaderboard/HeroStrip.tsx
import type { LeaderboardRow } from '@/types/api'

interface HeroStripProps {
  row: LeaderboardRow
  sport: string
  accentColor: string
}

const heroStatsBySport: Record<string, { primary: string; label: string; secondary: Array<{ key: string; label: string }> }> = {
  f1: { primary: 'points', label: 'PTS', secondary: [{ key: 'wins', label: 'W' }, { key: 'poles', label: 'PP' }] },
  soccer: { primary: 'goals', label: 'G', secondary: [{ key: 'assists', label: 'A' }, { key: 'appearances', label: 'Apps' }] },
  nfl: { primary: 'passing_yards', label: 'Pass YDS', secondary: [{ key: 'passing_tds', label: 'TD' }, { key: 'interceptions', label: 'INT' }] },
  nba: { primary: 'pointsPerGame', label: 'PPG', secondary: [{ key: 'reboundsPerGame', label: 'RPG' }, { key: 'assistsPerGame', label: 'APG' }] },
}

export function HeroStrip({ row, sport, accentColor }: HeroStripProps) {
  const config = heroStatsBySport[sport]
  if (!config) return null

  const primaryVal = row.stats[config.primary]

  return (
    <div
      className="flex items-center gap-4 px-6 h-14 border-b border-sv-divider"
      style={{ background: `radial-gradient(ellipse at left, ${accentColor}0f 0%, transparent 60%)` }}
    >
      <span className="font-mono text-sm text-sv-text-muted">◉ P1</span>
      <span className="font-sora text-lg font-bold text-sv-text-primary tracking-tight">{row.name}</span>
      <span className="text-sm text-sv-text-secondary">{row.team.shortName}</span>
      <span className="mx-1 text-sv-text-muted">·</span>
      <span className="font-mono text-sm text-sv-text-primary font-medium">
        {primaryVal ?? '—'} <span className="text-sv-text-muted">{config.label}</span>
      </span>
      {config.secondary.map(s => {
        const val = row.stats[s.key]
        return (
          <span key={s.key} className="flex items-center gap-1">
            <span className="text-sv-text-muted">·</span>
            <span className="font-mono text-sm text-sv-text-secondary">
              {val ?? '—'} <span className="text-sv-text-muted">{s.label}</span>
            </span>
          </span>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors from this file (errors may remain for PlayerRow/PlayerExpandedStats props).

---

## Task 8: Redesign PlayerRow

**Files:**
- Modify: `components/leaderboard/PlayerRow.tsx`

New row design:
- 3px left border in team color
- Position: JetBrains Mono, text-muted (e.g. `P1` for F1, `1` for others)
- Player name: Sora semibold, text-primary
- Team: Inter, text-secondary, smaller
- Stats: JetBrains Mono, right-aligned
- Active sort stat amber if this is the leader
- Bar behind row scaled to leader value (team color 15% opacity) — implemented as a background gradient
- Row separator: `#1c1c1c`
- Hover: surface-raised `#1a1a1a`, 150ms

- [ ] **Step 1: Rewrite PlayerRow**

```typescript
// components/leaderboard/PlayerRow.tsx
'use client'

import type { ColumnDef } from '@/types/sport-config'
import type { LeaderboardRow } from '@/types/api'

interface PlayerRowProps {
  row: LeaderboardRow
  columns: ColumnDef[]
  position: number
  isExpanded: boolean
  isAmberLeader: boolean
  amberStatKey: string
  leaderStatValue: number
  accentColor: string
  onToggle: () => void
}

export function PlayerRow({
  row, columns, position, isExpanded, isAmberLeader, amberStatKey, leaderStatValue, accentColor, onToggle
}: PlayerRowProps) {
  const color = row.team.colorPrimary

  // Bar behind row: scale to leader's primary stat value
  const primaryStatKey = columns.find(c => c.sortable)?.key ?? ''
  const primaryVal = Number(row.stats[primaryStatKey] ?? 0)
  const barWidth = leaderStatValue > 0 ? Math.round((primaryVal / leaderStatValue) * 100) : 0

  return (
    <tr
      className="group relative cursor-pointer transition-colors duration-150"
      style={{
        borderLeft: `3px solid ${color}`,
        borderBottom: '1px solid #1c1c1c',
        backgroundColor: isExpanded ? '#1a1a1a' : undefined,
      }}
      onClick={onToggle}
      onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.backgroundColor = '#1a1a1a' }}
      onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
    >
      {/* Background bar */}
      {barWidth > 0 && (
        <td
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
            opacity: 0.07,
          }}
        />
      )}

      {columns.map(col => {
        const isAmber = isAmberLeader && col.key === amberStatKey
        const isPlayerCol = col.key === 'driver' || col.key === 'player'
        const isTeamCol = col.key === 'team'

        if (isPlayerCol) {
          return (
            <td key={col.key} className="px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-sora text-sm font-semibold text-sv-text-primary leading-tight">{row.name}</span>
                <span className="font-inter text-xs text-sv-text-secondary">{row.team.shortName ?? row.team.name}</span>
              </div>
            </td>
          )
        }

        if (isTeamCol) {
          return (
            <td key={col.key} className="px-4 py-3">
              <span className="font-inter text-sm text-sv-text-secondary">{row.team.shortName ?? row.team.name}</span>
            </td>
          )
        }

        // Position column
        if (col.key === 'position' || col.key === '#') {
          return (
            <td key={col.key} className="px-4 py-3">
              <span className="font-mono text-sm text-sv-text-muted">{position}</span>
            </td>
          )
        }

        return (
          <td key={col.key} className="px-4 py-3 text-right">
            <span
              className="font-mono text-sm"
              style={{ color: isAmber ? '#f5a623' : '#f0f0f0' }}
            >
              {row.stats[col.key] ?? '—'}
            </span>
          </td>
        )
      })}

      {/* Expand chevron */}
      <td className="px-4 py-3 text-right w-8">
        <span className="font-mono text-sm text-sv-text-muted transition-transform duration-200" style={{ display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : '' }}>›</span>
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors from this file.

---

## Task 9: Redesign PlayerExpandedStats

**Files:**
- Modify: `components/leaderboard/PlayerExpandedStats.tsx`

New expanded row design:
- `#1a1a1a` bg
- Stat cards: `#1a1a1a` bg, label 10px all-caps text-muted, value JetBrains Mono 18px
- Chart: full width, `#1c1c1c` top divider, chart title 11px all-caps left, toggle right (F1 only)
- `+ Compare` placeholder bottom-right (disabled)
- `accentColor` prop threaded to chart toggle active state

- [ ] **Step 1: Rewrite PlayerExpandedStats**

```typescript
// components/leaderboard/PlayerExpandedStats.tsx
'use client'

import { useState } from 'react'
import type { PlayerStatsResponse } from '@/types/api'
import type { ChartConfig } from '@/types/sport-config'
import { F1SeasonLineChart } from '@/components/charts/F1SeasonLineChart'
import { StatsRadarChart } from '@/components/charts/StatsRadarChart'
import { StatsBarChart } from '@/components/charts/StatsBarChart'
import { NflQbScatterChart } from '@/components/charts/NflQbScatterChart'
import { NflWeeklyBarChart } from '@/components/charts/NflWeeklyBarChart'

interface PlayerExpandedStatsProps {
  stats: PlayerStatsResponse | null
  loading: boolean
  chartConfig: ChartConfig
  accentColor: string
  onClose: () => void
}

export function PlayerExpandedStats({ stats, loading, chartConfig, accentColor, onClose }: PlayerExpandedStatsProps) {
  const [chartMode, setChartMode] = useState<'pts' | 'pos'>('pts')

  return (
    <tr>
      <td colSpan={99} style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #1c1c1c' }}>
        <div className="px-6 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-sv-text-muted">
              <span className="animate-pulse">Loading...</span>
            </div>
          )}
          {stats && !loading && (
            <div>
              {/* Stat cards */}
              <div className="mb-5 flex flex-wrap gap-2">
                {Object.entries(stats.summaryStats)
                  .filter(([, v]) => v !== 0 && v !== null && v !== undefined)
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="flex flex-col items-center rounded px-3 py-2 min-w-[64px]"
                      style={{ backgroundColor: '#111111' }}
                    >
                      <span className="text-[10px] uppercase tracking-widest text-sv-text-muted">{k.replace(/_/g, ' ')}</span>
                      <span className="mt-1 font-mono text-lg font-medium text-sv-text-primary">{v}</span>
                    </div>
                  ))}
              </div>

              {/* Chart area */}
              <div style={{ borderTop: '1px solid #1c1c1c' }} className="pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-sv-text-muted">
                    {chartConfig.label}
                  </span>
                  <div className="flex items-center gap-4">
                    {/* F1-only dual mode toggle */}
                    {chartConfig.dualMode && (
                      <div className="flex gap-1">
                        {(['pts', 'pos'] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setChartMode(mode)}
                            className="px-2 py-0.5 text-xs font-mono uppercase transition-colors"
                            style={{
                              color: chartMode === mode ? accentColor : '#444444',
                              borderBottom: chartMode === mode ? `1px solid ${accentColor}` : 'none',
                            }}
                          >
                            {mode === 'pts' ? 'Pts' : 'Pos'}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      className="text-xs text-sv-text-muted cursor-not-allowed opacity-40"
                      disabled
                      title="Coming soon"
                    >
                      + Compare
                    </button>
                  </div>
                </div>

                {/* F1 line chart */}
                {stats.chartData.length > 0 && chartConfig.type === 'line' && (
                  <F1SeasonLineChart
                    data={stats.chartData}
                    teamColor={stats.team.colorPrimary}
                    driverName={stats.name}
                    dualMode={chartMode === 'pos'}
                  />
                )}

                {/* NBA radar */}
                {chartConfig.type === 'line+radar' && (
                  <StatsRadarChart
                    summaryStats={stats.summaryStats}
                    teamColor={stats.team.colorPrimary}
                    name={stats.name}
                  />
                )}

                {/* NFL: weekly bar (primary) + scatter (below) */}
                {chartConfig.type === 'bar' && stats.chartData.length > 0 && (
                  <NflWeeklyBarChart
                    data={stats.chartData as { label: string; value: number }[]}
                    teamColor={stats.team.colorPrimary}
                    statLabel={stats.scatterData ? 'Pass Yds' : 'Yds'}
                    name={stats.name}
                  />
                )}
                {chartConfig.type === 'bar' && stats.chartData.length === 0 && !stats.scatterData && (
                  <StatsBarChart
                    summaryStats={stats.summaryStats}
                    teamColor={stats.team.colorPrimary}
                    name={stats.name}
                  />
                )}
                {stats.scatterData && stats.scatterData.length > 0 && stats.scatterAxes && (
                  <NflQbScatterChart
                    data={stats.scatterData}
                    axes={stats.scatterAxes}
                    selectedName={stats.name}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 10: F1SeasonLineChart — Pass dualMode as boolean correctly

**Files:**
- Modify: `components/charts/F1SeasonLineChart.tsx`

In Task 9 we changed the toggle to pass `dualMode={chartMode === 'pos'}` (boolean) rather than the `chartConfig.dualMode` capability flag. Verify the chart prop accepts `dualMode?: boolean` and that the `dualMode` prop is used to switch between cumulative points vs finish position data.

- [ ] **Step 1: Read F1SeasonLineChart and verify dualMode prop type**

```bash
grep -n "dualMode" sportvault/components/charts/F1SeasonLineChart.tsx
```

If `dualMode?: boolean` is already the type and the chart branches on it, no change needed.

If `dualMode` is `boolean | undefined` but only used as a capability flag, update the component so that `dualMode === true` means "show position mode" and `false/undefined` means "show cumulative points mode".

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 11: Remove TeamColorDot (Unused After Redesign)

**Files:**
- Modify: `components/leaderboard/PlayerRow.tsx` (verify no import)
- The `TeamColorDot` component is no longer used — the 3px border on the row replaces it.

- [ ] **Step 1: Confirm TeamColorDot is not imported anywhere**

```bash
grep -r "TeamColorDot" sportvault/components/
```

If only in its own file, it's safe to leave (tree-shaken). No deletion needed — avoid removing files without confirmation.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 12: End-to-End Visual QA

**Files:** None (verification only)

- [ ] **Step 1: Start dev server and open app**

```bash
cd sportvault && npm run dev
```

Open http://localhost:3000.

- [ ] **Step 2: Verify header**

- SPORTVAULT text in Sora bold, left
- Sport tabs right: `🏎️ F1 · ⚽ Soccer · 🏈 NFL · 🏀 NBA`
- Active sport has accent-color text + 2px underline
- Inactive tabs are text-muted (#888888)

- [ ] **Step 3: Verify competition tabs**

- Plain text links, no pills
- Active competition has 2px accent underline
- Disabled competition has `●` prefix and is muted/unclickable

- [ ] **Step 4: Verify year selector**

- Inline row, right-aligned above table
- Numbers in JetBrains Mono
- Active year is text-primary, others muted

- [ ] **Step 5: Verify hero strip**

- Shows P1 + player name + team + primary stat · secondary · secondary
- Background is barely-there radial gradient wash in sport accent color
- Stat labels in text-muted after the values

- [ ] **Step 6: Verify leaderboard table**

- Column headers all-caps 11px with letter-spacing
- Active sort column has accent-color underline (not arrow)
- Top row in active sort column shows amber value (`#f5a623`)
- Rows have 3px left border in team color
- Player name in Sora, stats in JetBrains Mono
- Row separator is `#1c1c1c`
- Hover → `#1a1a1a` background

- [ ] **Step 7: Verify expanded row (click a player)**

- `#1a1a1a` background
- Stat cards: small label + large mono value
- Chart area with `#1c1c1c` top divider
- F1: Pts/Pos toggle buttons in accent color when active
- Other sports: no toggle shown
- `+ Compare` visible but disabled (greyed out)

- [ ] **Step 8: Test all four sports**

Navigate to F1, Soccer, NFL, NBA. Verify accent colors switch correctly (red, green, navy, red). Verify hero strip shows correct primary stat per sport.

---

## Self-Review Against Spec

### Spec Coverage Check

| Spec section | Task |
|---|---|
| Typography: Sora/JetBrains Mono/Inter | Task 1 |
| Color palette CSS vars | Task 1 |
| Sport accent colors | Task 2 |
| Header: SPORTVAULT + tab layout | Task 1 + Task 3 |
| Sport tabs: accent underline, `·` dividers | Task 3 |
| Competition tabs: plain text, accent underline, `●` disabled | Task 4 |
| Year selector: inline pill row, JetBrains Mono | Task 5 |
| Hero strip: P1, name, stats, static | Task 7 |
| Hero strip: per-sport stats | Task 7 |
| Column headers: 11px all-caps letter-spacing | Task 6 |
| Active sort: accent underline (not arrow) | Task 6 |
| Amber rule: exactly one value per table, follows sort | Task 6 + 8 |
| Row: 3px team color border | Task 8 |
| Row: position in mono, name in Sora, stats right-aligned | Task 8 |
| Row: bar behind row at 15% team color | Task 8 |
| Row: hover #1a1a1a 150ms | Task 8 |
| Row separator #1c1c1c | Task 8 |
| Expanded: stat cards #1a1a1a bg | Task 9 |
| Expanded: chart title 11px all-caps | Task 9 |
| Expanded: F1-only dual mode toggle | Task 9 |
| Expanded: + Compare disabled | Task 9 |
| F1 dualMode wiring | Task 10 |

### Out of Scope (per spec)
- Mobile responsive polish
- Player profile pages
- Search/filter
- Auth
- Skeleton shimmer states (mentioned in spec but no chart/table exists in skeleton; deferred)
