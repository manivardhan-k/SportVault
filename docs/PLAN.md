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

### Must-Have
- [ ] Seed F1 2018–2023 sprint points (re-ingest with new sprint logic — currently only 2024 has sprint data)
- [ ] Seed Soccer Champions League & World Cup data (currently only Premier League)
- [ ] NFL playoffs seeding (currently only regular season 2023)
- [ ] NBA playoffs seeding (currently only regular season 2023–24)
- [ ] Active sport tab highlight in SportTabs (currently no active state shown)
- [ ] CompetitionSelector: show only competitions that have data for selected year

### Nice-to-Have
- [ ] Supabase Auth (login/logout) — utils/supabase files already in place
- [ ] Redis/Upstash cache swap (cache interface already designed for it)
- [ ] Soccer: seed 2018–2022 via a different API (API-Football / SofaScore) when budget allows
- [ ] Search / filter by player name in leaderboard
- [ ] Mobile layout polish
- [ ] PlayerRow expand button — confirm click target is large enough on mobile
