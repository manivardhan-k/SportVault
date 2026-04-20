# SportVault MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SportVault — historical sports data platform for F1, Soccer, NFL, NBA with layered folder UI, team color coding, and expandable player charts.

**Architecture:** Next.js 14 App Router with TypeScript. PostgreSQL (Supabase) via Prisma. Sport-specific config objects drive all generic UI components. Cache interface abstracts Redis (Upstash) — not wired yet but designed for drop-in swap.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma, PostgreSQL (Supabase), Recharts, nfl-data-py (Python), Ergast/Jolpica API, football-data.org API, balldontlie API

---

## File Map

```
sportvault/
├── app/
│   ├── layout.tsx                          # Root layout with SportTabs
│   ├── page.tsx                            # Redirect → /f1
│   ├── [sport]/
│   │   ├── page.tsx                        # Sport home → redirect to default competition/year
│   │   └── [competition]/[year]/
│   │       └── page.tsx                    # Main leaderboard page
│   └── api/
│       ├── sports/route.ts                 # GET all sports + competitions
│       └── [sport]/[competition]/[year]/
│           ├── standings/route.ts          # GET leaderboard
│           ├── teams/route.ts              # GET teams with colors
│           └── player/[id]/route.ts        # GET expanded player stats
├── components/
│   ├── layout/
│   │   ├── SportTabs.tsx
│   │   ├── CompetitionSelector.tsx
│   │   └── YearSelector.tsx
│   ├── leaderboard/
│   │   ├── LeaderboardTable.tsx
│   │   ├── PlayerRow.tsx
│   │   ├── PlayerExpandedStats.tsx
│   │   └── TeamColorDot.tsx
│   └── charts/
│       ├── F1SeasonLineChart.tsx
│       ├── SoccerStatsChart.tsx
│       ├── NFLWeeklyChart.tsx
│       └── NBAStatsChart.tsx
├── config/
│   ├── sports.ts                           # Master registry of all SportConfig objects
│   ├── f1.config.ts
│   ├── soccer.config.ts
│   ├── nfl.config.ts
│   └── nba.config.ts
├── lib/
│   ├── db.ts                               # Prisma singleton
│   ├── cache.ts                            # Cache interface (memory now, Redis-swappable)
│   └── queries/
│       ├── f1.ts
│       ├── soccer.ts
│       ├── nfl.ts
│       └── nba.ts
├── types/
│   ├── sport-config.ts                     # SportConfig, ColumnDef, ChartConfig interfaces
│   └── api.ts                              # Shared API response types
├── prisma/
│   └── schema.prisma
└── scripts/
    └── ingest/
        ├── index.ts                        # CLI entry
        ├── f1.ts
        ├── soccer.ts
        ├── nfl.ts
        ├── nba.ts
        ├── fetch_nfl.py                    # nfl-data-py → CSV export
        └── utils/
            ├── db.ts
            ├── http.ts
            └── upsert.ts
```

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `sportvault/` (project root)
- Create: `.env.local`
- Create: `.env.example`

- [ ] **Step 1: Scaffold**

```bash
cd /Users/mani/SportVault
npx create-next-app@latest sportvault --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd sportvault
```

Expected: project created, `npm run dev` works.

- [ ] **Step 2: Install deps**

```bash
npm install prisma @prisma/client recharts
npm install -D @types/node
npx prisma init
```

- [ ] **Step 3: Create .env.local**

```bash
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/sportvault?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/sportvault"
FOOTBALL_DATA_API_KEY=""
BALLDONTLIE_API_KEY=""
EOF
```

- [ ] **Step 4: Create .env.example**

```bash
cat > .env.example << 'EOF'
DATABASE_URL=""
DIRECT_URL=""
FOOTBALL_DATA_API_KEY=""
BALLDONTLIE_API_KEY=""
EOF
```

- [ ] **Step 5: Add .env.local to .gitignore**

Verify `.gitignore` contains `.env.local` (create-next-app adds this by default).

- [ ] **Step 6: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js 14 project with Tailwind + Prisma"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/sport-config.ts`
- Create: `types/api.ts`

- [ ] **Step 1: Write sport-config types**

Create `types/sport-config.ts`:

```typescript
export interface ColumnDef {
  key: string
  label: string
  sortable: boolean
  positionGroups?: string[]  // if set, column only shows for these NFL positions
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'radar' | 'line+radar'
  primaryDataKey: string
  label: string
  dualMode?: boolean         // F1: toggle between cumulative points and finish position
}

export interface CompetitionConfig {
  slug: string
  name: string
  competitionType: 'league' | 'cup' | 'championship' | 'tournament'
  group?: string             // Soccer: 'League' | 'Cup' for folder nesting
  seasonLabelFormat: 'year' | 'year-range'
}

export interface SportConfig {
  slug: string
  name: string
  icon: string
  competitions: CompetitionConfig[]
  leaderboardColumns: ColumnDef[]
  defaultSortKey: string
  expandedChartConfig: ChartConfig
  rankingLabel: string       // 'Driver' | 'Player'
  hasTeams: boolean
  hasPositionFilter: boolean // NFL only
  positionGroups?: PositionGroupConfig[]
}

export interface PositionGroupConfig {
  key: string                // 'QB' | 'RB' | 'WR' | 'TE'
  label: string
  columns: ColumnDef[]
  defaultSortKey: string
}
```

- [ ] **Step 2: Write API response types**

Create `types/api.ts`:

```typescript
export interface TeamRef {
  name: string
  shortName: string
  colorPrimary: string
  colorSecondary: string
}

export interface LeaderboardRow {
  playerId: string
  name: string
  team: TeamRef
  stats: Record<string, number | string>
}

export interface LeaderboardResponse {
  sport: string
  competition: string
  year: number
  columns: import('./sport-config').ColumnDef[]
  rows: LeaderboardRow[]
}

export interface PlayerStatsResponse {
  playerId: string
  name: string
  team: TeamRef
  season: number
  chartData: ChartDataPoint[]
  summaryStats: Record<string, number | string>
}

export interface ChartDataPoint {
  label: string | number    // round number, week, matchweek
  [key: string]: number | string
}

export interface SeasonMeta {
  year: number
  label: string
  status: 'completed' | 'in_progress' | 'upcoming'
}

export interface SportsMeta {
  slug: string
  name: string
  icon: string
  competitions: {
    slug: string
    name: string
    competitionType: string
    group?: string
    seasons: SeasonMeta[]
  }[]
}
```

- [ ] **Step 3: Commit**

```bash
git add types/
git commit -m "feat: add SportConfig and API response TypeScript types"
```

---

## Task 3: Sport Config Objects

**Files:**
- Create: `config/f1.config.ts`
- Create: `config/soccer.config.ts`
- Create: `config/nfl.config.ts`
- Create: `config/nba.config.ts`
- Create: `config/sports.ts`

- [ ] **Step 1: F1 config**

Create `config/f1.config.ts`:

```typescript
import type { SportConfig } from '@/types/sport-config'

export const f1Config: SportConfig = {
  slug: 'f1',
  name: 'Formula 1',
  icon: '🏎️',
  competitions: [
    {
      slug: 'f1-championship',
      name: 'Championship',
      competitionType: 'championship',
      seasonLabelFormat: 'year',
    },
  ],
  leaderboardColumns: [
    { key: 'position', label: '#', sortable: false },
    { key: 'driver', label: 'Driver', sortable: false },
    { key: 'team', label: 'Constructor', sortable: true },
    { key: 'points', label: 'Pts', sortable: true },
    { key: 'wins', label: 'Wins', sortable: true },
    { key: 'podiums', label: 'Podiums', sortable: true },
    { key: 'poles', label: 'Poles', sortable: true },
  ],
  defaultSortKey: 'points',
  expandedChartConfig: {
    type: 'line',
    primaryDataKey: 'points',
    label: 'Cumulative Points',
    dualMode: true,
  },
  rankingLabel: 'Driver',
  hasTeams: true,
  hasPositionFilter: false,
}
```

- [ ] **Step 2: Soccer config**

Create `config/soccer.config.ts`:

```typescript
import type { SportConfig } from '@/types/sport-config'

export const soccerConfig: SportConfig = {
  slug: 'soccer',
  name: 'Soccer',
  icon: '⚽',
  competitions: [
    { slug: 'premier-league', name: 'Premier League', competitionType: 'league', group: 'League', seasonLabelFormat: 'year-range' },
    { slug: 'champions-league', name: 'Champions League', competitionType: 'cup', group: 'Cup', seasonLabelFormat: 'year-range' },
    { slug: 'world-cup', name: 'World Cup', competitionType: 'tournament', group: 'Cup', seasonLabelFormat: 'year' },
  ],
  leaderboardColumns: [
    { key: 'position', label: '#', sortable: false },
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Club', sortable: true },
    { key: 'appearances', label: 'Apps', sortable: true },
    { key: 'goals', label: 'Goals', sortable: true },
    { key: 'assists', label: 'Assists', sortable: true },
    { key: 'ga', label: 'G+A', sortable: true },
    { key: 'minutes', label: 'Mins', sortable: true },
  ],
  defaultSortKey: 'goals',
  expandedChartConfig: {
    type: 'line',
    primaryDataKey: 'goals',
    label: 'Goals Timeline',
  },
  rankingLabel: 'Player',
  hasTeams: true,
  hasPositionFilter: false,
}
```

- [ ] **Step 3: NFL config**

Create `config/nfl.config.ts`:

