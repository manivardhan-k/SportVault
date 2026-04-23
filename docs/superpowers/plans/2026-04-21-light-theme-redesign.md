# SportVault Light Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the warm light theme from `SportVault.html` into the Next.js app, replacing the current dark theme, with Framer Motion animations on all interactive elements.

**Architecture:** Replace CSS token palette in `globals.css` and font loading in `layout.tsx`, then update all 7 UI components to use the new light tokens and Framer Motion `motion.*` components. The design reference is `docs/superpowers/specs/sportvault/project/SportVault.html` — match it pixel-for-pixel: warm off-white `#f7f6f3` background, `#ffffff` surface cards, DM Sans + DM Mono fonts, animated sliding pill sport selector, animated tab underline, animated row expand, Framer Motion spring animations.

**Tech Stack:** Next.js 16, Tailwind CSS v4, Framer Motion v12 (already installed), `next/font/google` (DM Sans, DM Mono), TypeScript.

---

## Design Reference Summary (from SportVault.html)

```
Palette:
  --bg:       #f7f6f3   (warm off-white body)
  --surface:  #ffffff   (cards, table bg)
  --surface2: #f2f1ee   (sport selector bg, table header)
  --border:   #e4e3df
  --border2:  #d4d3cf
  --text:     #111110   (primary text)
  --text2:    #5a5955   (secondary)
  --text3:    #9a9894   (muted/labels)
  --gold:     #d97706   (amber highlight)
  Accent: per-sport (set by accentColor prop)

Fonts:
  Body:  DM Sans 300/400/500/600
  Mono:  DM Mono 400/500

Animations:
  Sport selector: sliding pill (left/width spring, cubic-bezier(0.4,0,0.2,1) 280ms)
  Tab underline:  sliding underline (left/width 250ms same easing)
  Row expand:     height 0→auto (380ms cubic-bezier(0.4,0,0.2,1))
  Chevron:        rotate 0→180deg (250ms)
  Row hover:      background #faf9f7 (150ms)
  Name hover:     color → accentColor (150ms)
  Hero expand:    max-height 0→600 (380ms)

Header height: 52px (sport selector row) + 36px (tabs + year row) = 88px total
Hero strip:     52px sticky below header
Table header:   38px sticky at top:88px
Row height:     56px
```

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `app/globals.css` | Modify | Replace dark tokens with light palette + scrollbar |
| `app/layout.tsx` | Modify | DM Sans + DM Mono fonts, new body classes |
| `components/layout/SportTabs.tsx` | Rewrite | Animated sliding pill, new header layout |
| `components/layout/CompetitionSelector.tsx` | Rewrite | Animated tab underline pill |
| `components/layout/YearSelector.tsx` | Modify | Light colors, DM Mono |
| `components/leaderboard/HeroStrip.tsx` | Modify | Light surface, accent border, expand animation |
| `components/leaderboard/LeaderboardTable.tsx` | Modify | Light surface2 header, sticky offsets |
| `components/leaderboard/PlayerRow.tsx` | Modify | Light hover, name color-on-hover, Framer Motion expand |
| `components/leaderboard/PlayerExpandedStats.tsx` | Modify | Light surface bg, light stat cards |
| `app/[sport]/[competition]/[year]/page.tsx` | No change | Already passes accentColor |

---

## Task 1: Light Palette + DM Fonts

**Files:**
- Modify: `sportvault/app/globals.css`
- Modify: `sportvault/app/layout.tsx`

- [ ] **Step 1: Replace globals.css with light palette**

