# SportVault — Full Project Plan

> One-stop sports data platform. Historical stats, layered folder UI, player deep-dives with charts, team color coding. Built to extend with live data and compare features later.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Data Sources & APIs](#3-data-sources--apis)
4. [Database Design (PostgreSQL)](#4-database-design-postgresql)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Architecture & UI Design](#6-frontend-architecture--ui-design)
7. [Sport-Specific View Configs](#7-sport-specific-view-configs)
8. [Data Ingestion Pipeline](#8-data-ingestion-pipeline)
9. [Folder & File Structure](#9-folder--file-structure)
10. [Implementation Phases](#10-implementation-phases)
11. [Future Features (Post-MVP)](#11-future-features-post-mvp)
12. [Open Questions (Decide Per Sport)](#12-open-questions-decide-per-sport)
13. [Claude Code Continuation Instructions](#13-claude-code-continuation-instructions)

---

## 1. Project Overview

**What it is:** A web app that shows historical sports data for F1, Football (Soccer), NFL, and NBA. Users navigate a layered folder-style UI: sport → season type → year → player/driver leaderboard → expanded per-player stats with charts.

**Key principles:**
- Historical data only (no live feeds for MVP)
- Each sport has its own view config — not everything is forced into one template
- Teams/constructors are color-coded throughout
- Expandable player rows with sport-specific charts (chart type TBD per sport)
- Year selector on the right panel, grayed out if no data exists

**Out of scope for MVP:**
- User accounts / personalization
- Live / real-time data
- Compare feature (planned post-MVP)
- Cricket, Tennis (add after MVP)

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 14 + TypeScript | SSR, file-based routing, Vercel-native |
| Styling | Tailwind CSS | Utility-first, easy theming |
| Charts | Recharts | React-native, lightweight, good line+bar support |
| Backend API | Next.js Route Handlers (API routes) | No separate server needed for MVP |
| Database | PostgreSQL (via Supabase or Railway) | Relational, JSONB for flexible sport stats |
| Cache | Redis (Upstash free tier) | Leaderboard caching, avoids repeated heavy queries |
| ORM | Prisma | Type-safe, great with Next.js |
| Data Ingestion | Node.js scripts (run locally or as cron) | Fetch from APIs and seed the DB |
| Deployment | Vercel (frontend + API routes) + Railway/Supabase (DB) | Simple, affordable |

---

## 3. Data Sources & APIs

### F1 — Formula 1

| API | URL | Cost | Notes |
|---|---|---|---|
| Ergast API | `api.jolpi.ca/ergast/f1/` | Free | Historical F1 data 1950–2024. Ergast itself is deprecated but Jolpica mirror is active |
| OpenF1 | `api.openf1.org` | Free | 2023+ data, better granularity, lap times, pit stops |

**Key endpoints (Ergast/Jolpica):**
- `/{year}/results.json` — race results for a season
- `/{year}/driverStandings.json` — championship standings
- `/{year}/constructorStandings.json` — constructor standings
- `/{year}/{round}/results.json` — single race result
- `/drivers/{driverId}.json` — driver info

**What to store:** Driver standings per season, race-by-race finish positions, constructor (team) per driver per season, points, wins, podiums.

---

### Football (Soccer)

| API | URL | Cost | Notes |
|---|---|---|---|
| football-data.org | `api.football-data.org/v4/` | Free tier (10 req/min) | Premier League, Champions League, World Cup, etc. |
| API-Football | `api-football.com` | Freemium (100 req/day free) | Broader coverage, more leagues |

**Use football-data.org for MVP** (free, no card needed for basic tier).

**Key endpoints:**
- `/competitions` — list competitions
- `/competitions/{id}/standings` — league table
- `/competitions/{id}/scorers` — top scorers
- `/players/{id}` — player details
- `/competitions/{id}/matches?season={year}` — all matches in a season

**Key competitions to seed:**
- Premier League (PL)
- Champions League (CL)
- World Cup (WC) — every 4 years

**What to store:** Player stats per season (goals, assists, appearances), team standings, match results.

---

### American Football (NFL)

| API | URL | Cost | Notes |
|---|---|---|---|
| ESPN unofficial API | `site.api.espn.com/apis/site/v2/sports/football/nfl/` | Free (unofficial) | Reliable, widely used by hobbyists |
| MySportsFeeds | `api.mysportsfeeds.com` | Freemium | Better historical data, $9/mo for full access |
| nfl-data-py (Python) | GitHub: nflverse/nfl-data-py | Free | Excellent historical data as CSV/parquet — great for bulk seeding |

**Recommendation:** Use `nfl-data-py` for bulk historical seeding (it's the most complete free source), ESPN API for supplementary data.

**Key endpoints (ESPN):**
- `/seasons/{year}/types/{type}/athletes` — players by season
- `/scoreboard?dates={year}` — game schedule/results

**What to store:** Player stats per season (passing yards, rushing yards, TDs, receptions for skill positions), team records, game results. Season types: Regular (type=2), Playoffs (type=3).

---

### Basketball (NBA)

| API | URL | Cost | Notes |
|---|---|---|---|
| NBA Stats API | `stats.nba.com/stats/` | Free (unofficial) | Official but undocumented — needs correct headers |
| balldontlie API | `api.balldontlie.io` | Free tier (60 req/min) | Clean, documented, great for MVP |

**Use balldontlie for MVP** (simplest integration, well-documented).

**Key endpoints (balldontlie):**
- `/players` — player list
- `/season_averages?season={year}&player_ids[]={id}` — stats per player per season
- `/games?seasons[]={year}` — game results
- `/teams` — team info

**What to store:** Player season averages (PPG, RPG, APG, FG%, 3P%), team records, game results.

---

## 4. Database Design (PostgreSQL)

### Core Tables (shared across sports)

```sql
-- Sports registry
CREATE TABLE sports (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(20) UNIQUE NOT NULL,  -- 'f1', 'soccer', 'nfl', 'nba'
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50)
);

-- Competitions / leagues within a sport
CREATE TABLE competitions (
  id SERIAL PRIMARY KEY,
  sport_id INT REFERENCES sports(id),
  slug VARCHAR(50) UNIQUE NOT NULL,   -- 'premier-league', 'nfl-regular', 'f1-championship'
  name VARCHAR(100) NOT NULL,
  competition_type VARCHAR(30),       -- 'league', 'cup', 'championship', 'tournament'
  season_pattern VARCHAR(20)          -- 'annual', 'quadrennial', 'calendar-year'
);

-- Seasons
CREATE TABLE seasons (
  id SERIAL PRIMARY KEY,
  competition_id INT REFERENCES competitions(id),
  year INT NOT NULL,
  label VARCHAR(20),                  -- '2023', '2023/24', 'World Cup 2022'
  status VARCHAR(20) DEFAULT 'completed',  -- 'completed' | 'in_progress' | 'upcoming'
  UNIQUE(competition_id, year)
);

-- Teams / Constructors
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  sport_id INT REFERENCES sports(id),
  external_id VARCHAR(100),           -- ID from source API
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(30),
  color_primary VARCHAR(7),           -- hex, e.g. '#E8002D'
  color_secondary VARCHAR(7),
  logo_url VARCHAR(255)
);

-- Players / Drivers / Athletes
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  sport_id INT REFERENCES sports(id),
  external_id VARCHAR(100),
  first_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  nationality VARCHAR(60),
  date_of_birth DATE,
  position VARCHAR(30),               -- 'Forward', 'QB', 'PG', null for F1
  number INT
);

-- Player → Team assignments per season
CREATE TABLE player_seasons (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  team_id INT REFERENCES teams(id),
  season_id INT REFERENCES seasons(id),
  UNIQUE(player_id, season_id)
);
```

### Sport-Specific Stats Tables

```sql
-- F1: Driver championship results per season
CREATE TABLE f1_driver_standings (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  season_id INT REFERENCES seasons(id),
  final_position INT,
  total_points DECIMAL(6,2),
  wins INT DEFAULT 0,
  podiums INT DEFAULT 0,
  poles INT DEFAULT 0,
  fastest_laps INT DEFAULT 0,
  dnfs INT DEFAULT 0,
  UNIQUE(player_id, season_id)
);

-- F1: Per-race results (for line chart)
CREATE TABLE f1_race_results (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  season_id INT REFERENCES seasons(id),
  round INT NOT NULL,
  race_name VARCHAR(100),
  finish_position INT,
  grid_position INT,
  points DECIMAL(5,2),
  status VARCHAR(50),                 -- 'Finished', 'DNF', 'DNS', etc.
  fastest_lap BOOLEAN DEFAULT FALSE
);

-- Soccer: Player season stats
CREATE TABLE soccer_player_stats (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  season_id INT REFERENCES seasons(id),
  appearances INT DEFAULT 0,
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  yellow_cards INT DEFAULT 0,
  red_cards INT DEFAULT 0,
  minutes_played INT DEFAULT 0,
  goals_per_90 DECIMAL(4,2),
  assists_per_90 DECIMAL(4,2),
  UNIQUE(player_id, season_id)
);

-- NFL: Player season stats (JSONB for position flexibility)
CREATE TABLE nfl_player_stats (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  season_id INT REFERENCES seasons(id),
  season_type VARCHAR(20) DEFAULT 'regular',  -- 'regular' | 'playoffs'
  games_played INT DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{}',
  -- stats examples:
  -- QB: { passing_yards, tds, interceptions, completion_pct, passer_rating }
  -- RB: { rushing_yards, rushing_tds, receptions, receiving_yards }
  -- WR/TE: { receptions, receiving_yards, tds, targets }
  UNIQUE(player_id, season_id, season_type)
);

-- NBA: Player season averages
CREATE TABLE nba_player_stats (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  season_id INT REFERENCES seasons(id),
  games_played INT DEFAULT 0,
  points_per_game DECIMAL(5,2),
  rebounds_per_game DECIMAL(5,2),
  assists_per_game DECIMAL(5,2),
  steals_per_game DECIMAL(5,2),
  blocks_per_game DECIMAL(5,2),
  fg_pct DECIMAL(5,3),
  three_pt_pct DECIMAL(5,3),
  ft_pct DECIMAL(5,3),
  minutes_per_game DECIMAL(5,2),
  UNIQUE(player_id, season_id)
);

-- Team standings (shared structure, sport-specific fields in JSONB)
CREATE TABLE team_standings (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES teams(id),
  season_id INT REFERENCES seasons(id),
  position INT,
  played INT,
  won INT,
  drawn INT,                          -- null for NFL/NBA
  lost INT,
  points INT,                         -- league points (null for NFL)
  extra JSONB DEFAULT '{}',           -- { goals_for, goals_against, pts_diff, etc. }
  UNIQUE(team_id, season_id)
);
```

### Indexes

```sql
CREATE INDEX idx_f1_standings_season ON f1_driver_standings(season_id);
CREATE INDEX idx_f1_race_player_season ON f1_race_results(player_id, season_id);
CREATE INDEX idx_soccer_stats_season ON soccer_player_stats(season_id);
CREATE INDEX idx_nfl_stats_season ON nfl_player_stats(season_id, season_type);
CREATE INDEX idx_nba_stats_season ON nba_player_stats(season_id);
CREATE INDEX idx_player_seasons_season ON player_seasons(season_id);
CREATE INDEX idx_seasons_competition ON seasons(competition_id, year);
```

---

## 5. Backend Architecture

### API Route Structure (Next.js Route Handlers)

```
/api/sports                          → list all sports with competitions
/api/sports/[sport]/competitions     → list competitions for a sport
/api/sports/[sport]/seasons          → list seasons with status (for year selector)
/api/[sport]/[competition]/[year]/standings   → player/driver leaderboard
/api/[sport]/[competition]/[year]/player/[id] → full player stats for expand view
/api/[sport]/[competition]/[year]/teams       → team list with colors
```

### Response Shape (leaderboard)

```typescript
// GET /api/f1/championship/2023/standings
{
  sport: 'f1',
  competition: 'f1-championship',
  year: 2023,
  columns: [
    { key: 'position', label: '#', sortable: false },
    { key: 'driver', label: 'Driver', sortable: false },
    { key: 'team', label: 'Constructor', sortable: true },
    { key: 'points', label: 'Pts', sortable: true },
    { key: 'wins', label: 'Wins', sortable: true },
    { key: 'podiums', label: 'Podiums', sortable: true },
  ],
  rows: [
    {
      playerId: 'max_verstappen',
      name: 'Max Verstappen',
      team: { name: 'Red Bull Racing', colorPrimary: '#3671C6' },
      stats: { position: 1, points: 575, wins: 19, podiums: 21, poles: 12 }
    },
    ...
  ]
}
```

### Caching Strategy

- Redis (Upstash): cache leaderboard responses for 1 hour with key `standings:{sport}:{competition}:{year}`
- Next.js `revalidate`: set `export const revalidate = 3600` on route handlers as fallback
- Historical seasons (completed): cache for 24h — data never changes
- In-progress seasons: do not cache (grayed out in MVP anyway)

---

## 6. Frontend Architecture & UI Design

### Routing

```
/                              → redirect to /f1
/[sport]                       → sport home, defaults to first competition + latest year
/[sport]/[competition]         → competition view, defaults to latest year
/[sport]/[competition]/[year]  → leaderboard for that year
```

### UI Layout

```
┌─────────────────────────────────────────────────┐
│  [F1]  [Soccer]  [NFL]  [NBA]          ← sport tabs (top)
├──────────────────────────────────┬──────────────┤
│                                  │  Year Picker │
│  [Championship ▾]                │  ────────── │
│  ┌─────────────────────────────┐ │  2024 (gray)│
│  │ # │ Driver  │ Team  │ Pts  │ │  2023 ●     │
│  ├───┼─────────┼───────┼──────┤ │  2022       │
│  │ 1 │ [●] VER │ RBR   │ 575  │ │  2021       │
│  │   └── [expanded chart] ──  │ │  2020       │
│  │ 2 │ [●] PER │ RBR   │ 285  │ │  ...        │
│  │ 3 │ [●] ALO │ AMR   │ 206  │ │             │
│  └─────────────────────────────┘ │             │
└──────────────────────────────────┴─────────────-┘
```

### Key Components

**`SportTabs`** — top navigation. Clicking a sport tab navigates to `/[sport]`. Active tab highlighted. Persists selected competition/year in URL.

**`CompetitionSelector`** — nested inside each sport. Shows competition types as folder-like nested pills or an accordion:
- F1: `Championship` (single type)
- Soccer: `League` → [Premier League, La Liga, ...] / `Cup` → [Champions League, FA Cup, ...]
- NFL: `Regular Season` / `Playoffs`
- NBA: `Regular Season` / `Playoffs`

The nesting makes "League" and "Cup" feel like folders that expand. Separate from the year selector.

**`YearSelector`** — right panel. Vertical list of years. Completed = clickable, in-progress = grayed + disabled. Clicking a year updates the URL and refetches the leaderboard.

**`LeaderboardTable`** — main content area. Columns vary per sport (defined in sport config). Sortable by stat columns. Rows are color-accented on the left border using team's `colorPrimary`. Clicking a row expands it in-place.

**`PlayerExpandedStats`** — renders below the clicked player row, pushes others down. Shows:
- Summary stat cards (total points / goals / PPG / etc.)
- Chart (type configured per sport — see Section 7)
- Close button

**`TeamColorDot`** — small colored circle next to player name, uses team's hex color.

### Color Coding

Each team in the DB has `color_primary`. This is used:
- As a left-border accent on the player's table row (`border-l-4`)
- As the `TeamColorDot` next to the player name
- As the line/bar color in that player's expanded chart

Well-known team colors to seed:
- F1: Red Bull `#3671C6`, Ferrari `#E8002D`, Mercedes `#27F4D2`, McLaren `#FF8000`
- Soccer (PL): Arsenal `#EF0107`, Liverpool `#C8102E`, Man City `#6CABDD`, Chelsea `#034694`
- NFL: Chiefs `#E31837`, Cowboys `#003594`, 49ers `#AA0000`, Eagles `#004C54`
- NBA: Lakers `#552583`, Warriors `#1D428A`, Celtics `#007A33`, Bulls `#CE1141`

---

## 7. Sport-Specific View Configs

Each sport exports a config object that drives the generic components. This avoids hardcoding sport logic into the UI.

```typescript
// types/sport-config.ts
export interface SportConfig {
  slug: string
  name: string
  competitions: CompetitionConfig[]
  leaderboardColumns: ColumnDef[]
  defaultSortKey: string
  expandedChartConfig: ChartConfig    // TBD per sport — see below
  rankingLabel: string                // 'Driver' | 'Player' | 'Athlete'
  hasTeams: boolean
  seasonLabelFormat: 'year' | 'year-range'  // 2023 vs 2023/24
}
```

### F1 Config

- **Competitions:** Championship (single)
- **Season:** calendar year (2023)
- **Table columns:** Position, Driver, Constructor, Points, Wins, Podiums, Poles
- **Default sort:** Points (desc)
- **Expand chart:** Dual-mode line chart with a toggle:
  - Mode 1 (default): Cumulative points per race (x = round, y = total points). Teammate lines shown grayed for context.
  - Mode 2: Finish position per race (x = round, y = position, y-axis inverted so P1 is top). Reveals consistency vs. raw points — a driver alternating P1/DNF looks very different from steady P3s.
- **Ranking:** Drivers ranked 1–20 per season

### Soccer Config

- **Competitions:** by League (PL, La Liga, Bundesliga, Serie A, Ligue 1) and Cup (UCL, FA Cup)
- **Season:** year-range format (2023/24)
- **Table columns (league):** Position, Player, Club, Apps, Goals, Assists, G+A, Mins
- **Table columns (cup):** same but Position = tournament stage reached for teams
- **Default sort:** Goals (desc) for top scorers; Points (desc) for team standings
- **Expand chart:** Timeline line chart — goals (and assists) plotted match by match across the season. Shows scoring streaks, dry spells, and form peaks. Each matchweek on x-axis, cumulative goals on y-axis.
- **Ranking:** top scorers list (individual) + team standings (separate tab inside competition)

### NFL Config

- **Competitions:** Regular Season / Playoffs (nested under NFL)
- **Season:** calendar year (2023)
- **Table columns:** varies by position group — needs a position filter above the table
  - QB: Player, Team, Games, Pass Yds, TDs, INTs, Rating
  - RB: Player, Team, Games, Rush Yds, Rush TDs, Receptions, Rec Yds
  - WR/TE: Player, Team, Games, Targets, Receptions, Rec Yds, TDs
- **Default sort:** Passing Yards for QBs, Rushing Yards for RBs, Receiving Yards for WR/TE
- **Position filter:** Radio buttons or dropdown above the table — QB / RB / WR / TE / DEF
- **Expand chart:** Weekly bar chart — primary stat per game across the season (passing yards for QBs, rushing yards for RBs, receiving yards for WR/TE). Each week on x-axis, stat value on y-axis. Makes big games and quiet weeks immediately visible.
- **Ranking:** top players per position group

### NBA Config

- **Competitions:** Regular Season / Playoffs
- **Season:** year-range format (2023/24)
- **Table columns:** Rank, Player, Team, Games, PPG, RPG, APG, FG%, 3P%
- **Default sort:** PPG (desc)
- **Expand chart:** Two charts stacked:
  - Top: Rolling PPG line chart across the season (10-game rolling average smooths variance, shows form arc)
  - Bottom: Radar/spider chart — PPG, RPG, APG, FG%, 3P% normalized to league scale. Shows at a glance whether a player is a pure scorer, playmaker, or all-rounder.
- **Ranking:** top players by PPG (default), re-sortable

---

## 8. Data Ingestion Pipeline

All ingestion runs as Node.js scripts in `/scripts/ingest/`. For MVP, run these locally to seed the DB. Later they can become cron jobs on Railway.

### Script Structure

```
scripts/
  ingest/
    index.ts              ← CLI entry: `npx ts-node scripts/ingest/index.ts --sport f1 --year 2023`
    f1.ts                 ← F1 ingestion logic
    soccer.ts             ← Soccer ingestion logic
    nfl.ts                ← NFL ingestion logic
    nba.ts                ← NBA ingestion logic
    utils/
      db.ts               ← Prisma client
      http.ts             ← Rate-limited fetch wrapper
      upsert.ts           ← Generic upsert helpers
```

### F1 Ingestion (Ergast/Jolpica)

```typescript
// For a given year:
// 1. Fetch driver standings → upsert players, teams, f1_driver_standings
// 2. Fetch all race results → upsert f1_race_results (round by round)
// 3. Fetch constructor standings → upsert team standings

const BASE = 'https://api.jolpi.ca/ergast/f1'
// GET ${BASE}/${year}/driverStandings.json
// GET ${BASE}/${year}/results.json?limit=1000
```

### Soccer Ingestion (football-data.org)

```typescript
// For a given competition + year:
// 1. GET /competitions/{id}/standings → upsert team_standings
// 2. GET /competitions/{id}/scorers?season={year} → upsert soccer_player_stats
// Rate limit: 10 req/min → add 6s delay between requests

const BASE = 'https://api.football-data.org/v4'
const HEADERS = { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY }
```

### NFL Ingestion (nfl-data-py via Python, or ESPN)

```typescript
// Option A (recommended): Run Python script using nfl-data-py to export CSV,
// then a separate Node script reads CSV and upserts into PG.
// Option B: ESPN unofficial API
// GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/seasons/{year}/athletes
```

### NBA Ingestion (balldontlie)

```typescript
// For a given year:
// 1. GET /teams → upsert teams
// 2. GET /players (paginated) → upsert players
// 3. GET /season_averages?season={year}&player_ids[]=... (batch 50 at a time)

const BASE = 'https://api.balldontlie.io/v1'
const HEADERS = { Authorization: process.env.BALLDONTLIE_API_KEY }
```

### Years to Seed for MVP

| Sport | Years | Notes |
|---|---|---|
| F1 | 2018–2024 | 7 seasons, ~100 races each, manageable |
| Soccer (PL) | 2018/19–2023/24 | 6 seasons |
| Soccer (UCL) | 2018/19–2023/24 | 6 seasons |
| NFL | 2018–2023 | 6 seasons, regular + playoffs |
| NBA | 2018/19–2023/24 | 6 seasons, regular + playoffs |

---

## 9. Folder & File Structure

```
sportvault/
├── app/                              ← Next.js App Router
│   ├── layout.tsx                    ← Root layout (SportTabs nav)
│   ├── page.tsx                      ← Redirect to /f1
│   ├── [sport]/
│   │   ├── page.tsx                  ← Sport home (redirects to default competition/year)
│   │   └── [competition]/
│   │       └── [year]/
│   │           └── page.tsx          ← Main leaderboard page
│   └── api/
│       ├── sports/route.ts
│       └── [sport]/
│           └── [competition]/
│               └── [year]/
│                   ├── standings/route.ts
│                   ├── teams/route.ts
│                   └── player/[id]/route.ts
│
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
│       ├── SoccerStatsChart.tsx       ← TBD
│       ├── NFLWeeklyChart.tsx         ← TBD
│       └── NBAStatsChart.tsx          ← TBD
│
├── config/
│   ├── sports.ts                     ← SportConfig objects for all 4 sports
│   ├── f1.config.ts
│   ├── soccer.config.ts
│   ├── nfl.config.ts
│   └── nba.config.ts
│
├── lib/
│   ├── db.ts                         ← Prisma client singleton
│   ├── redis.ts                      ← Upstash Redis client
│   ├── cache.ts                      ← Cache helpers
│   └── queries/
│       ├── f1.ts
│       ├── soccer.ts
│       ├── nfl.ts
│       └── nba.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── scripts/
│   └── ingest/
│       ├── index.ts
│       ├── f1.ts
│       ├── soccer.ts
│       ├── nfl.ts
│       └── nba.ts
│
├── types/
│   ├── sport-config.ts
│   ├── api.ts                        ← Shared API response types
│   └── db.ts                         ← Extended Prisma types
│
├── .env.local                        ← API keys (never commit)
├── .env.example                      ← Template with key names
└── README.md
```

---

## 10. Implementation Phases

### Phase 1 — Foundation (Week 1)
- [ ] Init Next.js 14 project with TypeScript + Tailwind
- [ ] Set up PostgreSQL on Railway/Supabase
- [ ] Write Prisma schema (core tables + all sport-specific tables)
- [ ] Run migrations
- [ ] Write sport config types and F1 config object
- [ ] Build SportTabs, YearSelector (static/hardcoded data first)

### Phase 2 — F1 Data + UI (Week 1–2)
- [ ] Write F1 ingestion script (Ergast/Jolpica)
- [ ] Seed F1 data for 2018–2024
- [ ] Write F1 query functions (standings, race results)
- [ ] Build LeaderboardTable with F1 columns
- [ ] Implement team color coding
- [ ] Build F1 expanded chart (cumulative points line chart)
- [ ] Wire up API routes for F1
- [ ] Full F1 flow working end-to-end

### Phase 3 — Soccer (Week 2–3)
- [ ] Write soccer ingestion script (football-data.org)
- [ ] Seed PL + UCL data 2018/19–2023/24
- [ ] Decide and build soccer expand chart
- [ ] Add CompetitionSelector with League/Cup folder nesting
- [ ] Full soccer flow working

### Phase 4 — NFL + NBA (Week 3–4)
- [ ] NFL ingestion (nfl-data-py CSV → Node upsert)
- [ ] NFL position filter UI + position-specific columns
- [ ] Decide and build NFL expand chart
- [ ] NBA ingestion (balldontlie)
- [ ] Decide and build NBA expand chart
- [ ] Full NFL + NBA flows working

### Phase 5 — Polish (Week 4–5)
- [ ] Set up Redis caching (Upstash)
- [ ] Mobile responsive layout
- [ ] Loading skeletons for table
- [ ] Error states (no data, API down)
- [ ] Deploy to Vercel + Railway

---

## 11. Future Features (Post-MVP)

### Compare Feature
- URL: `/compare?sport=f1&type=driver&ids=max_verstappen,lewis_hamilton&year=2023`
- Side-by-side stat cards
- Overlaid line charts (each driver/player a different color)
- Yearly filter on the right (same YearSelector component, multi-year select)
- Works for: drivers vs drivers, teams vs teams, players vs players

### Live Data Upgrade
- Add a `data_source` field to seasons: `'historical' | 'live'`
- Live sports: poll APIs every 15 min during active games
- Add a "Live" badge on in-progress seasons in the year selector
- WebSocket-based score tickers (separate feature, post-compare)

### More Sports
- Cricket: Test / ODI / T20 as separate competition types. Stats: batting avg, bowling avg, strike rate, economy. Use CricAPI.
- Tennis: ATP/WTA rankings by year. Stats: matches won, titles, prize money. Tournaments as "competitions."
- MotoGP: Same structure as F1.

### Team Pages
- `/[sport]/teams/[team-id]` — team profile page
- Squad list, season history, head-to-head record
- Reuses LeaderboardTable in "squad" mode

### Search
- Global search across all sports: player names, teams, races
- Powered by Postgres full-text search (no extra service needed)

---

## 12. Open Questions (Decide Per Sport)

These were intentionally deferred — decide before building each sport's chart component:

| Sport | Question | Options |
|---|---|---|
| Soccer | Expand chart type | Goals per match timeline line chart OR goals/assists/passes bar chart |
| NFL | Expand chart type | Weekly stat bars across season OR season-over-season bar comparison |
| NBA | Expand chart type | ~~Rolling PPG line chart across season OR full stat radar chart~~ **DECIDED: Both stacked — rolling PPG line + radar** |
| Soccer | Show team standings AND player top scorers, or player-only? | Both (tabbed inside competition) OR player-only for MVP |
| NFL | Defensive player stats in MVP? | Yes (sacks, tackles, INTs) or skip for MVP |

---

## 13. Claude Code Continuation Instructions

> When continuing this project in Claude Code, paste this section into the first message.

**Project:** SportVault web app. Plan is in `SPORTS_HUB_PLAN.md`. Read it fully before starting.

**Context:**
- MVP sports: F1, Soccer (Football), NFL, NBA
- Historical data only (no live)
- Next.js 14 + TypeScript + Tailwind + Prisma + PostgreSQL + Redis
- Deploy target: Vercel (frontend) + Railway (PostgreSQL) + Upstash (Redis)
- UI: layered folder theme, sport tabs on top, competition selector (nested), year selector on right panel, player leaderboard table with expand-on-click chart
- Year selector: completed years = clickable, in-progress = grayed/disabled
- Each sport has its own config object driving columns, sorting, chart type
- Player rows color-coded by team primary color (left border + dot)

**Start here:**
1. Run `npx create-next-app@latest sportvault --typescript --tailwind --app` to scaffold
2. Install deps: `npm install prisma @prisma/client @upstash/redis recharts`
3. Copy the Prisma schema from Section 4 of the plan into `prisma/schema.prisma`
4. Set up `.env.local` with `DATABASE_URL`, `REDIS_URL`, `REDIS_TOKEN`
5. Run `npx prisma migrate dev --name init`
6. Build Phase 1 components (SportTabs, YearSelector) with hardcoded data first to validate layout
7. Then implement F1 ingestion script (Phase 2) using Ergast/Jolpica API

**Key decisions already made:**
- DBMS: PostgreSQL with JSONB for flexible NFL stats
- Cache: Redis (Upstash free tier), 1h TTL for standings, 24h for historical
- Routing: `/[sport]/[competition]/[year]`
- Charts: Recharts. F1 = cumulative points line chart. Others TBD (see Section 12).
- NFL needs a position filter (QB/RB/WR/TE) above the table — columns change per position

**Do not start:**
- Compare feature (post-MVP)
- User accounts
- Live data / websockets
- Cricket, Tennis