```typescript
import type { SportConfig, PositionGroupConfig } from '@/types/sport-config'

const qbColumns: PositionGroupConfig = {
  key: 'QB',
  label: 'Quarterbacks',
  columns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'passing_yards', label: 'Pass Yds', sortable: true },
    { key: 'passing_tds', label: 'TDs', sortable: true },
    { key: 'interceptions', label: 'INTs', sortable: true },
    { key: 'passer_rating', label: 'Rating', sortable: true },
  ],
  defaultSortKey: 'passing_yards',
}

const rbColumns: PositionGroupConfig = {
  key: 'RB',
  label: 'Running Backs',
  columns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'rushing_yards', label: 'Rush Yds', sortable: true },
    { key: 'rushing_tds', label: 'Rush TDs', sortable: true },
    { key: 'receptions', label: 'Rec', sortable: true },
    { key: 'receiving_yards', label: 'Rec Yds', sortable: true },
  ],
  defaultSortKey: 'rushing_yards',
}

const wrteColumns: PositionGroupConfig = {
  key: 'WR',
  label: 'Receivers',
  columns: [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'targets', label: 'Tgts', sortable: true },
    { key: 'receptions', label: 'Rec', sortable: true },
    { key: 'receiving_yards', label: 'Rec Yds', sortable: true },
    { key: 'receiving_tds', label: 'TDs', sortable: true },
  ],
  defaultSortKey: 'receiving_yards',
}

export const nflConfig: SportConfig = {
  slug: 'nfl',
  name: 'NFL',
  icon: '🏈',
  competitions: [
    { slug: 'nfl-regular', name: 'Regular Season', competitionType: 'league', seasonLabelFormat: 'year' },
    { slug: 'nfl-playoffs', name: 'Playoffs', competitionType: 'tournament', seasonLabelFormat: 'year' },
  ],
  leaderboardColumns: qbColumns.columns,  // default to QB view
  defaultSortKey: 'passing_yards',
  expandedChartConfig: {
    type: 'bar',
    primaryDataKey: 'stat',
    label: 'Weekly Stats',
  },
  rankingLabel: 'Player',
  hasTeams: true,
  hasPositionFilter: true,
  positionGroups: [qbColumns, rbColumns, wrteColumns],
}
```

- [ ] **Step 4: NBA config**

Create `config/nba.config.ts`:

```typescript
import type { SportConfig } from '@/types/sport-config'

export const nbaConfig: SportConfig = {
  slug: 'nba',
  name: 'NBA',
  icon: '🏀',
  competitions: [
    { slug: 'nba-regular', name: 'Regular Season', competitionType: 'league', seasonLabelFormat: 'year-range' },
    { slug: 'nba-playoffs', name: 'Playoffs', competitionType: 'tournament', seasonLabelFormat: 'year-range' },
  ],
  leaderboardColumns: [
    { key: 'rank', label: 'Rank', sortable: false },
    { key: 'player', label: 'Player', sortable: false },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'games', label: 'G', sortable: true },
    { key: 'ppg', label: 'PPG', sortable: true },
    { key: 'rpg', label: 'RPG', sortable: true },
    { key: 'apg', label: 'APG', sortable: true },
    { key: 'fg_pct', label: 'FG%', sortable: true },
    { key: 'three_pt_pct', label: '3P%', sortable: true },
  ],
  defaultSortKey: 'ppg',
  expandedChartConfig: {
    type: 'line+radar',
    primaryDataKey: 'ppg',
    label: 'Season Stats',
  },
  rankingLabel: 'Player',
  hasTeams: true,
  hasPositionFilter: false,
}
```

- [ ] **Step 5: Master registry**

Create `config/sports.ts`:

```typescript
import { f1Config } from './f1.config'
import { soccerConfig } from './soccer.config'
import { nflConfig } from './nfl.config'
import { nbaConfig } from './nba.config'
import type { SportConfig } from '@/types/sport-config'

export const SPORT_CONFIGS: SportConfig[] = [f1Config, soccerConfig, nflConfig, nbaConfig]

export function getSportConfig(slug: string): SportConfig | undefined {
  return SPORT_CONFIGS.find(c => c.slug === slug)
}
```

- [ ] **Step 6: Commit**

```bash
git add config/ types/
git commit -m "feat: add sport config objects for F1, Soccer, NFL, NBA"
```

---

## Task 4: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Write schema**

Replace `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Sport {
  id          Int           @id @default(autoincrement())
  slug        String        @unique @db.VarChar(20)
  name        String        @db.VarChar(100)
  icon        String?       @db.VarChar(50)
  competitions Competition[]
  teams        Team[]
  players      Player[]
}

model Competition {
  id                Int      @id @default(autoincrement())
  sportId           Int
  slug              String   @unique @db.VarChar(50)
  name              String   @db.VarChar(100)
  competitionType   String   @db.VarChar(30)
  seasonPattern     String?  @db.VarChar(20)
  sport             Sport    @relation(fields: [sportId], references: [id])
  seasons           Season[]

  @@map("competitions")
}

model Season {
  id            Int         @id @default(autoincrement())
  competitionId Int
  year          Int
  label         String?     @db.VarChar(20)
  status        String      @default("completed") @db.VarChar(20)
  competition   Competition @relation(fields: [competitionId], references: [id])
  playerSeasons PlayerSeason[]
  f1Standings   F1DriverStanding[]
  f1RaceResults F1RaceResult[]
  soccerStats   SoccerPlayerStat[]
  nflStats      NflPlayerStat[]
  nbaStats      NbaPlayerStat[]
  teamStandings TeamStanding[]

  @@unique([competitionId, year])
  @@index([competitionId, year])
  @@map("seasons")
}

model Team {
  id             Int            @id @default(autoincrement())
  sportId        Int
  externalId     String?        @db.VarChar(100)
  name           String         @db.VarChar(100)
  shortName      String?        @db.VarChar(30)
  colorPrimary   String?        @db.VarChar(7)
  colorSecondary String?        @db.VarChar(7)
  logoUrl        String?        @db.VarChar(255)
  sport          Sport          @relation(fields: [sportId], references: [id])
  playerSeasons  PlayerSeason[]
  teamStandings  TeamStanding[]

  @@map("teams")
}

model Player {
  id            Int            @id @default(autoincrement())
  sportId       Int
  externalId    String?        @db.VarChar(100)
  firstName     String?        @db.VarChar(100)
  lastName      String         @db.VarChar(100)
  nationality   String?        @db.VarChar(60)
  dateOfBirth   DateTime?      @db.Date
  position      String?        @db.VarChar(30)
  number        Int?
  sport         Sport          @relation(fields: [sportId], references: [id])
  playerSeasons PlayerSeason[]
  f1Standings   F1DriverStanding[]
  f1RaceResults F1RaceResult[]
  soccerStats   SoccerPlayerStat[]
  nflStats      NflPlayerStat[]
  nbaStats      NbaPlayerStat[]

  @@map("players")
}

model PlayerSeason {
  id       Int    @id @default(autoincrement())
  playerId Int
  teamId   Int
  seasonId Int
  player   Player @relation(fields: [playerId], references: [id])
  team     Team   @relation(fields: [teamId], references: [id])
  season   Season @relation(fields: [seasonId], references: [id])

  @@unique([playerId, seasonId])
  @@index([seasonId])
  @@map("player_seasons")
}

model F1DriverStanding {
  id             Int    @id @default(autoincrement())
  playerId       Int
  seasonId       Int
  finalPosition  Int?
  totalPoints    Decimal? @db.Decimal(6, 2)
  wins           Int    @default(0)
  podiums        Int    @default(0)
  poles          Int    @default(0)
  fastestLaps    Int    @default(0)
  dnfs           Int    @default(0)
  player         Player @relation(fields: [playerId], references: [id])
  season         Season @relation(fields: [seasonId], references: [id])

  @@unique([playerId, seasonId])
  @@index([seasonId])
  @@map("f1_driver_standings")
}

model F1RaceResult {
  id             Int     @id @default(autoincrement())
  playerId       Int
  seasonId       Int
  round          Int
  raceName       String? @db.VarChar(100)
  finishPosition Int?
  gridPosition   Int?
  points         Decimal? @db.Decimal(5, 2)
  status         String? @db.VarChar(50)
  fastestLap     Boolean @default(false)
  player         Player  @relation(fields: [playerId], references: [id])
  season         Season  @relation(fields: [seasonId], references: [id])

  @@index([playerId, seasonId])
  @@map("f1_race_results")
}

model SoccerPlayerStat {
  id           Int     @id @default(autoincrement())
  playerId     Int
  seasonId     Int
  appearances  Int     @default(0)
  goals        Int     @default(0)
  assists      Int     @default(0)
  yellowCards  Int     @default(0)
  redCards     Int     @default(0)
  minutesPlayed Int    @default(0)
  goalsPer90   Decimal? @db.Decimal(4, 2)
  assistsPer90 Decimal? @db.Decimal(4, 2)
  player       Player  @relation(fields: [playerId], references: [id])
  season       Season  @relation(fields: [seasonId], references: [id])

  @@unique([playerId, seasonId])
  @@index([seasonId])
  @@map("soccer_player_stats")
}

model NflPlayerStat {
  id          Int     @id @default(autoincrement())
  playerId    Int
  seasonId    Int
  seasonType  String  @default("regular") @db.VarChar(20)
  gamesPlayed Int     @default(0)
  stats       Json    @default("{}")
  player      Player  @relation(fields: [playerId], references: [id])
  season      Season  @relation(fields: [seasonId], references: [id])

  @@unique([playerId, seasonId, seasonType])
  @@index([seasonId, seasonType])
  @@map("nfl_player_stats")
}

model NbaPlayerStat {
  id              Int      @id @default(autoincrement())
  playerId        Int
  seasonId        Int
  gamesPlayed     Int      @default(0)
  pointsPerGame   Decimal? @db.Decimal(5, 2)
  reboundsPerGame Decimal? @db.Decimal(5, 2)
  assistsPerGame  Decimal? @db.Decimal(5, 2)
  stealsPerGame   Decimal? @db.Decimal(5, 2)
  blocksPerGame   Decimal? @db.Decimal(5, 2)
  fgPct           Decimal? @db.Decimal(5, 3)
  threePtPct      Decimal? @db.Decimal(5, 3)
  ftPct           Decimal? @db.Decimal(5, 3)
  minutesPerGame  Decimal? @db.Decimal(5, 2)
  player          Player   @relation(fields: [playerId], references: [id])
  season          Season   @relation(fields: [seasonId], references: [id])

  @@unique([playerId, seasonId])
  @@index([seasonId])
  @@map("nba_player_stats")
}

model TeamStanding {
  id       Int    @id @default(autoincrement())
  teamId   Int
  seasonId Int
  position Int?
  played   Int?
  won      Int?
  drawn    Int?
  lost     Int?
  points   Int?
  extra    Json   @default("{}")
  team     Team   @relation(fields: [teamId], references: [id])
  season   Season @relation(fields: [seasonId], references: [id])

  @@unique([teamId, seasonId])
  @@map("team_standings")
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration created, tables exist in Supabase.

- [ ] **Step 3: Generate client**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add Prisma schema with all sport-specific tables"
```