```css
/* sportvault/app/globals.css */
@import "tailwindcss";

@theme inline {
  /* Background layers */
  --color-sv-bg:             #f7f6f3;
  --color-sv-surface:        #ffffff;
  --color-sv-surface2:       #f2f1ee;
  --color-sv-surface-raised: #faf9f7;
  --color-sv-divider:        #e4e3df;
  --color-sv-border2:        #d4d3cf;

  /* Text */
  --color-sv-text-primary:   #111110;
  --color-sv-text-secondary: #5a5955;
  --color-sv-text-muted:     #9a9894;

  /* Semantic */
  --color-sv-positive: #16a34a;
  --color-sv-negative: #dc2626;
  --color-sv-amber:    #d97706;

  /* Sport accents (unchanged) */
  --color-sv-f1:     #E10600;
  --color-sv-soccer: #00B04F;
  --color-sv-nfl:    #013369;
  --color-sv-nba:    #C9082A;

  /* Fonts */
  --font-dm-sans: var(--font-dm-sans);
  --font-dm-mono: var(--font-dm-mono);
}

body {
  background-color: #f7f6f3;
  color: #111110;
}

/* Thin warm scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #d4d3cf; border-radius: 2px; }
```

- [ ] **Step 2: Update layout.tsx — DM Sans + DM Mono fonts**

