# SportVault — Plan

## ~~Done~~

### ~~Infrastructure~~
- ~~Next.js 16 scaffold (App Router, params-as-Promise)~~
- ~~Prisma v7 schema (all 4 sports) + migration baselined~~
- ~~Prisma driver adapter (`@prisma/adapter-pg`) — required by v7~~
- ~~Supabase PostgreSQL connected (direct host, not pooler)~~
- ~~Supabase SSR helpers (server/client/middleware)~~
- ~~Redis-ready cache interface (MemoryCache now)~~
- ~~Docker multi-stage build (node:22-slim + Python/pandas for NFL)~~
- ~~Root `.gitignore`, `.dockerignore`~~

### ~~Data Ingestion~~
- ~~F1: Jolpica API — 2018–2024 ✓~~
- ~~F1: Sprint results ingested per round (`sprintPoints` field) — 2024 ✓~~
- ~~F1: Race results pagination fixed (Jolpica paginates at ~6 per page regardless of limit; now uses offset loop)~~
- ~~Soccer: football-data.org — 2023–2024 ✓ (2018–22 blocked by free tier 403)~~
- ~~NFL: nfl-data-py via Python 3.11 → CSV → upsert — 2018–2024 ✓~~
- ~~NBA: NBA official stats API (no key) — 2018–2024 ✓~~
- ~~http.ts retry-with-exponential-backoff for 429s~~

### ~~UI~~
- ~~SportTabs, YearSelector, CompetitionSelector~~
- ~~LeaderboardTable with sort~~
- ~~PlayerRow with team color dot~~
- ~~PlayerExpandedStats with stats cards~~
- ~~F1SeasonLineChart (dual-mode: cumulative pts / finish position)~~
- ~~StatsRadarChart for NBA~~
- ~~StatsBarChart for NFL~~

### ~~Bug Fixes~~
- ~~Missing `key` prop on `<Fragment>` in LeaderboardTable.tsx~~
- ~~"No season" throws 500 → now returns 404 via `notFound()`~~
- ~~`[sport]/page.tsx` redirect skips unseeded competitions (loops to find first seeded comp+season)~~
- ~~CompetitionSelector: unseeded competitions render as disabled `<span>` instead of navigable `<Link>`~~
- ~~F1 podiums/poles/DNFs always 0 — now derived from `f1RaceResult` data at query time~~
- ~~F1 chart showing only 5 races — pagination bug in ingest fixed, all rounds now stored~~
- ~~F1 cumulative points off (399 vs 437) — sprint points now stored in `sprintPoints` column and added to chart~~

---

## Next Up

### UI Redesign (spec: docs/superpowers/specs/2026-04-20-ui-redesign-design.md)
- [ ] Global design system: Sora + JetBrains Mono + Inter, new color palette, CSS variables
- [ ] Header: logo left, sport tabs right with accent underline active state
- [ ] Hero strip: 56px, season leader + 3 stats, static (never reacts to sort)
- [ ] Year selector: inline pill above table, replaces sidebar
- [ ] Competition tabs: text links with accent underline, disabled state with ● prefix
- [ ] Leaderboard table: new typography, points bar, amber-follows-sort rule, row dividers
- [ ] Expanded player row: stat card strip, chart area redesign, disabled Compare button
- [ ] Sport-specific details: F1 P1/P2 format, Soccer xG tooltip, NFL position badges + delta colors, NBA abbreviations
- [ ] Icon system: enforce all icon rules across all sports

### Data Fixes
- [ ] NFL passer_rating always 0 — column missing in nfl_data_py; investigate fix or drop column
- [ ] NFL stats accuracy: NGS inflates passing yards vs official box scores — evaluate paid API (SportsRadar / MySportsFeeds) or accept NGS with disclaimer
- [ ] Seed Soccer Champions League & World Cup (blocked by football-data.org free tier; needs paid API)
- [ ] Verify F1 cumulative chart totals match standings for all years (2018–2024)

### Features
- [ ] Player compare feature — side-by-side stats + charts for 2–4 players in same season
- [ ] Active sport tab highlight (currently no active state on initial load)
- [ ] CompetitionSelector: filter to competitions with data for selected year

### Nice-to-Have
- [ ] Supabase Auth (login/logout) — utils/supabase files already in place
- [ ] Redis/Upstash cache swap (cache interface already designed for it)
- [ ] Soccer: seed 2018–2022 via API-Football / SofaScore when budget allows
- [ ] Search / filter by player name in leaderboard
- [ ] Mobile layout polish