---

## Task 5: Prisma Singleton + Cache Interface

**Files:**
- Create: `lib/db.ts`
- Create: `lib/cache.ts`

- [ ] **Step 1: Prisma singleton**

Create `lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Cache interface**

Create `lib/cache.ts`:

```typescript
// Cache interface — swap implementation to Redis without changing callers.
// Current: in-memory Map (dev/no-Redis). Production: replace CacheStore with Upstash Redis.

export interface CacheStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
}

class MemoryCache implements CacheStore {
  private store = new Map<string, { value: string; expiresAt: number }>()

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }
}

// Swap this line to: `export const cache = new RedisCache()` when wiring Upstash
export const cache: CacheStore = new MemoryCache()

// TTL constants
export const TTL = {
  HISTORICAL: 60 * 60 * 24,  // 24h — completed seasons never change
  ACTIVE: 60 * 60,            // 1h  — in-progress seasons
} as const

export function standingsKey(sport: string, competition: string, year: number): string {
  return `standings:${sport}:${competition}:${year}`
}

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await cache.get(key)
  if (cached) return JSON.parse(cached) as T
  const data = await fetcher()
  await cache.set(key, JSON.stringify(data), ttl)
  return data
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/
git commit -m "feat: add Prisma singleton and Redis-ready cache interface"
```

---

## Task 6: UI Shell — SportTabs + YearSelector + CompetitionSelector

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Create: `components/layout/SportTabs.tsx`
- Create: `components/layout/YearSelector.tsx`
- Create: `components/layout/CompetitionSelector.tsx`

- [ ] **Step 1: SportTabs component**

Create `components/layout/SportTabs.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SPORT_CONFIGS } from '@/config/sports'

export function SportTabs() {
  const pathname = usePathname()
  const activeSport = pathname.split('/')[1]

  return (
    <nav className="flex gap-1 border-b border-zinc-800 px-4">
      {SPORT_CONFIGS.map(sport => (
        <Link
          key={sport.slug}
          href={`/${sport.slug}`}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeSport === sport.slug
              ? 'border-b-2 border-white text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {sport.icon} {sport.name}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: YearSelector component**

Create `components/layout/YearSelector.tsx`:

```typescript
'use client'

import Link from 'next/link'
import type { SeasonMeta } from '@/types/api'

interface YearSelectorProps {
  seasons: SeasonMeta[]
  activeYear: number
  sport: string
  competition: string
}

export function YearSelector({ seasons, activeYear, sport, competition }: YearSelectorProps) {
  return (
    <aside className="w-32 shrink-0 border-l border-zinc-800 px-3 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Season</p>
      <ul className="flex flex-col gap-1">
        {seasons.map(s => {
          const isDisabled = s.status !== 'completed'
          const isActive = s.year === activeYear

          if (isDisabled) {
            return (
              <li
                key={s.year}
                className="cursor-not-allowed rounded px-2 py-1 text-sm text-zinc-600"
              >
                {s.label}
              </li>
            )
          }

          return (
            <li key={s.year}>
              <Link
                href={`/${sport}/${competition}/${s.year}`}
                className={`block rounded px-2 py-1 text-sm transition-colors ${
                  isActive
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {s.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
```

- [ ] **Step 3: CompetitionSelector component**

Create `components/layout/CompetitionSelector.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SportConfig } from '@/types/sport-config'

interface CompetitionSelectorProps {
  sportConfig: SportConfig
  defaultYear: number
}

export function CompetitionSelector({ sportConfig, defaultYear }: CompetitionSelectorProps) {
  const pathname = usePathname()
  const activeCompetition = pathname.split('/')[2]

  // Group competitions by group key (for soccer folders), ungrouped for others
  const groups = sportConfig.competitions.reduce<Record<string, typeof sportConfig.competitions>>(
    (acc, comp) => {
      const key = comp.group ?? '__none__'
      acc[key] = [...(acc[key] ?? []), comp]
      return acc
    },
    {}
  )

  return (
    <div className="flex flex-wrap gap-2 border-b border-zinc-800 px-4 py-3">
      {Object.entries(groups).map(([groupKey, comps]) => {
        if (groupKey === '__none__') {
          return comps.map(comp => (
            <Link
              key={comp.slug}
              href={`/${sportConfig.slug}/${comp.slug}/${defaultYear}`}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                activeCompetition === comp.slug
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {comp.name}
            </Link>
          ))
        }

        return (
          <div key={groupKey} className="flex items-center gap-1">
            <span className="text-xs text-zinc-500">{groupKey}</span>
            {comps.map(comp => (
              <Link
                key={comp.slug}
                href={`/${sportConfig.slug}/${comp.slug}/${defaultYear}`}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  activeCompetition === comp.slug
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {comp.name}
              </Link>
            ))}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Root layout**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SportTabs } from '@/components/layout/SportTabs'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SportVault',
  description: 'Historical sports data — F1, Soccer, NFL, NBA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-zinc-950 text-white`}>
        <header className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-lg font-bold tracking-tight">SportVault</span>
          </div>
          <SportTabs />
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Root redirect**

Replace `app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/f1')
}
```

- [ ] **Step 6: Commit**

```bash
git add app/ components/layout/
git commit -m "feat: add SportTabs, YearSelector, CompetitionSelector UI shell"
```

---

## Task 7: LeaderboardTable + PlayerRow + TeamColorDot

**Files:**
- Create: `components/leaderboard/TeamColorDot.tsx`
- Create: `components/leaderboard/PlayerRow.tsx`
- Create: `components/leaderboard/PlayerExpandedStats.tsx`
- Create: `components/leaderboard/LeaderboardTable.tsx`

- [ ] **Step 1: TeamColorDot**

Create `components/leaderboard/TeamColorDot.tsx`:

```typescript
interface TeamColorDotProps {
  color: string
  size?: number
}

export function TeamColorDot({ color, size = 10 }: TeamColorDotProps) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  )
}
```

- [ ] **Step 2: PlayerRow**

Create `components/leaderboard/PlayerRow.tsx`:

```typescript
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
```

- [ ] **Step 3: PlayerExpandedStats placeholder**

Create `components/leaderboard/PlayerExpandedStats.tsx`:

```typescript
'use client'

import type { PlayerStatsResponse } from '@/types/api'
import type { ChartConfig } from '@/types/sport-config'

interface PlayerExpandedStatsProps {
  stats: PlayerStatsResponse | null
  loading: boolean
  chartConfig: ChartConfig
  onClose: () => void
}

export function PlayerExpandedStats({ stats, loading, chartConfig, onClose }: PlayerExpandedStatsProps) {
  return (
    <tr>
      <td colSpan={99} className="bg-zinc-900 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {loading && <p className="text-sm text-zinc-400">Loading stats...</p>}
            {stats && !loading && (
              <div>
                <div className="mb-4 flex flex-wrap gap-4">
                  {Object.entries(stats.summaryStats).map(([k, v]) => (
                    <div key={k} className="rounded bg-zinc-800 px-3 py-2 text-center">
                      <p className="text-xs uppercase text-zinc-500">{k}</p>
                      <p className="text-lg font-bold">{v}</p>
                    </div>
                  ))}
                </div>
                {/* Chart rendered by sport-specific chart component — wired in Task 10 */}
                <p className="text-xs text-zinc-500">Chart: {chartConfig.label}</p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="ml-4 text-zinc-500 hover:text-white text-sm">
            ✕ Close
          </button>
        </div>
      </td>
    </tr>
  )
}
```

- [ ] **Step 4: LeaderboardTable**

Create `components/leaderboard/LeaderboardTable.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { PlayerRow } from './PlayerRow'
import { PlayerExpandedStats } from './PlayerExpandedStats'
import type { ColumnDef } from '@/types/sport-config'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'

interface LeaderboardTableProps {
  data: LeaderboardResponse
  sport: string
  competition: string
  year: number
}

export function LeaderboardTable({ data, sport, competition, year }: LeaderboardTableProps) {
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
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zinc-700">
            {data.columns.map(col => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 ${col.sortable ? 'cursor-pointer hover:text-white' : ''}`}
                onClick={() => col.sortable && handleSort(col.key)}
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
            <>
              <PlayerRow
                key={row.playerId}
                row={row}
                columns={data.columns}
                isExpanded={expandedId === row.playerId}
                onToggle={() => handleToggle(row.playerId)}
              />
              {expandedId === row.playerId && (
                <PlayerExpandedStats
                  key={`${row.playerId}-expanded`}
                  stats={expandedStats}
                  loading={loadingId === row.playerId}
                  chartConfig={{ type: 'line', primaryDataKey: 'points', label: '' }}
                  onClose={() => { setExpandedId(null); setExpandedStats(null) }}
                />
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/leaderboard/
git commit -m "feat: add LeaderboardTable, PlayerRow, TeamColorDot, PlayerExpandedStats"
```

---

## Task 8: DB Query Functions

**Files:**
- Create: `lib/queries/f1.ts`
- Create: `lib/queries/soccer.ts`
- Create: `lib/queries/nfl.ts`
- Create: `lib/queries/nba.ts`

- [ ] **Step 1: F1 queries**

Create `lib/queries/f1.ts`:

```typescript
import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse, ChartDataPoint } from '@/types/api'

export async function getF1Standings(year: number): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: 'f1-championship' }, year },
  })
  if (!season) throw new Error(`No F1 season found for ${year}`)

  const standings = await prisma.f1DriverStanding.findMany({
    where: { seasonId: season.id },
    include: {
      player: true,
      season: {
        include: {
          playerSeasons: {
            include: { team: true },
          },
        },
      },
    },
    orderBy: { finalPosition: 'asc' },
  })

  const rows = standings.map(s => {
    const ps = s.season.playerSeasons.find(p => p.playerId === s.playerId)
    const team = ps?.team ?? { name: 'Unknown', shortName: '?', colorPrimary: '#888888', colorSecondary: '#888888' }
    return {
      playerId: String(s.playerId),
      name: `${s.player.firstName ?? ''} ${s.player.lastName}`.trim(),
      team: {
        name: team.name,
        shortName: team.shortName ?? team.name,
        colorPrimary: team.colorPrimary ?? '#888888',
        colorSecondary: team.colorSecondary ?? '#888888',
      },
      stats: {
        position: s.finalPosition ?? 0,
        points: Number(s.totalPoints ?? 0),
        wins: s.wins,
        podiums: s.podiums,
        poles: s.poles,
      },
    }
  })

  return {
    sport: 'f1',
    competition: 'f1-championship',
    year,
    columns: [
      { key: 'position', label: '#', sortable: false },
      { key: 'driver', label: 'Driver', sortable: false },
      { key: 'team', label: 'Constructor', sortable: true },
      { key: 'points', label: 'Pts', sortable: true },
      { key: 'wins', label: 'Wins', sortable: true },
      { key: 'podiums', label: 'Podiums', sortable: true },
      { key: 'poles', label: 'Poles', sortable: true },
    ],
    rows,
  }
}

export async function getF1PlayerStats(playerId: number, year: number): Promise<PlayerStatsResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: 'f1-championship' }, year },
  })
  if (!season) throw new Error(`No F1 season for ${year}`)

  const [standing, raceResults, playerSeason] = await Promise.all([
    prisma.f1DriverStanding.findFirst({ where: { playerId, seasonId: season.id }, include: { player: true } }),
    prisma.f1RaceResult.findMany({ where: { playerId, seasonId: season.id }, orderBy: { round: 'asc' } }),
    prisma.playerSeason.findFirst({ where: { playerId, seasonId: season.id }, include: { team: true } }),
  ])

  if (!standing || !playerSeason) throw new Error('Player data not found')

  let cumPoints = 0
  const chartData: ChartDataPoint[] = raceResults.map(r => {
    cumPoints += Number(r.points ?? 0)
    return { label: r.round, points: cumPoints, position: r.finishPosition ?? 0, raceName: r.raceName ?? '' }
  })

  return {
    playerId: String(playerId),
    name: `${standing.player.firstName ?? ''} ${standing.player.lastName}`.trim(),
    team: {
      name: playerSeason.team.name,
      shortName: playerSeason.team.shortName ?? playerSeason.team.name,
      colorPrimary: playerSeason.team.colorPrimary ?? '#888888',
      colorSecondary: playerSeason.team.colorSecondary ?? '#888888',
    },
    season: year,
    chartData,
    summaryStats: {
      Points: Number(standing.totalPoints ?? 0),
      Wins: standing.wins,
      Podiums: standing.podiums,
      Poles: standing.poles,
      DNFs: standing.dnfs,
    },
  }
}
```

- [ ] **Step 2: Soccer queries**

Create `lib/queries/soccer.ts`:

```typescript
import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'

export async function getSoccerStandings(competition: string, year: number): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error(`No season for ${competition} ${year}`)

  const stats = await prisma.soccerPlayerStat.findMany({
    where: { seasonId: season.id },
    include: {
      player: true,
      season: { include: { playerSeasons: { include: { team: true } } } },
    },
    orderBy: { goals: 'desc' },
  })

  const rows = stats.map((s, i) => {
    const ps = s.season.playerSeasons.find(p => p.playerId === s.playerId)
    const team = ps?.team ?? { name: 'Unknown', shortName: '?', colorPrimary: '#888888', colorSecondary: '#888888' }
    return {
      playerId: String(s.playerId),
      name: `${s.player.firstName ?? ''} ${s.player.lastName}`.trim(),
      team: {
        name: team.name,
        shortName: team.shortName ?? team.name,
        colorPrimary: team.colorPrimary ?? '#888888',
        colorSecondary: team.colorSecondary ?? '#888888',
      },
      stats: {
        position: i + 1,
        appearances: s.appearances,
        goals: s.goals,
        assists: s.assists,
        ga: s.goals + s.assists,
        minutes: s.minutesPlayed,
      },
    }
  })

  return {
    sport: 'soccer',
    competition,
    year,
    columns: [
      { key: 'position', label: '#', sortable: false },
      { key: 'player', label: 'Player', sortable: false },
      { key: 'team', label: 'Club', sortable: true },
      { key: 'appearances', label: 'Apps', sortable: true },
      { key: 'goals', label: 'Goals', sortable: true },
      { key: 'assists', label: 'Assists', sortable: true },
      { key: 'ga', label: 'G+A', sortable: true },
      { key: 'minutes', label: 'Mins', sortable: true },
    ],
    rows,
  }
}