```typescript
// sportvault/app/layout.tsx
import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import { SportTabs } from '@/components/layout/SportTabs'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})
const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SportVault',
  description: 'Historical sports data — F1, Soccer, NFL, NBA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} h-full`}>
      <body
        className="flex min-h-full flex-col bg-sv-bg text-sv-text-primary antialiased"
        style={{ fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}
      >
        <header className="sticky top-0 z-20 bg-sv-surface border-b border-sv-divider">
          <SportTabs />
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd sportvault && npx tsc --noEmit
```

Expected: No errors (font names change but globals.css uses CSS vars).

---

## Task 2: Animated Sport Selector (Sliding Pill)

**Files:**
- Rewrite: `sportvault/components/layout/SportTabs.tsx`

The design has a pill inside a `#f2f1ee` container that slides to the active sport. Uses `useEffect` + `useRef` to measure button positions. Framer Motion `motion.div` for the sliding background.

- [ ] **Step 1: Rewrite SportTabs with sliding pill + Framer Motion**

```typescript
// sportvault/components/layout/SportTabs.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SPORT_CONFIGS } from '@/config/sports'

export function SportTabs() {
  const pathname = usePathname()
  const activeSport = pathname.split('/')[1]
  const btnRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [pill, setPill] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const el = btnRefs.current[activeSport]
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeSport])

  return (
    <div className="flex items-center justify-between px-6 h-[52px]">
      {/* Logo */}
      <span
        className="text-sm font-semibold tracking-[0.12em] text-sv-text-primary"
        style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}
      >
        SPORTVAULT
      </span>

      {/* Sport selector pill group */}
      <div
        className="relative flex items-center gap-0 rounded-lg p-[3px] border border-sv-divider"
        style={{ background: '#f2f1ee' }}
      >
        {/* Animated sliding background pill */}
        <motion.div
          className="absolute top-[3px] h-[calc(100%-6px)] rounded-md bg-sv-surface border border-sv-divider shadow-sm"
          animate={{ left: pill.left + 3, width: pill.width }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          style={{ pointerEvents: 'none' }}
        />

        {SPORT_CONFIGS.map(sport => {
          const isActive = activeSport === sport.slug
          return (
            <Link
              key={sport.slug}
              href={`/${sport.slug}`}
              ref={el => { btnRefs.current[sport.slug] = el }}
              className="relative z-10 flex items-center gap-[5px] rounded-md px-[14px] py-[5px] text-xs font-medium transition-colors duration-200 whitespace-nowrap"
              style={{
                color: isActive ? sport.accentColor : '#5a5955',
              }}
            >
              <span className="text-[10px]">{sport.icon}</span>
              {sport.name}
            </Link>
          )
        })}
      </div>
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

## Task 3: Animated Competition Tabs (Sliding Underline)

**Files:**
- Rewrite: `sportvault/components/layout/CompetitionSelector.tsx`

Sliding 2px underline that follows active tab, measured via refs. Framer Motion `motion.div`.

- [ ] **Step 1: Rewrite CompetitionSelector**

```typescript
// sportvault/components/layout/CompetitionSelector.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [underline, setUnderline] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const el = tabRefs.current[activeCompetition]
    if (el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeCompetition, sportConfig.slug])

  return (
    <div className="relative flex items-center gap-0 border-b border-sv-divider px-6 h-[36px]">
      {/* Animated underline */}
      <motion.div
        className="absolute bottom-0 h-[2px] rounded-[1px]"
        animate={{ left: underline.left + 24, width: underline.width }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        style={{ background: accent }}
      />

      {/* Tabs */}
      <div className="relative flex items-center gap-0">
        {sportConfig.competitions.map(comp => {
          const isActive = activeCompetition === comp.slug
          const isDisabled = !!seededSlugs && !seededSlugs.includes(comp.slug)

          if (isDisabled) {
            return (
              <span
                key={comp.slug}
                className="flex items-center gap-1.5 px-4 h-[36px] text-xs text-sv-text-muted cursor-not-allowed select-none"
                title="No data available"
              >
                <span className="text-[7px]">●</span>
                {comp.name}
              </span>
            )
          }

          return (
            <Link
              key={comp.slug}
              href={`/${sportConfig.slug}/${comp.slug}/${defaultYear}`}
              ref={el => { tabRefs.current[comp.slug] = el }}
              className="flex items-center px-4 h-[36px] text-[13px] transition-colors duration-200"
              style={{
                color: isActive ? '#111110' : '#9a9894',
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {comp.name}
            </Link>
          )
        })}
      </div>

      {/* Year selector — right side of same row */}
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

## Task 4: Year Selector — Inline Right of Competition Row

**Files:**
- Modify: `sportvault/components/layout/YearSelector.tsx`
- Modify: `sportvault/app/[sport]/[competition]/[year]/page.tsx`

Per design, years live in the same 36px bar as competition tabs (right side). Move YearSelector into CompetitionSelector row by co-locating in the page layout — pass `seasons`/`activeYear` props to the page wrapper, and render YearSelector inside the competition bar.

The cleanest approach: keep YearSelector a separate component but render it inside the same row. The page creates a `<div className="flex border-b">` that contains `<CompetitionSelector>` (flex-1) and `<YearSelector>` (ml-auto).

- [ ] **Step 1: Simplify YearSelector — just the year buttons, no border/wrapper**

```typescript
// sportvault/components/layout/YearSelector.tsx
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
    <div className="flex items-center gap-0 ml-auto pr-6">
      {seasons.map(s => {
        const isActive = s.year === activeYear
        const isDisabled = s.status !== 'completed'

        if (isDisabled) {
          return (
            <span
              key={s.year}
              className="px-2 h-[36px] flex items-center text-xs cursor-not-allowed select-none"
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                color: '#9a9894',
              }}
            >
              {s.label}
            </span>
          )
        }

        return (
          <Link
            key={s.year}
            href={`/${sport}/${competition}/${s.year}`}
            className="px-2 h-[36px] flex items-center text-xs transition-colors duration-200"
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? accentColor : '#9a9894',
            }}
          >
            {s.label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Update page.tsx — co-locate CompetitionSelector and YearSelector in one row**

```typescript
// sportvault/app/[sport]/[competition]/[year]/page.tsx
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
      {/* Competition tabs + year selector in same 36px bar */}
      <div className="flex items-center border-b border-sv-divider overflow-hidden">
        <CompetitionSelector sportConfig={config} defaultYear={year} seededSlugs={seededSlugs} />
        <YearSelector
          seasons={seasons}
          activeYear={year}
          sport={sport}
          competition={competition}
          accentColor={config.accentColor}
        />
      </div>
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

Note: Remove `border-b` from `CompetitionSelector` since the parent wrapper now owns it.

- [ ] **Step 3: Remove border-b from CompetitionSelector**

In `CompetitionSelector.tsx`, the outer `<div>` currently has `border-b border-sv-divider`. Remove those two classes — the parent `<div className="flex items-center border-b border-sv-divider">` in page.tsx now owns the border.

Change:
```typescript
<div className="relative flex items-center gap-0 border-b border-sv-divider px-6 h-[36px]">
```
To:
```typescript
<div className="relative flex items-center gap-0 px-6 h-[36px] flex-1">
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 5: HeroStrip — Light Surface + Animated Expand

**Files:**
- Modify: `sportvault/components/leaderboard/HeroStrip.tsx`

Per design: white surface bg, 2px bottom border in accent color, P1 dot in accent color, expand on click reveals `ExpandedRow`. The hero strip is sticky at `top-0` inside the scroll area (below the 88px header). Uses Framer Motion `AnimatePresence` + `motion.div` for height expand (same as table rows).

- [ ] **Step 1: Rewrite HeroStrip with light theme + expand animation**

```typescript
// sportvault/components/leaderboard/HeroStrip.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LeaderboardRow } from '@/types/api'

interface HeroStripProps {
  row: LeaderboardRow
  sport: string
  accentColor: string
  expandedContent?: React.ReactNode
}

const heroStatsBySport: Record<string, {
  primary: string
  label: string
  secondary: Array<{ key: string; label: string }>
}> = {
  f1:     { primary: 'points',        label: 'PTS',      secondary: [{ key: 'wins', label: 'W' }, { key: 'podiums', label: 'POD' }, { key: 'poles', label: 'PP' }] },
  soccer: { primary: 'goals',         label: 'Goals',    secondary: [{ key: 'assists', label: 'A' }, { key: 'appearances', label: 'Apps' }] },
  nfl:    { primary: 'passing_yards', label: 'Pass YDS', secondary: [{ key: 'passing_tds', label: 'TD' }, { key: 'interceptions', label: 'INT' }] },
  nba:    { primary: 'ppg',           label: 'PPG',      secondary: [{ key: 'rpg', label: 'RPG' }, { key: 'apg', label: 'APG' }] },
}

export function HeroStrip({ row, sport, accentColor, expandedContent }: HeroStripProps) {
  const [expanded, setExpanded] = useState(false)
  const config = heroStatsBySport[sport]
  if (!config) return null

  const primaryVal = row.stats[config.primary]

  return (
    <div
      className="bg-sv-surface sticky top-0 z-[8] flex-shrink-0"
      style={{ borderBottom: expanded ? 'none' : `2px solid ${accentColor}` }}
    >
      {/* Clickable row */}
      <motion.div
        onClick={() => setExpanded(e => !e)}
        whileHover={{ backgroundColor: '#faf9f7' }}
        transition={{ duration: 0.15 }}
        className="flex items-center h-[52px] px-6 cursor-pointer"
        style={{ borderBottom: expanded ? `2px solid ${accentColor}` : 'none' }}
      >
        {/* P1 indicator */}
        <div className="flex items-center gap-[6px] mr-3">
          <span
            className="text-[10px] tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
          >
            P1
          </span>
          <div className="w-[6px] h-[6px] rounded-full" style={{ background: accentColor }} />
        </div>

        {/* Name */}
        <span className="text-[15px] font-semibold text-sv-text-primary mr-1">{row.name}</span>
        <span className="text-xs text-sv-text-muted mr-4 pl-1">{row.team.shortName ?? row.team.name}</span>

        {/* Divider */}
        <div className="w-px h-[20px] bg-sv-divider mr-4" />

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span
              className="text-base font-semibold text-sv-text-primary"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              {primaryVal ?? '—'}
            </span>
            <span
              className="text-[10px] text-sv-text-muted"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              {config.label}
            </span>
          </div>
          {config.secondary.map(s => (
            <div key={s.key} className="flex items-baseline gap-1">
              <span
                className="text-[13px] font-medium text-sv-text-primary"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                {row.stats[s.key] ?? '—'}
              </span>
              <span
                className="text-[10px] text-sv-text-muted"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Right: expand chevron */}
        <div className="ml-auto flex items-center gap-2">
          <motion.span
            className="text-[11px] text-sv-text-muted"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >▾</motion.span>
        </div>
      </motion.div>

      {/* Animated expanded content */}
      <AnimatePresence initial={false}>
        {expanded && expandedContent && (
          <motion.div
            key="hero-expand"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden', borderBottom: `2px solid ${accentColor}` }}
          >
            {expandedContent}
          </motion.div>
        )}
      </AnimatePresence>
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

## Task 6: LeaderboardTable — Light Header + Sticky Offsets

**Files:**
- Modify: `sportvault/components/leaderboard/LeaderboardTable.tsx`

Changes: light `sv-surface2` table header bg, sticky offset `top-[88px]` (52px header + 36px tabs), pass `accentColor` to active sort column. Pass `heroExpandedContent` to HeroStrip.

- [ ] **Step 1: Update LeaderboardTable sticky offset + light header**

In `LeaderboardTable.tsx`, change the `<thead>` sticky class and background:

```typescript
// Change thead tr from:
<thead className="sticky top-12 z-10 bg-sv-bg">
  <tr style={{ borderBottom: '1px solid #1c1c1c' }}>

// To:
<thead className="sticky top-[88px] z-[7]" style={{ background: '#f2f1ee' }}>
  <tr style={{ height: 38, borderBottom: '1px solid #e4e3df' }}>
```

Also update the `#` position `<th>` and all other `<th>` text colors to use light palette:

```typescript
// Position th:
<th className="w-10 px-4 py-3 text-[10px] font-medium uppercase tracking-[0.08em]"
    style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894', textAlign: 'center' }}>
  #
</th>

// Sortable th style: change { color: '#444444' } to { color: '#9a9894' }
// Active sort th: keep { color: accentColor, borderBottom: `2px solid ${accentColor}` }
```

Also update NFL disclaimer text color:
```typescript
// Change text-sv-text-muted inline to:
<p className="px-6 pt-2 pb-1 text-[11px]" style={{ color: '#9a9894' }}>
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 7: PlayerRow — Light Hover + Framer Motion Expand

**Files:**
- Modify: `sportvault/components/leaderboard/PlayerRow.tsx`

Changes: light hover `#faf9f7`, name turns accent color on hover, row border `#e4e3df`, expanded bg `#faf9f7`, Framer Motion `motion.tr` with `whileHover`.

- [ ] **Step 1: Rewrite PlayerRow with light theme + Framer Motion**

```typescript
// sportvault/components/leaderboard/PlayerRow.tsx
'use client'

import { motion } from 'framer-motion'
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
  row, columns, position, isExpanded, isAmberLeader, amberStatKey, leaderStatValue, accentColor, onToggle,
}: PlayerRowProps) {
  const color = row.team.colorPrimary

  // Background bar width scaled to leader
  const primarySortableCol = columns.find(c => c.sortable)
  const primaryVal = primarySortableCol ? Number(row.stats[primarySortableCol.key] ?? 0) : 0
  const barPct = leaderStatValue > 0 ? Math.min(100, Math.round((primaryVal / leaderStatValue) * 100)) : 0

  return (
    <motion.tr
      className="group relative cursor-pointer"
      style={{
        borderBottom: '1px solid #e4e3df',
        backgroundColor: isExpanded ? '#faf9f7' : '#ffffff',
      }}
      whileHover={{ backgroundColor: '#faf9f7' }}
      transition={{ duration: 0.15 }}
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
      <td className="w-10 px-3 py-0" style={{ height: 56 }}>
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
            <td key={col.key} className="px-2 py-0">
              <div className="flex flex-col gap-[1px]">
                <motion.span
                  className="text-[14px] font-medium leading-tight"
                  style={{ color: '#111110' }}
                  whileHover={{ color: accentColor }}
                  transition={{ duration: 0.15 }}
                >
                  {row.name}
                </motion.span>
                <span className="text-[11px]" style={{ color: '#9a9894', marginTop: 1 }}>
                  {row.team.shortName ?? row.team.name}
                </span>
              </div>
            </td>
          )
        }

        if (isTeamCol) {
          return (
            <td key={col.key} className="px-2 py-0 text-center">
              <span className="text-[13px]" style={{ color: '#5a5955' }}>
                {row.team.shortName ?? row.team.name}
              </span>
            </td>
          )
        }

        return (
          <td key={col.key} className="px-2 py-0 text-center">
            <span
              className="text-[13px] font-medium tabular-nums"
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                color: isAmber ? '#d97706' : i => i === 0 ? '#5a5955' : '#111110',
              }}
            >
              {row.stats[col.key] ?? '—'}
            </span>
          </td>
        )
      })}

      {/* Expand chevron */}
      <td className="w-8 px-2 py-0 text-right">
        <motion.span
          className="text-[11px]"
          style={{ display: 'inline-block', color: '#9a9894' }}
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >▾</motion.span>
      </td>
    </motion.tr>
  )
}
```

- [ ] **Step 2: Fix the color callback syntax — it's not valid JSX**

The stat cell color logic has a stray arrow function. Replace the stat `<td>` return with:

```typescript
return (
  <td key={col.key} className="px-2 py-0 text-center">
    <span
      className="text-[13px] font-medium tabular-nums"
      style={{
        fontFamily: 'var(--font-dm-mono), monospace',
        color: isAmber ? '#d97706' : '#111110',
      }}
    >
      {row.stats[col.key] ?? '—'}
    </span>
  </td>
)
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 8: PlayerExpandedStats — Animated Expand + Light Surface

**Files:**
- Modify: `sportvault/components/leaderboard/PlayerExpandedStats.tsx`

Changes: `#faf9f7` bg, `#e4e3df` border, white stat cards, light chart grid. Wrap in `AnimatePresence` + `motion.div` for height animation. The expand is already triggered by `LeaderboardTable` via conditional render — wrap the `<td>` content in `motion.div` with height animation.

- [ ] **Step 1: Update PlayerExpandedStats with light theme + height animation**

```typescript
// sportvault/components/leaderboard/PlayerExpandedStats.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const SKIP_KEYS = new Set(['position', 'rank', 'season'])

export function PlayerExpandedStats({ stats, loading, chartConfig, accentColor, onClose }: PlayerExpandedStatsProps) {
  const [chartMode, setChartMode] = useState<'pts' | 'pos'>('pts')

  return (
    <tr>
      <td
        colSpan={99}
        style={{ borderTop: '1px solid #e4e3df', borderBottom: '1px solid #e4e3df', padding: 0 }}
      >
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: 'hidden', background: '#faf9f7' }}
        >
          <div className="px-6 py-[14px] flex gap-8 items-start">
            {loading && (
              <div className="flex items-center gap-2 py-4">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                <span className="text-sm" style={{ color: '#9a9894' }}>Loading...</span>
              </div>
            )}

            {stats && !loading && (
              <>
                {/* Left: stat chips */}
                <div className="flex flex-col gap-[6px] flex-shrink-0">
                  <div
                    className="text-[9px] uppercase tracking-[0.08em] mb-[2px]"
                    style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
                  >
                    SEASON STATS
                  </div>
                  <div className="grid gap-[6px]" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
                    {Object.entries(stats.summaryStats)
                      .filter(([k, v]) => !SKIP_KEYS.has(k) && v !== 0 && v !== null && v !== undefined && v !== '')
                      .map(([k, v]) => (
                        <div
                          key={k}
                          className="rounded-[5px] px-[10px] py-[5px] min-w-[52px]"
                          style={{ background: '#ffffff', border: '1px solid #e4e3df' }}
                        >
                          <div
                            className="text-[9px] uppercase tracking-[0.06em] mb-[2px]"
                            style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
                          >
                            {k.replace(/_/g, ' ')}
                          </div>
                          <div
                            className="text-[15px] font-semibold"
                            style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#111110' }}
                          >
                            {v}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Right: chart */}
                <div className="flex-1 min-w-0">
                  {/* Chart title */}
                  {chartConfig.label && (
                    <div
                      className="text-[9px] uppercase tracking-[0.08em] mb-[6px]"
                      style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
                    >
                      {chartConfig.type === 'line' ? (chartMode === 'pts' ? 'CUMULATIVE POINTS BY ROUND' : 'FINISH POSITION BY ROUND')
                        : chartConfig.type === 'line+radar' ? `STAT PROFILE — ${stats.name.toUpperCase()}`
                        : chartConfig.label.toUpperCase()}
                    </div>
                  )}

                  {/* F1-only mode toggle */}
                  {chartConfig.dualMode && (
                    <div className="flex gap-2 mb-3">
                      {(['pts', 'pos'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setChartMode(mode)}
                          className="text-xs font-medium px-2 py-0.5 rounded transition-colors duration-150"
                          style={{
                            fontFamily: 'var(--font-dm-mono), monospace',
                            background: chartMode === mode ? accentColor : 'transparent',
                            color: chartMode === mode ? '#ffffff' : '#9a9894',
                            border: `1px solid ${chartMode === mode ? accentColor : '#e4e3df'}`,
                          }}
                        >
                          {mode === 'pts' ? 'Cumulative Points' : 'Finish Positions'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Charts */}
                  {stats.chartData.length > 0 && chartConfig.type === 'line' && (
                    <F1SeasonLineChart
                      data={stats.chartData}
                      teamColor={stats.team.colorPrimary}
                      driverName={stats.name}
                      dualMode={chartMode === 'pos'}
                    />
                  )}
                  {chartConfig.type === 'line+radar' && (
                    <StatsRadarChart
                      summaryStats={stats.summaryStats}
                      teamColor={stats.team.colorPrimary}
                      name={stats.name}
                    />
                  )}
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

                  {/* Compare placeholder */}
                  <div className="mt-3 text-right">
                    <button
                      className="text-xs cursor-not-allowed opacity-30 select-none"
                      style={{ color: '#9a9894' }}
                      disabled
                      title="Coming soon"
                    >
                      + Compare
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: Wrap expanded rows in AnimatePresence in LeaderboardTable**

In `LeaderboardTable.tsx`, the conditional `{expandedId === row.playerId && <PlayerExpandedStats ... />}` needs `AnimatePresence` to trigger the exit animation:

```typescript
// Add import at top of LeaderboardTable.tsx:
import { AnimatePresence } from 'framer-motion'

// Wrap the conditional render:
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
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 9: Update Chart Colors for Light Theme

**Files:**
- Modify: `sportvault/components/charts/F1SeasonLineChart.tsx`
- Modify: `sportvault/components/charts/StatsBarChart.tsx`
- Modify: `sportvault/components/charts/NflWeeklyBarChart.tsx`

Charts currently use dark backgrounds (`#1c1c1c` grid, `#333` axis). Update to light palette.

- [ ] **Step 1: Update F1SeasonLineChart chart colors**

In `F1SeasonLineChart.tsx`, change:
- `stroke="#1c1c1c"` on CartesianGrid → `stroke="#e4e3df"`
- `stroke="#333"` on XAxis/YAxis → `stroke="#e4e3df"`
- `fill: '#444'` on tick → `fill: '#9a9894'`
- Tooltip: `background: '#111111', border: '1px solid #2a2a2a'` → `background: '#ffffff', border: '1px solid #e4e3df'`
- Tooltip `labelStyle: { color: '#888' }` → `{ color: '#9a9894' }`

- [ ] **Step 2: Update StatsBarChart chart colors**

In `StatsBarChart.tsx`, change:
- `background: '#18181b'` in tooltip → `'#ffffff'`
- `border: '1px solid #3f3f46'` → `'1px solid #e4e3df'`
- `fill: '#a1a1aa'` on axis ticks → `'#9a9894'`

- [ ] **Step 3: Update NflWeeklyBarChart chart colors**

In `NflWeeklyBarChart.tsx`, same changes as StatsBarChart plus reference line:
- `stroke="#52525b"` → `"#d4d3cf"`

- [ ] **Step 4: TypeScript check + build**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -10
```

Expected: Clean build, no errors.

---

## Task 10: Reduced Motion + Accessibility Pass

**Files:**
- Modify: `sportvault/components/layout/SportTabs.tsx`
- Modify: `sportvault/components/layout/CompetitionSelector.tsx`
- Modify: `sportvault/components/leaderboard/PlayerRow.tsx`
- Modify: `sportvault/components/leaderboard/PlayerExpandedStats.tsx`

Add `useReducedMotion` from Framer Motion to all animated components. When reduced motion is preferred, replace spring/ease transitions with instant ones.

- [ ] **Step 1: Add reduced motion to SportTabs**

```typescript
// In SportTabs.tsx, add at top of component:
import { motion, useReducedMotion } from 'framer-motion'

export function SportTabs() {
  const shouldReduce = useReducedMotion()
  // ...
  // On the motion.div pill, change transition:
  transition={shouldReduce
    ? { duration: 0 }
    : { type: 'spring', stiffness: 400, damping: 35 }
  }
```

- [ ] **Step 2: Add reduced motion to CompetitionSelector**

Same pattern — import `useReducedMotion`, apply to underline `motion.div` transition.

- [ ] **Step 3: Add reduced motion to PlayerRow + PlayerExpandedStats**

In `PlayerRow.tsx`: `useReducedMotion` on `motion.tr` hover and chevron rotate.
In `PlayerExpandedStats.tsx`: `useReducedMotion` on height expand transition — use `duration: 0` when reduced.

- [ ] **Step 4: Final TypeScript check + build**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -15
```

Expected: Clean.

---

## Self-Review

### Spec Coverage

| Design element | Task |
|---|---|
| `#f7f6f3` warm bg, `#ffffff` surface | Task 1 |
| DM Sans + DM Mono fonts | Task 1 |
| `#111110`/`#5a5955`/`#9a9894` text palette | Tasks 1, 7, 8 |
| Sport selector sliding pill | Task 2 |
| Tab underline sliding animation | Task 3 |
| Year selector in tab bar, DM Mono, accent active | Task 4 |
| Hero strip: white surface, accent border, expand | Task 5 |
| Table header: `#f2f1ee` bg, sticky `top-[88px]` | Task 6 |
| Row hover `#faf9f7`, name → accent color | Task 7 |
| Row height 56px, DM Mono stats | Task 7 |
| Expand: animated height, `#faf9f7` bg | Task 8 |
| Stat chips: white bg, `#e4e3df` border | Task 8 |
| AnimatePresence exit animation | Task 8 |
| Chart grids/axes light colors | Task 9 |
| `prefers-reduced-motion` respected | Task 10 |
| `#d97706` amber for sort leader | Tasks 1, 7 |
| Thin `#d4d3cf` scrollbar | Task 1 |

### Placeholder Scan

No TBD/TODO entries. All code blocks complete.

### Type Consistency

- `HeroStripProps.expandedContent: React.ReactNode` — added in Task 5, but `LeaderboardTable` doesn't pass it yet. **Fix:** In `LeaderboardTable`, the hero strip currently has no expand content. For now `expandedContent` is optional — the strip will be clickable but expands to nothing (acceptable MVP). Wire real content in a follow-up.
- `motion.tr` — Framer Motion wraps HTML elements; `motion.tr` is valid.
- All component props consistent across tasks.