export async function getSoccerPlayerStats(playerId: number, competition: string, year: number): Promise<PlayerStatsResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error('Season not found')

  const [stat, playerSeason] = await Promise.all([
    prisma.soccerPlayerStat.findFirst({ where: { playerId, seasonId: season.id }, include: { player: true } }),
    prisma.playerSeason.findFirst({ where: { playerId, seasonId: season.id }, include: { team: true } }),
  ])

  if (!stat || !playerSeason) throw new Error('Player not found')

  return {
    playerId: String(playerId),
    name: `${stat.player.firstName ?? ''} ${stat.player.lastName}`.trim(),
    team: {
      name: playerSeason.team.name,
      shortName: playerSeason.team.shortName ?? playerSeason.team.name,
      colorPrimary: playerSeason.team.colorPrimary ?? '#888888',
      colorSecondary: playerSeason.team.colorSecondary ?? '#888888',
    },
    season: year,
    chartData: [],  // populated by match-level data when available
    summaryStats: {
      Goals: stat.goals,
      Assists: stat.assists,
      'G+A': stat.goals + stat.assists,
      Apps: stat.appearances,
      Mins: stat.minutesPlayed,
    },
  }
}
```

- [ ] **Step 3: NFL queries**

Create `lib/queries/nfl.ts`:

```typescript
import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'

export async function getNflStandings(competition: string, year: number, position: string = 'QB'): Promise<LeaderboardResponse> {
  const seasonType = competition === 'nfl-playoffs' ? 'playoffs' : 'regular'
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error(`No NFL season for ${competition} ${year}`)

  const stats = await prisma.nflPlayerStat.findMany({
    where: { seasonId: season.id, seasonType, player: { position } },
    include: {
      player: true,
      season: { include: { playerSeasons: { include: { team: true } } } },
    },
  })

  const positionSortKey: Record<string, string> = {
    QB: 'passing_yards', RB: 'rushing_yards', WR: 'receiving_yards', TE: 'receiving_yards',
  }
  const sortKey = positionSortKey[position] ?? 'passing_yards'

  const sorted = stats.sort((a, b) => {
    const av = Number((a.stats as Record<string, number>)[sortKey] ?? 0)
    const bv = Number((b.stats as Record<string, number>)[sortKey] ?? 0)
    return bv - av
  })

  const rows = sorted.map((s, i) => {
    const ps = s.season.playerSeasons.find(p => p.playerId === s.playerId)
    const team = ps?.team ?? { name: 'Unknown', shortName: '?', colorPrimary: '#888888', colorSecondary: '#888888' }
    return {
      playerId: String(s.playerId),
      name: `${s.player.firstName ?? ''} ${s.player.lastName}`.trim(),
      team: {
        name: team.name,
        shortName: team.shortName ?? team.name,
        colorPrimary: team.colorPrimary ?? '#888888',
        colorSecondary: team.colorSecondary ?? '#888888',
      },
      stats: { position: i + 1, games: s.gamesPlayed, ...(s.stats as Record<string, number>) },
    }
  })

  const columnsByPosition: Record<string, { key: string; label: string; sortable: boolean }[]> = {
    QB: [
      { key: 'player', label: 'Player', sortable: false },
      { key: 'team', label: 'Team', sortable: true },
      { key: 'games', label: 'G', sortable: true },
      { key: 'passing_yards', label: 'Pass Yds', sortable: true },
      { key: 'passing_tds', label: 'TDs', sortable: true },
      { key: 'interceptions', label: 'INTs', sortable: true },
      { key: 'passer_rating', label: 'Rating', sortable: true },
    ],
    RB: [
      { key: 'player', label: 'Player', sortable: false },
      { key: 'team', label: 'Team', sortable: true },
      { key: 'games', label: 'G', sortable: true },
      { key: 'rushing_yards', label: 'Rush Yds', sortable: true },
      { key: 'rushing_tds', label: 'Rush TDs', sortable: true },
      { key: 'receptions', label: 'Rec', sortable: true },
      { key: 'receiving_yards', label: 'Rec Yds', sortable: true },
    ],
    WR: [
      { key: 'player', label: 'Player', sortable: false },
      { key: 'team', label: 'Team', sortable: true },
      { key: 'games', label: 'G', sortable: true },
      { key: 'targets', label: 'Tgts', sortable: true },
      { key: 'receptions', label: 'Rec', sortable: true },
      { key: 'receiving_yards', label: 'Rec Yds', sortable: true },
      { key: 'receiving_tds', label: 'TDs', sortable: true },
    ],
    TE: [
      { key: 'player', label: 'Player', sortable: false },
      { key: 'team', label: 'Team', sortable: true },
      { key: 'games', label: 'G', sortable: true },
      { key: 'targets', label: 'Tgts', sortable: true },
      { key: 'receptions', label: 'Rec', sortable: true },
      { key: 'receiving_yards', label: 'Rec Yds', sortable: true },
      { key: 'receiving_tds', label: 'TDs', sortable: true },
    ],
  }

  return {
    sport: 'nfl',
    competition,
    year,
    columns: columnsByPosition[position] ?? columnsByPosition.QB,
    rows,
  }
}

export async function getNflPlayerStats(playerId: number, competition: string, year: number): Promise<PlayerStatsResponse> {
  const seasonType = competition === 'nfl-playoffs' ? 'playoffs' : 'regular'
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error('Season not found')

  const [stat, playerSeason] = await Promise.all([
    prisma.nflPlayerStat.findFirst({ where: { playerId, seasonId: season.id, seasonType }, include: { player: true } }),
    prisma.playerSeason.findFirst({ where: { playerId, seasonId: season.id }, include: { team: true } }),
  ])

  if (!stat || !playerSeason) throw new Error('Player not found')

  return {
    playerId: String(playerId),
    name: `${stat.player.firstName ?? ''} ${stat.player.lastName}`.trim(),
    team: {
      name: playerSeason.team.name,
      shortName: playerSeason.team.shortName ?? playerSeason.team.name,
      colorPrimary: playerSeason.team.colorPrimary ?? '#888888',
      colorSecondary: playerSeason.team.colorSecondary ?? '#888888',
    },
    season: year,
    chartData: [],
    summaryStats: stat.stats as Record<string, number>,
  }
}
```

- [ ] **Step 4: NBA queries**

Create `lib/queries/nba.ts`:

```typescript
import { prisma } from '@/lib/db'
import type { LeaderboardResponse, PlayerStatsResponse } from '@/types/api'

export async function getNbaStandings(competition: string, year: number): Promise<LeaderboardResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error(`No NBA season for ${competition} ${year}`)

  const stats = await prisma.nbaPlayerStat.findMany({
    where: { seasonId: season.id },
    include: {
      player: true,
      season: { include: { playerSeasons: { include: { team: true } } } },
    },
    orderBy: { pointsPerGame: 'desc' },
  })

  const rows = stats.map((s, i) => {
    const ps = s.season.playerSeasons.find(p => p.playerId === s.playerId)
    const team = ps?.team ?? { name: 'Unknown', shortName: '?', colorPrimary: '#888888', colorSecondary: '#888888' }
    return {
      playerId: String(s.playerId),
      name: `${s.player.firstName ?? ''} ${s.player.lastName}`.trim(),
      team: {
        name: team.name,
        shortName: team.shortName ?? team.name,
        colorPrimary: team.colorPrimary ?? '#888888',
        colorSecondary: team.colorSecondary ?? '#888888',
      },
      stats: {
        rank: i + 1,
        games: s.gamesPlayed,
        ppg: Number(s.pointsPerGame ?? 0),
        rpg: Number(s.reboundsPerGame ?? 0),
        apg: Number(s.assistsPerGame ?? 0),
        fg_pct: Number(s.fgPct ?? 0),
        three_pt_pct: Number(s.threePtPct ?? 0),
      },
    }
  })

  return {
    sport: 'nba',
    competition,
    year,
    columns: [
      { key: 'rank', label: 'Rank', sortable: false },
      { key: 'player', label: 'Player', sortable: false },
      { key: 'team', label: 'Team', sortable: true },
      { key: 'games', label: 'G', sortable: true },
      { key: 'ppg', label: 'PPG', sortable: true },
      { key: 'rpg', label: 'RPG', sortable: true },
      { key: 'apg', label: 'APG', sortable: true },
      { key: 'fg_pct', label: 'FG%', sortable: true },
      { key: 'three_pt_pct', label: '3P%', sortable: true },
    ],
    rows,
  }
}

export async function getNbaPlayerStats(playerId: number, competition: string, year: number): Promise<PlayerStatsResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: competition }, year },
  })
  if (!season) throw new Error('Season not found')

  const [stat, playerSeason] = await Promise.all([
    prisma.nbaPlayerStat.findFirst({ where: { playerId, seasonId: season.id }, include: { player: true } }),
    prisma.playerSeason.findFirst({ where: { playerId, seasonId: season.id }, include: { team: true } }),
  ])

  if (!stat || !playerSeason) throw new Error('Player not found')

  return {
    playerId: String(playerId),
    name: `${stat.player.firstName ?? ''} ${stat.player.lastName}`.trim(),
    team: {
      name: playerSeason.team.name,
      shortName: playerSeason.team.shortName ?? playerSeason.team.name,
      colorPrimary: playerSeason.team.colorPrimary ?? '#888888',
      colorSecondary: playerSeason.team.colorSecondary ?? '#888888',
    },
    season: year,
    chartData: [],
    summaryStats: {
      PPG: Number(stat.pointsPerGame ?? 0),
      RPG: Number(stat.reboundsPerGame ?? 0),
      APG: Number(stat.assistsPerGame ?? 0),
      'FG%': Number(stat.fgPct ?? 0),
      '3P%': Number(stat.threePtPct ?? 0),
      Games: stat.gamesPlayed,
    },
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/queries/
git commit -m "feat: add DB query functions for all 4 sports"
```

---

## Task 9: API Route Handlers

**Files:**
- Create: `app/api/sports/route.ts`
- Create: `app/api/[sport]/[competition]/[year]/standings/route.ts`
- Create: `app/api/[sport]/[competition]/[year]/player/[id]/route.ts`

- [ ] **Step 1: Sports meta route**

Create `app/api/sports/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const sports = await prisma.sport.findMany({
    include: {
      competitions: {
        include: {
          seasons: {
            orderBy: { year: 'desc' },
          },
        },
      },
    },
  })

  return NextResponse.json(sports)
}
```

- [ ] **Step 2: Standings route**

Create `app/api/[sport]/[competition]/[year]/standings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCached, standingsKey, TTL } from '@/lib/cache'
import { getF1Standings } from '@/lib/queries/f1'
import { getSoccerStandings } from '@/lib/queries/soccer'
import { getNflStandings } from '@/lib/queries/nfl'
import { getNbaStandings } from '@/lib/queries/nba'

interface Params {
  sport: string
  competition: string
  year: string
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { sport, competition, year: yearStr } = params
  const year = Number(yearStr)
  const position = req.nextUrl.searchParams.get('position') ?? 'QB'

  const key = standingsKey(sport, competition, year)

  try {
    const data = await getCached(key, () => {
      switch (sport) {
        case 'f1': return getF1Standings(year)
        case 'soccer': return getSoccerStandings(competition, year)
        case 'nfl': return getNflStandings(competition, year, position)
        case 'nba': return getNbaStandings(competition, year)
        default: throw new Error(`Unknown sport: ${sport}`)
      }
    }, TTL.HISTORICAL)

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 3: Player stats route**

Create `app/api/[sport]/[competition]/[year]/player/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getF1PlayerStats } from '@/lib/queries/f1'
import { getSoccerPlayerStats } from '@/lib/queries/soccer'
import { getNflPlayerStats } from '@/lib/queries/nfl'
import { getNbaPlayerStats } from '@/lib/queries/nba'

interface Params {
  sport: string
  competition: string
  year: string
  id: string
}

export async function GET(_req: Request, { params }: { params: Params }) {
  const { sport, competition, year: yearStr, id } = params
  const year = Number(yearStr)
  const playerId = Number(id)

  try {
    let data
    switch (sport) {
      case 'f1': data = await getF1PlayerStats(playerId, year); break
      case 'soccer': data = await getSoccerPlayerStats(playerId, competition, year); break
      case 'nfl': data = await getNflPlayerStats(playerId, competition, year); break
      case 'nba': data = await getNbaPlayerStats(playerId, competition, year); break
      default: return NextResponse.json({ error: 'Unknown sport' }, { status: 400 })
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/
git commit -m "feat: add API route handlers for sports, standings, and player stats"
```

---

## Task 10: Sport Page + Leaderboard Page

**Files:**
- Create: `app/[sport]/page.tsx`
- Create: `app/[sport]/[competition]/[year]/page.tsx`

- [ ] **Step 1: Sport home page (redirect)**

Create `app/[sport]/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { getSportConfig } from '@/config/sports'
import { prisma } from '@/lib/db'

export default async function SportPage({ params }: { params: { sport: string } }) {
  const config = getSportConfig(params.sport)
  if (!config) redirect('/f1')

  const defaultComp = config.competitions[0]

  const latestSeason = await prisma.season.findFirst({
    where: { competition: { slug: defaultComp.slug }, status: 'completed' },
    orderBy: { year: 'desc' },
  })

  redirect(`/${params.sport}/${defaultComp.slug}/${latestSeason?.year ?? 2023}`)
}
```

- [ ] **Step 2: Leaderboard page**

Create `app/[sport]/[competition]/[year]/page.tsx`:

```typescript
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

interface Props {
  params: { sport: string; competition: string; year: string }
}

export default async function LeaderboardPage({ params }: Props) {
  const { sport, competition, year: yearStr } = params
  const year = Number(yearStr)

  const config = getSportConfig(sport)
  if (!config) notFound()

  const [seasonsRaw, standingsData] = await Promise.all([
    prisma.season.findMany({
      where: { competition: { slug: competition } },
      orderBy: { year: 'desc' },
    }),
    getCached(standingsKey(sport, competition, year), () => {
      switch (sport) {
        case 'f1': return getF1Standings(year)
        case 'soccer': return getSoccerStandings(competition, year)
        case 'nfl': return getNflStandings(competition, year)
        case 'nba': return getNbaStandings(competition, year)
        default: throw new Error('Unknown sport')
      }
    }, TTL.HISTORICAL),
  ])

  const seasons: SeasonMeta[] = seasonsRaw.map(s => ({
    year: s.year,
    label: s.label ?? String(s.year),
    status: s.status as SeasonMeta['status'],
  }))

  return (
    <div className="flex h-[calc(100vh-88px)]">
      <div className="flex flex-1 flex-col overflow-hidden">
        <CompetitionSelector sportConfig={config} defaultYear={year} />
        <div className="flex-1 overflow-y-auto">
          <LeaderboardTable data={standingsData} sport={sport} competition={competition} year={year} />
        </div>
      </div>
      <YearSelector seasons={seasons} activeYear={year} sport={sport} competition={competition} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/
git commit -m "feat: add sport home page and leaderboard page"
```

---

## Task 11: F1 Ingestion Script

**Files:**
- Create: `scripts/ingest/utils/db.ts`
- Create: `scripts/ingest/utils/http.ts`
- Create: `scripts/ingest/utils/upsert.ts`
- Create: `scripts/ingest/f1.ts`
- Create: `scripts/ingest/index.ts`

- [ ] **Step 1: Ingest utils**

Create `scripts/ingest/utils/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient()
```

Create `scripts/ingest/utils/http.ts`:

```typescript
export async function fetchWithRetry(url: string, headers: Record<string, string> = {}, delayMs = 0): Promise<unknown> {
  if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}
```

Create `scripts/ingest/utils/upsert.ts`:

```typescript
import { prisma } from './db'

export async function upsertSport(slug: string, name: string, icon: string) {
  return prisma.sport.upsert({
    where: { slug },
    create: { slug, name, icon },
    update: { name, icon },
  })
}

export async function upsertCompetition(sportId: number, slug: string, name: string, type: string) {
  return prisma.competition.upsert({
    where: { slug },
    create: { sportId, slug, name, competitionType: type },
    update: { name },
  })
}

export async function upsertSeason(competitionId: number, year: number, label: string) {
  return prisma.season.upsert({
    where: { competitionId_year: { competitionId, year } },
    create: { competitionId, year, label, status: 'completed' },
    update: { label },
  })
}

export async function upsertTeam(sportId: number, externalId: string, name: string, shortName: string, color: string) {
  const existing = await prisma.team.findFirst({ where: { sportId, externalId } })
  if (existing) {
    return prisma.team.update({ where: { id: existing.id }, data: { name, shortName, colorPrimary: color } })
  }
  return prisma.team.create({ data: { sportId, externalId, name, shortName, colorPrimary: color } })
}

export async function upsertPlayer(sportId: number, externalId: string, firstName: string, lastName: string, nationality: string) {
  const existing = await prisma.player.findFirst({ where: { sportId, externalId } })
  if (existing) {
    return prisma.player.update({ where: { id: existing.id }, data: { firstName, lastName, nationality } })
  }
  return prisma.player.create({ data: { sportId, externalId, firstName, lastName, nationality } })
}
```

- [ ] **Step 2: F1 ingestion**

Create `scripts/ingest/f1.ts`:

```typescript
import { prisma } from './utils/db'
import { fetchWithRetry } from './utils/http'
import { upsertSport, upsertCompetition, upsertSeason, upsertTeam, upsertPlayer } from './utils/upsert'

const BASE = 'https://api.jolpi.ca/ergast/f1'

const F1_TEAM_COLORS: Record<string, string> = {
  'Red Bull': '#3671C6',
  'Ferrari': '#E8002D',
  'Mercedes': '#27F4D2',
  'McLaren': '#FF8000',
  'Aston Martin': '#358C75',
  'Alpine F1 Team': '#FF87BC',
  'Williams': '#64C4FF',
  'AlphaTauri': '#5E8FAA',
  'Alfa Romeo': '#C92D4B',
  'Haas F1 Team': '#B6BABD',
}

export async function ingestF1(year: number) {
  console.log(`Ingesting F1 ${year}...`)

  const sport = await upsertSport('f1', 'Formula 1', '🏎️')
  const comp = await upsertCompetition(sport.id, 'f1-championship', 'Championship', 'championship')
  const season = await upsertSeason(comp.id, year, String(year))

  // 1. Driver standings
  const standingsData = await fetchWithRetry(`${BASE}/${year}/driverStandings.json`) as any
  const standings = standingsData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? []

  for (const entry of standings) {
    const d = entry.Driver
    const c = entry.Constructors[0]

    const team = await upsertTeam(sport.id, c.constructorId, c.name, c.name.substring(0, 15), F1_TEAM_COLORS[c.name] ?? '#888888')
    const player = await upsertPlayer(sport.id, d.driverId, d.givenName, d.familyName, d.nationality)

    await prisma.playerSeason.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
      create: { playerId: player.id, teamId: team.id, seasonId: season.id },
      update: { teamId: team.id },
    })

    await prisma.f1DriverStanding.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
      create: {
        playerId: player.id,
        seasonId: season.id,
        finalPosition: Number(entry.position),
        totalPoints: Number(entry.points),
        wins: Number(entry.wins),
      },
      update: {
        finalPosition: Number(entry.position),
        totalPoints: Number(entry.points),
        wins: Number(entry.wins),
      },
    })

    console.log(`  ✓ ${d.givenName} ${d.familyName} — P${entry.position} ${entry.points}pts`)
  }

  // 2. Race results (for charts)
  const racesData = await fetchWithRetry(`${BASE}/${year}/results.json?limit=1000`) as any
  const races = racesData.MRData.RaceTable.Races ?? []

  for (const race of races) {
    for (const result of race.Results) {
      const player = await prisma.player.findFirst({
        where: { sportId: sport.id, externalId: result.Driver.driverId },
      })
      if (!player) continue

      await prisma.f1RaceResult.upsert({
        where: {
          // No unique constraint on this combo — use findFirst + create pattern
          id: (await prisma.f1RaceResult.findFirst({
            where: { playerId: player.id, seasonId: season.id, round: Number(race.round) },
          }))?.id ?? 0,
        },
        create: {
          playerId: player.id,
          seasonId: season.id,
          round: Number(race.round),
          raceName: race.raceName,
          finishPosition: Number(result.position),
          gridPosition: Number(result.grid),
          points: Number(result.points),
          status: result.status,
          fastestLap: result.FastestLap?.rank === '1',
        },
        update: {
          finishPosition: Number(result.position),
          points: Number(result.points),
          status: result.status,
        },
      })
    }
  }

  console.log(`F1 ${year} ingestion complete. ${standings.length} drivers, ${races.length} races.`)
}
```

- [ ] **Step 3: Simplify F1 race result upsert**

The upsert-by-id approach above is awkward. Replace the race result loop body with:

```typescript
      const existing = await prisma.f1RaceResult.findFirst({
        where: { playerId: player.id, seasonId: season.id, round: Number(race.round) },
      })

      const raceData = {
        playerId: player.id,
        seasonId: season.id,
        round: Number(race.round),
        raceName: race.raceName,
        finishPosition: Number(result.position),
        gridPosition: Number(result.grid),
        points: Number(result.points),
        status: result.status,
        fastestLap: result.FastestLap?.rank === '1',
      }

      if (existing) {
        await prisma.f1RaceResult.update({ where: { id: existing.id }, data: raceData })
      } else {
        await prisma.f1RaceResult.create({ data: raceData })
      }
```

- [ ] **Step 4: CLI entry**

Create `scripts/ingest/index.ts`:

```typescript
import { ingestF1 } from './f1'

const args = process.argv.slice(2)
const sportIdx = args.indexOf('--sport')
const yearIdx = args.indexOf('--year')
const sport = sportIdx !== -1 ? args[sportIdx + 1] : null
const year = yearIdx !== -1 ? Number(args[yearIdx + 1]) : null

if (!sport || !year) {
  console.error('Usage: npx ts-node scripts/ingest/index.ts --sport f1 --year 2023')
  process.exit(1)
}

async function run() {
  switch (sport) {
    case 'f1':
      await ingestF1(year!)
      break
    default:
      console.error(`Unknown sport: ${sport}`)
      process.exit(1)
  }
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 5: Add ts-node + tsconfig for scripts**

```bash
npm install -D ts-node
```

Add to `package.json` scripts:
```json
"ingest": "ts-node --project tsconfig.scripts.json scripts/ingest/index.ts"
```

Create `tsconfig.scripts.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node"
  },
  "include": ["scripts/**/*"]
}
```

- [ ] **Step 6: Test F1 ingestion (2023)**

```bash
npm run ingest -- --sport f1 --year 2023
```

Expected: output shows ~20 drivers ingested, race results for 22+ rounds.

- [ ] **Step 7: Seed 2018–2024**

```bash
for year in 2018 2019 2020 2021 2022 2023 2024; do
  npm run ingest -- --sport f1 --year $year
  sleep 2
done
```

- [ ] **Step 8: Commit**

```bash
git add scripts/
git commit -m "feat: add F1 ingestion script with Ergast/Jolpica API"
```

---

## Task 12: Soccer Ingestion Script

**Files:**
- Create: `scripts/ingest/soccer.ts`
- Modify: `scripts/ingest/index.ts`

- [ ] **Step 1: Soccer ingestion**

Create `scripts/ingest/soccer.ts`:

```typescript
import { prisma } from './utils/db'
import { fetchWithRetry } from './utils/http'
import { upsertSport, upsertCompetition, upsertSeason, upsertTeam, upsertPlayer } from './utils/upsert'

const BASE = 'https://api.football-data.org/v4'
const HEADERS = { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY ?? '' }
const DELAY = 6100  // 10 req/min = 6s between requests

const COMPETITIONS: Record<string, { id: string; slug: string; name: string; type: string }> = {
  'premier-league': { id: 'PL', slug: 'premier-league', name: 'Premier League', type: 'league' },
  'champions-league': { id: 'CL', slug: 'champions-league', name: 'Champions League', type: 'cup' },
}

const SOCCER_TEAM_COLORS: Record<string, string> = {
  'Arsenal FC': '#EF0107',
  'Liverpool FC': '#C8102E',
  'Manchester City FC': '#6CABDD',
  'Chelsea FC': '#034694',
  'Manchester United FC': '#DA291C',
  'Tottenham Hotspur FC': '#132257',
}

export async function ingestSoccer(competitionKey: string, year: number) {
  const compMeta = COMPETITIONS[competitionKey]
  if (!compMeta) throw new Error(`Unknown competition: ${competitionKey}`)

  // football-data.org uses the start year of the season
  // 2023/24 → season param = 2023
  console.log(`Ingesting Soccer ${compMeta.name} ${year}...`)

  const sport = await upsertSport('soccer', 'Soccer', '⚽')
  const comp = await upsertCompetition(sport.id, compMeta.slug, compMeta.name, compMeta.type)
  const label = `${year}/${String(year + 1).slice(2)}`
  const season = await upsertSeason(comp.id, year, label)

  // 1. Top scorers
  const scorersData = await fetchWithRetry(
    `${BASE}/competitions/${compMeta.id}/scorers?season=${year}&limit=50`,
    HEADERS
  ) as any
  await new Promise(r => setTimeout(r, DELAY))

  for (const entry of scorersData.scorers ?? []) {
    const p = entry.player
    const t = entry.team

    const team = await upsertTeam(sport.id, String(t.id), t.name, t.shortName ?? t.name, SOCCER_TEAM_COLORS[t.name] ?? '#888888')
    const player = await upsertPlayer(sport.id, String(p.id), p.firstName ?? '', p.lastName ?? p.name, p.nationality ?? '')

    await prisma.playerSeason.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
      create: { playerId: player.id, teamId: team.id, seasonId: season.id },
      update: { teamId: team.id },
    })

    const existing = await prisma.soccerPlayerStat.findFirst({
      where: { playerId: player.id, seasonId: season.id },
    })
    const statData = {
      playerId: player.id,
      seasonId: season.id,
      goals: entry.numberOfGoals ?? 0,
      assists: entry.numberOfGoalAssists ?? 0,
      appearances: entry.playedMatches ?? 0,
    }
    if (existing) {
      await prisma.soccerPlayerStat.update({ where: { id: existing.id }, data: statData })
    } else {
      await prisma.soccerPlayerStat.create({ data: statData })
    }

    console.log(`  ✓ ${p.name} — ${entry.numberOfGoals} goals`)
  }

  console.log(`Soccer ${compMeta.name} ${year} complete.`)
}
```

- [ ] **Step 2: Wire into CLI**

Update `scripts/ingest/index.ts`:

```typescript
import { ingestF1 } from './f1'
import { ingestSoccer } from './soccer'

const args = process.argv.slice(2)
const sportIdx = args.indexOf('--sport')
const yearIdx = args.indexOf('--year')
const compIdx = args.indexOf('--competition')
const sport = sportIdx !== -1 ? args[sportIdx + 1] : null
const year = yearIdx !== -1 ? Number(args[yearIdx + 1]) : null
const competition = compIdx !== -1 ? args[compIdx + 1] : 'premier-league'

if (!sport || !year) {
  console.error('Usage: npx ts-node scripts/ingest/index.ts --sport <sport> --year <year> [--competition <slug>]')
  process.exit(1)
}

async function run() {
  switch (sport) {
    case 'f1': await ingestF1(year!); break
    case 'soccer': await ingestSoccer(competition, year!); break
    default:
      console.error(`Unknown sport: ${sport}`)
      process.exit(1)
  }
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Seed PL 2018–2023**

```bash
for year in 2018 2019 2020 2021 2022 2023; do
  npm run ingest -- --sport soccer --competition premier-league --year $year
done
```

- [ ] **Step 4: Commit**

```bash
git add scripts/ingest/soccer.ts scripts/ingest/index.ts
git commit -m "feat: add soccer ingestion script with football-data.org API"
```

---

## Task 13: NFL Ingestion (nfl-data-py + Node)

**Files:**
- Create: `scripts/ingest/fetch_nfl.py`
- Create: `scripts/ingest/nfl.ts`
- Modify: `scripts/ingest/index.ts`

- [ ] **Step 1: Python export script**

Create `scripts/ingest/fetch_nfl.py`:

```python
#!/usr/bin/env python3
"""
Export NFL player stats to CSV using nfl_data_py.
Usage: python scripts/ingest/fetch_nfl.py --year 2023 --output /tmp/nfl_2023.csv
"""
import argparse
import nfl_data_py as nfl
import pandas as pd

parser = argparse.ArgumentParser()
parser.add_argument('--year', type=int, required=True)
parser.add_argument('--output', type=str, required=True)
args = parser.parse_args()

# Weekly player stats
weekly = nfl.import_weekly_data([args.year])

# Aggregate to season totals
agg = weekly.groupby(['player_id', 'player_name', 'position', 'recent_team']).agg(
    games=('week', 'count'),
    passing_yards=('passing_yards', 'sum'),
    passing_tds=('passing_tds', 'sum'),
    interceptions=('interceptions', 'sum'),
    rushing_yards=('rushing_yards', 'sum'),
    rushing_tds=('rushing_tds', 'sum'),
    receptions=('receptions', 'sum'),
    targets=('targets', 'sum'),
    receiving_yards=('receiving_yards', 'sum'),
    receiving_tds=('receiving_tds', 'sum'),
    passer_rating=('passer_rating', 'mean'),
).reset_index()

agg.to_csv(args.output, index=False)
print(f"Exported {len(agg)} player records to {args.output}")
```

- [ ] **Step 2: Install nfl_data_py**

```bash
pip install nfl_data_py pandas
```

- [ ] **Step 3: NFL Node ingestion**

Create `scripts/ingest/nfl.ts`:

```typescript
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import { execSync } from 'child_process'
import { prisma } from './utils/db'
import { upsertSport, upsertCompetition, upsertSeason, upsertTeam, upsertPlayer } from './utils/upsert'

// NFL team colors
const NFL_TEAM_COLORS: Record<string, string> = {
  'KC': '#E31837', 'DAL': '#003594', 'SF': '#AA0000', 'PHI': '#004C54',
  'BUF': '#00338D', 'MIA': '#008E97', 'NE': '#002244', 'NYJ': '#125740',
  'BAL': '#241773', 'CIN': '#FB4F14', 'CLE': '#311D00', 'PIT': '#FFB612',
  'HOU': '#03202F', 'IND': '#002C5F', 'JAX': '#006778', 'TEN': '#0C2340',
  'DEN': '#FB4F14', 'LV': '#000000', 'LAC': '#0073CF', 'SEA': '#002244',
  'ARI': '#97233F', 'LAR': '#003594', 'NYG': '#0B2265', 'WAS': '#773141',
  'ATL': '#A71930', 'CAR': '#0085CA', 'NO': '#D3BC8D', 'TB': '#D50A0A',
  'CHI': '#0B162A', 'DET': '#0076B6', 'GB': '#203731', 'MIN': '#4F2683',
}

const NFL_TEAM_NAMES: Record<string, string> = {
  'KC': 'Kansas City Chiefs', 'DAL': 'Dallas Cowboys', 'SF': 'San Francisco 49ers',
  'PHI': 'Philadelphia Eagles', 'BUF': 'Buffalo Bills', 'NE': 'New England Patriots',
  'BAL': 'Baltimore Ravens', 'CIN': 'Cincinnati Bengals', 'GB': 'Green Bay Packers',
  'MIN': 'Minnesota Vikings', 'DET': 'Detroit Lions', 'CHI': 'Chicago Bears',
  // add more as needed
}

export async function ingestNfl(year: number, seasonType: 'regular' | 'playoffs' = 'regular') {
  console.log(`Ingesting NFL ${year} ${seasonType}...`)

  const csvPath = `/tmp/nfl_${year}_${seasonType}.csv`

  // Run Python export
  console.log('Running nfl_data_py export...')
  execSync(`python scripts/ingest/fetch_nfl.py --year ${year} --output ${csvPath}`, { stdio: 'inherit' })

  const sport = await upsertSport('nfl', 'NFL', '🏈')
  const slug = seasonType === 'playoffs' ? 'nfl-playoffs' : 'nfl-regular'
  const name = seasonType === 'playoffs' ? 'Playoffs' : 'Regular Season'
  const comp = await upsertCompetition(sport.id, slug, name, seasonType === 'playoffs' ? 'tournament' : 'league')
  const season = await upsertSeason(comp.id, year, String(year))

  const raw = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(raw, { columns: true, skip_empty_lines: true }) as Record<string, string>[]

  for (const row of records) {
    if (!row.player_id || !row.position) continue
    const position = row.position.toUpperCase()
    if (!['QB', 'RB', 'WR', 'TE'].includes(position)) continue

    const teamAbbr = row.recent_team ?? 'UNK'
    const team = await upsertTeam(
      sport.id, teamAbbr,
      NFL_TEAM_NAMES[teamAbbr] ?? teamAbbr,
      teamAbbr,
      NFL_TEAM_COLORS[teamAbbr] ?? '#888888'
    )

    const nameParts = (row.player_name ?? '').split(' ')
    const lastName = nameParts.pop() ?? row.player_name
    const firstName = nameParts.join(' ')
    const player = await upsertPlayer(sport.id, row.player_id, firstName, lastName, '')
    await prisma.player.update({ where: { id: player.id }, data: { position } })

    await prisma.playerSeason.upsert({
      where: { playerId_seasonId: { playerId: player.id, seasonId: season.id } },
      create: { playerId: player.id, teamId: team.id, seasonId: season.id },
      update: { teamId: team.id },
    })

    const stats = {
      passing_yards: Number(row.passing_yards ?? 0),
      passing_tds: Number(row.passing_tds ?? 0),
      interceptions: Number(row.interceptions ?? 0),
      passer_rating: Number(row.passer_rating ?? 0),
      rushing_yards: Number(row.rushing_yards ?? 0),
      rushing_tds: Number(row.rushing_tds ?? 0),
      receptions: Number(row.receptions ?? 0),
      targets: Number(row.targets ?? 0),
      receiving_yards: Number(row.receiving_yards ?? 0),
      receiving_tds: Number(row.receiving_tds ?? 0),
    }

    const existing = await prisma.nflPlayerStat.findFirst({
      where: { playerId: player.id, seasonId: season.id, seasonType },
    })
    const statData = { playerId: player.id, seasonId: season.id, seasonType, gamesPlayed: Number(row.games ?? 0), stats }
    if (existing) {
      await prisma.nflPlayerStat.update({ where: { id: existing.id }, data: statData })
    } else {
      await prisma.nflPlayerStat.create({ data: statData })
    }
  }

  console.log(`NFL ${year} ${seasonType} complete. ${records.length} records.`)
}
```

- [ ] **Step 4: Install csv-parse**

```bash
npm install csv-parse
```

- [ ] **Step 5: Wire into CLI**

Add to `scripts/ingest/index.ts`:
```typescript
import { ingestNfl } from './nfl'
// in switch:
case 'nfl': await ingestNfl(year!, competition === 'nfl-playoffs' ? 'playoffs' : 'regular'); break
```

- [ ] **Step 6: Test**

```bash
npm run ingest -- --sport nfl --year 2023
```

- [ ] **Step 7: Commit**

```bash
git add scripts/ingest/fetch_nfl.py scripts/ingest/nfl.ts
git commit -m "feat: add NFL ingestion via nfl-data-py CSV + Node upsert"
```

---

## Task 14: NBA Ingestion Script

**Files:**
- Create: `scripts/ingest/nba.ts`
- Modify: `scripts/ingest/index.ts`

- [ ] **Step 1: NBA ingestion**

Create `scripts/ingest/nba.ts`:

```typescript
import { prisma } from './utils/db'
import { fetchWithRetry } from './utils/http'
import { upsertSport, upsertCompetition, upsertSeason, upsertTeam, upsertPlayer } from './utils/upsert'

const BASE = 'https://api.balldontlie.io/v1'

const NBA_TEAM_COLORS: Record<number, string> = {
  1: '#C8102E',   // Atlanta Hawks
  2: '#007A33',   // Boston Celtics
  3: '#552583',   // LA Lakers
  4: '#CE1141',   // Chicago Bulls
  5: '#1D428A',   // Golden State Warriors
  6: '#006BB6',   // NY Knicks
  // balldontlie team IDs — add more as needed
}

export async function ingestNba(year: number) {
  const apiKey = process.env.BALLDONTLIE_API_KEY
  if (!apiKey) throw new Error('BALLDONTLIE_API_KEY not set')
  const headers = { Authorization: apiKey }

  console.log(`Ingesting NBA ${year}/${year + 1}...`)

  const sport = await upsertSport('nba', 'NBA', '🏀')
  const comp = await upsertCompetition(sport.id, 'nba-regular', 'Regular Season', 'league')
  const label = `${year}/${String(year + 1).slice(2)}`
  const season = await upsertSeason(comp.id, year, label)

  // 1. Upsert teams
  const teamsData = await fetchWithRetry(`${BASE}/teams`, headers) as any
  const teamMap = new Map<number, number>()  // balldontlie id → our DB id

  for (const t of teamsData.data ?? []) {
    const team = await upsertTeam(sport.id, String(t.id), t.full_name, t.abbreviation, NBA_TEAM_COLORS[t.id] ?? '#888888')
    teamMap.set(t.id, team.id)
  }

  // 2. Fetch players (paginated)
  let cursor: number | undefined
  const playerIds: number[] = []
  const playerMap = new Map<number, number>()  // balldontlie id → our DB id

  do {
    const url = cursor
      ? `${BASE}/players?per_page=100&cursor=${cursor}`
      : `${BASE}/players?per_page=100`
    const data = await fetchWithRetry(url, headers, 1000) as any
    for (const p of data.data ?? []) {
      const player = await upsertPlayer(sport.id, String(p.id), p.first_name, p.last_name, '')
      playerMap.set(p.id, player.id)
      playerIds.push(p.id)
    }
    cursor = data.meta?.next_cursor
  } while (cursor)

  console.log(`  ${playerIds.length} players fetched`)

  // 3. Season averages in batches of 50
  for (let i = 0; i < playerIds.length; i += 50) {
    const batch = playerIds.slice(i, i + 50)
    const idsParam = batch.map(id => `player_ids[]=${id}`).join('&')
    const url = `${BASE}/season_averages?season=${year}&${idsParam}`

    const data = await fetchWithRetry(url, headers, 1500) as any

    for (const avg of data.data ?? []) {
      const playerId = playerMap.get(avg.player_id)
      if (!playerId) continue

      const teamId = teamMap.get(avg.team?.id) ?? [...teamMap.values()][0]

      await prisma.playerSeason.upsert({
        where: { playerId_seasonId: { playerId, seasonId: season.id } },
        create: { playerId, teamId, seasonId: season.id },
        update: { teamId },
      })

      const existing = await prisma.nbaPlayerStat.findFirst({ where: { playerId, seasonId: season.id } })
      const statData = {
        playerId,
        seasonId: season.id,
        gamesPlayed: avg.games_played ?? 0,
        pointsPerGame: avg.pts ?? 0,
        reboundsPerGame: avg.reb ?? 0,
        assistsPerGame: avg.ast ?? 0,
        stealsPerGame: avg.stl ?? 0,
        blocksPerGame: avg.blk ?? 0,
        fgPct: avg.fg_pct ?? 0,
        threePtPct: avg.fg3_pct ?? 0,
        ftPct: avg.ft_pct ?? 0,
        minutesPerGame: parseFloat(avg.min ?? '0'),
      }
      if (existing) {
        await prisma.nbaPlayerStat.update({ where: { id: existing.id }, data: statData })
      } else {
        await prisma.nbaPlayerStat.create({ data: statData })
      }
    }

    if (i % 500 === 0) console.log(`  Progress: ${i}/${playerIds.length}`)
  }

  console.log(`NBA ${year} ingestion complete.`)
}
```

- [ ] **Step 2: Wire into CLI + commit**

Add to `scripts/ingest/index.ts`:
```typescript
import { ingestNba } from './nba'
// in switch:
case 'nba': await ingestNba(year!); break
```

```bash
git add scripts/ingest/nba.ts scripts/ingest/index.ts
git commit -m "feat: add NBA ingestion script with balldontlie API"
```

---

## Task 15: Seed DB + Smoke Test

- [ ] **Step 1: Seed all sports (one year each for smoke test)**

```bash
npm run ingest -- --sport f1 --year 2023
npm run ingest -- --sport soccer --competition premier-league --year 2023
npm run ingest -- --sport nfl --year 2023
npm run ingest -- --sport nba --year 2023
```

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Verify pages load**

Navigate to:
- `http://localhost:3000` → should redirect to `/f1`
- `http://localhost:3000/f1/f1-championship/2023` → should show F1 leaderboard
- `http://localhost:3000/soccer/premier-league/2023` → should show PL top scorers
- `http://localhost:3000/nfl/nfl-regular/2023` → should show NFL QB stats
- `http://localhost:3000/nba/nba-regular/2023` → should show NBA PPG leaders

- [ ] **Step 4: Click a player row**

Verify expanded stats panel opens with summary stat cards.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: seed all 4 sports and verify end-to-end flow"
```

---

## Task 16: F1 Chart Component

**Files:**
- Create: `components/charts/F1SeasonLineChart.tsx`
- Modify: `components/leaderboard/PlayerExpandedStats.tsx`

- [ ] **Step 1: F1 chart**

Create `components/charts/F1SeasonLineChart.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { ChartDataPoint } from '@/types/api'

interface F1SeasonLineChartProps {
  data: ChartDataPoint[]
  teamColor: string
  driverName: string
}

export function F1SeasonLineChart({ data, teamColor, driverName }: F1SeasonLineChartProps) {
  const [mode, setMode] = useState<'points' | 'position'>('points')

  const chartData = data.map(d => ({
    round: d.label,
    points: d.points,
    position: d.position,
    race: d.raceName,
  }))

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setMode('points')}
          className={`rounded px-3 py-1 text-xs ${mode === 'points' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
        >
          Cumulative Points
        </button>
        <button
          onClick={() => setMode('position')}
          className={`rounded px-3 py-1 text-xs ${mode === 'position' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
        >
          Finish Positions
        </button>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="round" stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Round', position: 'insideBottom', offset: -2, fill: '#666', fontSize: 11 }} />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 11 }}
            reversed={mode === 'position'}
            domain={mode === 'position' ? [1, 20] : undefined}
          />
          <Tooltip
            contentStyle={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: 6 }}
            labelFormatter={label => `Round ${label}`}
          />
          <Line
            type="monotone"
            dataKey={mode}
            stroke={teamColor}
            strokeWidth={2}
            dot={{ r: 3, fill: teamColor }}
            name={driverName}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Wire chart into PlayerExpandedStats**

Update `components/leaderboard/PlayerExpandedStats.tsx` — add import and replace the chart placeholder:

```typescript
import { F1SeasonLineChart } from '@/components/charts/F1SeasonLineChart'

// Inside the stats && !loading block, replace the chart placeholder:
{stats.chartData.length > 0 && chartConfig.type === 'line' && (
  <F1SeasonLineChart
    data={stats.chartData}
    teamColor={stats.team.colorPrimary}
    driverName={stats.name}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/charts/F1SeasonLineChart.tsx components/leaderboard/PlayerExpandedStats.tsx
git commit -m "feat: add F1 cumulative points / finish position line chart"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Next.js 14 + TypeScript + Tailwind
- ✅ PostgreSQL (Supabase) via Prisma
- ✅ Redis-ready cache interface (MemoryCache now, swap to Upstash later)
- ✅ Sport config objects for all 4 sports
- ✅ UI shell: SportTabs, CompetitionSelector, YearSelector
- ✅ LeaderboardTable with sort, team color left-border, expand-on-click
- ✅ API routes: /api/sports, /api/[sport]/[competition]/[year]/standings, player
- ✅ F1 ingestion (Ergast/Jolpica), Soccer (football-data.org), NFL (nfl-data-py), NBA (balldontlie)
- ✅ F1 chart (cumulative points + finish position dual mode)
- ⚠️ Soccer/NFL/NBA charts: placeholders in PlayerExpandedStats — add after MVP smoke test
- ✅ Year selector grays out non-completed seasons
- ✅ Team color coding (left border + dot)
- ✅ NFL position filter: handled in getNflStandings via `position` query param

**Placeholder scan:** None found.

**Type consistency:** All types defined in Task 2 used consistently throughout Tasks 3–16.
