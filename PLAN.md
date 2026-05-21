# SportVault — Plan

Single source for past, in-progress, and future work. See [README.md](README.md) for project overview.

---

## Plans History

| Date | Plan | Status | Notes |
|------|------|--------|-------|
| 2026-05-05 | Compare UI & Layout Polish (sticky fixes, interactive highlight, chart sizing) | ✅ Done | Cross-component hover, sticky header offsets, header gap fix, fixed chart heights |
| 2026-04-19 | MVP scaffold (Next.js + Prisma + Supabase + 4 sports ingestion) | ✅ Done | 16-task scaffold + ingest implementation |
| 2026-04-19 | Original full project plan | ✅ Done | Tech stack, schema, sport configs, MVP phases — superseded by current code |
| 2026-04-20 | UI redesign spec (editorial dark / The Athletic + F1TV) | ⛔ Superseded | Replaced by light theme direction |
| 2026-04-21 | Editorial dark UI redesign implementation | ⛔ Superseded | Replaced by light theme redesign below |
| 2026-04-21 | Light theme redesign (warm off-white, DM Sans/Mono, Framer Motion) | ✅ Done | Shipped in commit `a5f816e` |
| (undated) | shadcn foundation + Lamp + GooeyText components | ⛔ Superseded | Decorative prototype components removed during hosting cleanup |
| (undated) | Leaderboard 7-fix bundle (sort indicator, team grouping, chart anim, rounding, full team name, NBA tooltip, league-max radar) | ✅ Done | All 7 fixes shipped |
| 2026-05-02 | NBA playoff bracket view (toggle + match-filtered table) | ✅ Done | 15 series × 7 years ingested; toggle + bracket + filtered table shipped |
| 2026-05-03 | Radar required-prop, player compare, recent-season ingest, infra | ✅ Done | Radar, compare, auth/cache infra shipped; remaining ingest wishes are tracked as data backlog |
| 2026-05-03 | Supabase RLS lockdown (15 public tables) | ✅ Done | `prisma/sql/enable-rls.sql` + `scripts/apply-rls.ts`; anon Data API now returns `[]` |
| 2026-05-04 | Compare UI polish — fitted checkbox, vertical left bar, drag-reorder | ✅ Done | HTML5 DnD on bar + chips; URL syncs on reorder |
| 2026-05-04 | `/compare` server-error fix | ✅ Done | Split `parseCompareUrl` into pure `lib/compare-url.ts` (server can't import from `'use client'` modules in Next 16) |
| 2026-05-04 | Auth UI hidden | ✅ Done | Auth is intentionally feature-gated by `AUTH_UI_ENABLED`; `proxy.ts`, login/logout, and header auth UI stay disabled until Supabase env + flag are enabled |
| 2026-05-04 | Compare bar polish — animations, per-sport scope, max-5 toast, clear-and-return | ✅ Done | Spring transitions, per-sport storage `sv-compare-basket-v2`, toast event system, last-leaderboard tracking |
| 2026-05-04 | Build fix — Suspense wrap for `useSearchParams` | ✅ Done | `/_not-found` now prerenders fine |
| 2026-05-04 | Radar percentile mode | ✅ Done | Frontend computes percentile rank against full league cohort; tooltip shows raw value + percentile |
| 2026-05-04 | Mobile UI polish | ✅ Done | SportTabs (icons-only on phone), LeaderboardTable (hide secondary cols below sm), HeroStrip/TeamHeroStrip (truncate + tighten), PlayerExpandedStats (stack chart row), CompareView (px tighten), CompareBasketBar (force horizontal-bottom below md) |
| 2026-05-04 | Compare radar tooltip — raw values + per-axis scaled | ✅ Done | Tooltip resolves player by `dataKey` then looks up raw `summaryStats[label]` |
| 2026-05-05 | NFL ingest hardening (chunk + stream, fix OOM crashes) | ✅ Done | Hardening shipped; historical full-backfill notes retained as operator handoff, not a hosting blocker |
| 2026-05-21 | Light Editorial UI Redesign | ✅ Done | Clean light home page, leaderboard command strip, bracket/match-stats polish, restrained motion |
| 2026-05-21 | Hosting Readiness Audit | ✅ Done | Dependency advisories cleared, security headers added, Next 16 proxy migration, auth gate, API input hardening, UI consistency polish |

---

## Current State

| Sport | Competition | Years | Notes |
|-------|------------|-------|-------|
| F1 | Championship | 2018–2024 | Sprint points stored, all rounds via pagination fix |
| Soccer | Premier League | 2018–2024 | 2018–22 limited stats (free-tier API) |
| Soccer | Champions League / World Cup | — | ⛔ Blocked: football-data.org free tier 403 |
| NFL | Regular Season + Playoffs | 2018–2024 | Player stats + team standings + playoff bracket tables present in DB |
| NBA | Regular Season + Playoffs | 2018–2024 | NBA stats API |
| Cricket | T20I / ODI / Test / IPL | 2018–2024 | 2024 T20I + ODI source gaps patched with narrow supplements; sample checks now line up with public records |
| Tennis | ATP / WTA | 2018–2024 | 2018–2024 rerun complete; 2024 overall wins now align with official tour summaries (Sinner 73, Swiatek 59) |
| MMA | UFC Events | 2024 | Hidden in UI for now; previous 2024 seed exists, catch weight included, empty `ufc-open-weight` season removed |

---

## To Implement

### Data
- [x] **NFL standings + bracket backfill** — DB now has populated team standings + `nfl_playoff_games` for 2018–2024
- [x] **NFL passer_rating backfill** — 2024 regular/playoffs now have non-zero `passer_rating` values in stored JSON stats
- [ ] **NFL stats accuracy** — disclaimer shipped in UI; paid-source swap still unresolved
- [ ] **MMA seasonal-rate audit + re-enable** — UI intentionally disabled; prior 2024 seed exists, but season-rate verification is paused
- [ ] **Soccer Champions League / World Cup** — needs paid API (football-data.org free tier returns 403)
- [x] **Landing/nav scope lock** — soccer and MMA intentionally disabled; golf removed from v1 scope
- [x] **F1 sprint cumulative chart** — verify totals match official standings for each year (2018–2024)

### Manual Run Queue
- Schema first:
  `npx prisma db push`
  `npx ts-node --project tsconfig.scripts.json -r dotenv/config scripts/apply-rls.ts`
- NFL standings + bracket:
  `npm run ingest -- --sport nfl --year 2024 --type regular`
  `npm run ingest -- --sport nfl --year 2024 --type playoffs`
- NFL historical bracket/standings backfill:
  rerun remaining `nfl --type regular|playoffs` years one at a time as needed
- MMA rerun only after seasonal-rate audit resumes:
  `npm run ingest -- --sport mma --year 2024`

### Features
- [x] **Player compare** — basket-based selection (max 5, same sport, cross-season); `/compare` route with stat cards + radar overlay + F1 line overlay; per-sport baskets; toast on max-5; clear-and-return; horizontal/vertical bar w/ smooth transition
- [x] **Radar percentile mode** — frontend cohort percentile rank (LeaderboardTable expanded view)
- [x] **Mobile layout polish** — phone-friendly SportTabs, LeaderboardTable, HeroStrip, ExpandedStats, CompareBar, CompareView
- [x] **Search / filter** — leaderboard now supports deferred player-name filtering
- [x] **Radar percentile mode (compare view)** — compare page now enriches players with full-league percentile values from server-side leaderboard fetches
- [x] **UI/UX & Chart Polish (Proposed)**
  - **Fix Cricket `bar-tabs` scaling issue**: Change expanded chart type from `bar-tabs` to `radar-tabs` to plot percentile profiles (Batting and Bowling on separate radar tabs), preventing mixed scale bars where count stats (runs/100s) completely dwarf rate stats (average/strike rate).
  - **Fix empty Soccer chart panel**: Change expanded chart config type from `'line'` (which is blank since Soccer lacks weekly timeline data in the DB) to `'radar'` to show a beautiful percentile profile radar chart of Goals, Assists, G+A, Apps, Mins.
  - **Standardize/Clean Stat Keys**: Align query `summaryStats` keys to capitalized labels (e.g. `Pass Yds`, `Comp %`, `Aces`, `DF`, `Avg`, `SR`, etc.). Implement a dynamic `keyToLabelMap` in `LeaderboardTable.tsx` using column/position configurations to map row keys to clean labels, so that `leagueValues` percentile distributions match and radar charts/compare tables display beautifully without programmer-like underscores.
  - **Fix NFL Passer Rating naming**: Rename label `QBR` to `Passer Rating` or `Rating` for QBs in `nfl.config.ts` (the formula computed in `fetch_nfl.py` is the official NFL Passer Rating, not QBR).
  - **Style QB Scatter Chart for light-theme**: Replace dark-themed zinc styles in `NflQbScatterChart.tsx` with light-themed styles matching the editorial theme (warm off-white background, custom axis tick colors, and matching tooltip borders).
  - **Smooth Recharts hover highlights**: Add CSS transitions to `.recharts-radar-polygon`, `.recharts-line`, and `.recharts-curve` in global CSS to make comparison highlights fade smoothly rather than instantly on hover.

### Infrastructure
- [x] **Supabase Auth** — wired (`proxy.ts`, /login, /logout, header user menu); public UI gated by `AUTH_UI_ENABLED`
- [x] **Redis / Upstash cache swap** — env-driven (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`); in-memory fallback when unset
- [x] **Hosting security baseline** — `next.config.ts` now disables `X-Powered-By`, sets CSP/referrer/frame/content-type/permissions headers, pins Turbopack root, and keeps standalone output
- [x] **Dependency vulnerability cleanup** — upgraded Next / eslint-config-next to `16.2.6`, added safe npm overrides for vulnerable transitives, ran `npm dedupe`, and verified `npm audit --audit-level=moderate` returns 0 vulnerabilities
- [ ] **Soccer 2018–2022 backfill** — via API-Football or SofaScore when budget allows

---

## Recently Fixed (current session)

- **Hosting Readiness Audit** — upgraded vulnerable Next/transitive dependencies, added `npm run typecheck`, `npm run verify`, and `npm run prehost`, and documented the deploy gate in `README.md`.
- **Security Headers + Build Root** — `next.config.ts` now sets standalone output, explicit `turbopack.root`, `poweredByHeader: false`, CSP, referrer policy, frame denial, content-type sniff protection, permissions policy, and reverse-proxy streaming header.
- **Next 16 Proxy Migration** — replaced deprecated `middleware.ts` with `proxy.ts`, keeping Supabase session refresh when auth is enabled and adding a lightweight per-route API/login rate limiter.
- **Auth Exposure Fix** — `/login`, server actions, `/logout`, and header auth UI are now gated by `AUTH_UI_ENABLED`; public sign-up stays unavailable unless explicitly enabled with Supabase env vars.
- **API Hardening** — added route guards for slugs, years, positive IDs, match IDs, and NFL position params; API routes now log server errors internally and return generic client-facing 500 messages.
- **Cache Robustness** — corrupted cache JSON is now evicted and recomputed instead of crashing the request path.
- **Google Fonts Build Blocker Removed** — removed `next/font/google` imports and switched to local/system font stacks so production build does not depend on Google Fonts network access.
- **UI Consistency Pass** — replaced emoji sport glyphs with compact text badges, tightened mobile selector overflow behavior, aligned chart helper labels with the light editorial theme, and fixed compare checkbox accessibility text.
- **Lint/Type Cleanup** — removed stale Supabase middleware helper, fixed React effect lint in the compare basket bar, typed F1/soccer ingest API payloads, and removed chart `any` usage.

- **Light Editorial UI Redesign** — added a restrained editorial UI layer, redesigned the home page as a sports archive entrance, polished the leaderboard command strip/table rows/sticky hero strips, and refined bracket match selection + match stats surfaces.

- **Sticky Header Overlap** — corrected `top` offsets for `TeamHeroStrip` (88px), `HeroStrip` (128px), and `thead` (180px) to prevent overlap with layout headers.
- **Compare Bar Sticky Position** — adjusted `stickToTop` position to 184px so it docks right below the Hero strips.
- **Dynamic Chart Highlighting** — implemented cross-component highlighting (Legend/Table/Chips) with synced dimming across Radar and Line charts.
- **Compare View Sizing** — standardized Line and Radar chart heights to a fixed 450px to prevent shrinking with fewer players. Added a `1000px` minimum width with horizontal scroll to ensure charts remain wide and readable when comparing only 2 players.
- **Compare Header Alignment** — centered the "Compare (N)" title and the draggable player chips for better visual balance above the charts.
- **Compare Basket UI** — completely removed the redundant floating Compare Basket Bar from the `/compare` page itself. It now only renders horizontally on Leaderboard pages for building the basket.
- **Header Gap** — removed dead space in top-right header by moving padding into the conditional `HeaderUserMenu`.
- **Chart Label/Legend Polish** — lowered "Round" X-axis labels and Legend padding for better visual balance.
- **Radar Legend Labels** — added year labels to Radar chart legend items for consistency with Line chart.
- **Compare Basket Session** — restricted the compare basket state to session storage instead of local storage.
- **Bracket UI Layering** — fixed z-index on tournament brackets so game hover boxes sit above connection arrows.
- **NFL `passer_rating` always 0** — [fetch_nfl.py](sportvault/scripts/ingest/fetch_nfl.py) now computes it from seasonal totals when missing in source data
- **CompetitionSelector year mismatch** — `seededSlugs` in [page.tsx](sportvault/app/[sport]/[competition]/[year]/page.tsx) now filters competitions to those that have data for the selected year, not just any year
- **Tooltip Improvements** — Added descriptive tooltips to all statistical headers across all sports and implemented full team name tooltips on abbreviated team names.
- **Repository Cleanup** — removed repo-local agent skill dumps, generated graph/prototype clutter, default Next SVGs, and unused decorative components before hosting.

---

## Completed Plan: 2026-05-21 Light Editorial UI Redesign

### Goal
Keep SportVault light, professional, and data-first while making the home page, leaderboard, bracket, match stats, and expanded analytics feel like one premium sports archive product. Motion should guide focus, not decorate everything.

### Phases + Status
- [x] **Phase 1 — Design foundation**: add editorial surface, command-strip, chip, subtle-shine, and reduced-motion CSS treatments.
- [x] **Phase 2 — Home page**: replace the showpiece lamp/gooey landing with a calmer sports archive entrance and useful sport cards.
- [x] **Phase 3 — Leaderboard shell**: restyle search/count/disclaimer controls as a compact command strip and upgrade table/bracket toggle.
- [x] **Phase 4 — Leaderboard table + sticky stats**: refine rows, rank treatment, selected states, sticky team/player hero strips, and expanded stat surfaces.
- [x] **Phase 5 — Bracket + match stats**: restyle playoff bracket cards, bracket container, selected matchup header, and single-match stats panel.
- [x] **Phase 6 — Charts + QA**: chart containers aligned with the editorial theme; command-line hosting verification passed.

### Verification
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npx prisma validate` passes with existing Prisma `driverAdapters` deprecation warning.
- `npm audit --audit-level=moderate` passes with 0 vulnerabilities.
- `npm run prehost` verifies lint, typecheck, and Prisma schema; in this sandbox, the production build step must be run outside sandbox because Turbopack binds a local worker port.
- `npm run build` passes outside sandbox after setting `turbopack.root`.
- Runtime browser smoke test was not completed because the local curl/browser check was interrupted; command-line hosting checks passed. Do a quick visual pass before launch if you want extra confidence.

---

## Completed Implementation / Historical Handoff: 2026-05-05 NFL Ingest Hardening (Chunk + Stream)

### Current status
The memory/OOM hardening work is done for hosting: Python export is staged, Node ingest streams/batches writes, duplicate-safe constraints are in place, and the app can host with the current seeded data. The remaining notes in this section are operator handoff material for future NFL data reruns, not an active app-readiness blocker.

### Problem
NFL ingest crashed 5 times. Dev server / ingest process OOM-killed on 16GB Mac. NBA + F1 ingests run fine — NFL is structurally heavier than both. Root cause is architecture, not data.

### Why NFL ingest is heavy (vs NBA/F1)

| Stage | NFL today | NBA | F1 |
|-------|-----------|-----|-----|
| Source | Python subprocess (`nfl_data_py`) loads parquet via pandas | Single JSON fetch | Paginated JSON fetches (100/page) |
| In-flight datasets | **2–3 full pandas DataFrames** (seasonal + weekly + merged) resident simultaneously | 1 JSON object (~250 rows) | One small page at a time |
| Node parse | `fs.readFileSync` whole CSV → sync `csv-parse` whole array | Object indexed in place | Object indexed in place |
| Process model | `execSync('stdio: inherit')` — Python + Node peaks **overlap** | Pure Node | Pure Node |
| Per-row DB ops | `upsertTeam` + `upsertPlayer` + `player.update` + `playerSeason.upsert` + `findFirst` + `update`/`create` (6 round trips per row) | 4 round trips per row | 3 round trips per row |
| Total round trips / season / type | ~100 seasonal + (~100 × 17 weeks ≈ 1,700) weekly = **~1,800 sequential awaits** | ~250 | ~600 race results |
| Two CSVs in one process | Yes — seasonal heap not freed before weekly parse | n/a | n/a |

### Implementation Plan + Status

### Confirmed DB state (read-only check, 2026-05-05)
- `NflPlayerStat` already has `@@unique([playerId, seasonId, seasonType])` locally + in Supabase. **No `db push` needed for that constraint** — fix is code-only (use the existing compound upsert).
- `Team` and `Player` now have `@@unique([sportId, externalId])` locally + in Supabase. Duplicate verifier returns 0 duplicate keys and 0 NULL external IDs.
- Weekly data was incomplete before hardening: only `nfl-regular` 2018 + 2024 had weekly rows. Playoffs + reg 2019–2023 showed 0 rows. Remaining backfill must restore these one run at a time.
- `npx prisma validate` and `npx tsc --noEmit --project tsconfig.scripts.json` passed before changes started.
- 2024 regular rerun completed after hardening: 559 seasonal rows, 5,227 weekly rows, 3 stale seasonal rows removed. Final read-only count check confirmed `season_rows=559`, `weekly_rows=5227`.

### Historical Pickup Handoff (future data reruns only)
Do **not** start the full 14-run backfill in one command. Run one year/type at a time, wait for the final `done. wrote ...` line, then verify row counts before starting the next.

From `sportvault/`:
```bash
npm run ingest -- --sport nfl --year 2024 --type playoffs
```

Then continue one at a time:
```bash
npm run ingest -- --sport nfl --year 2023 --type regular
npm run ingest -- --sport nfl --year 2023 --type playoffs
npm run ingest -- --sport nfl --year 2022 --type regular
npm run ingest -- --sport nfl --year 2022 --type playoffs
npm run ingest -- --sport nfl --year 2021 --type regular
npm run ingest -- --sport nfl --year 2021 --type playoffs
npm run ingest -- --sport nfl --year 2020 --type regular
npm run ingest -- --sport nfl --year 2020 --type playoffs
npm run ingest -- --sport nfl --year 2019 --type regular
npm run ingest -- --sport nfl --year 2019 --type playoffs
npm run ingest -- --sport nfl --year 2018 --type regular
npm run ingest -- --sport nfl --year 2018 --type playoffs
```

After each run, do a read-only count check for that exact `(competition, year, type)`. Expected shape: season rows > 0 and weekly rows > 0 when upstream `nfl_data_py` exports weekly rows. Abort the loop on any Python download error, Prisma error, `No weekly rows were written`, or unexpectedly zero count.

Known verified baseline:
- `nfl-regular` 2024 is already done and should not need rerunning unless validating idempotency: `season_rows=559`, `weekly_rows=5227`.

Before handing off as complete, run:
```bash
npm run lint -- --no-cache scripts/ingest/index.ts scripts/ingest/nfl.ts scripts/ingest/utils/upsert.ts scripts/verify-dups.ts
npx tsc --noEmit --project tsconfig.scripts.json
npx prisma validate
npx ts-node --project tsconfig.scripts.json -r dotenv/config scripts/verify-dups.ts
```

#### Phase 1 — Python: minimize DataFrame residency
Cannot eliminate DataFrames (`nfl_data_py` returns them); goal is to avoid extra copies and never hold seasonal + weekly simultaneously.
- Rewrite `scripts/ingest/fetch_nfl.py`:
  - **Stage A (seasonal):** load `import_seasonal_data([year])`, build a small `dict` of `player_id → meta` (name/pos/team/passer_rating mean) FIRST from a lightweight weekly groupby, then iterate seasonal rows with `itertuples()` and write via `csv.DictWriter`. Free `seasonal` and `meta` (`del seasonal; del meta; gc.collect()`).
  - **Stage B (weekly):** load `import_weekly_data([year])` AFTER stage A is fully written and freed. Filter by `season_type` lazily; iterate via `itertuples()` and stream-write. Do NOT create a `weekly_skill` copy — apply skill-position filter inline during iteration.
  - Optional `--chunk-weeks 4` arg: emit weekly CSV in 4-week files node ingests sequentially. Skip in v1 unless single-file weekly still OOMs.

#### Phase 2 — Node: streaming parse + spawn (drained)
- Switch `execSync` → `child_process.spawn`. Use `{ stdio: 'inherit' }` (simplest — no pipe-fill blocking). If we need to capture stdout for progress later, switch to `'pipe'` AND attach a `'data'` listener that consumes (or pipes to `process.stdout`) — never leave a piped fd undrained.
- Replace `fs.readFileSync` + sync `parse` with `fs.createReadStream(csvPath).pipe(parse({ columns: true }))` and `for await (const row of parser)`. Never holds the full row array.
- Run stage A (seasonal) ingest fully → `await prisma.$disconnect()` → reconnect → run stage B (weekly). Two strict phases, no overlap.

#### Phase 3 — Schema constraints + batched DB writes
- **Schema migration (small, focused):**
  - Add `@@unique([sportId, externalId])` to `Team` and `Player`. (No current dups → safe.)
  - `NflPlayerStat` compound unique already exists — no schema change there.
  - Apply with `npx prisma db push`. Verify locally: `npx prisma validate` + a one-shot count query.
- **Code:**
  - Drop the `findFirst` → `update`/`create` pattern in `nfl.ts`. Use `prisma.nflPlayerStat.upsert({ where: { playerId_seasonId_seasonType: ... } })` directly.
  - **Two-pass per stage:**
    1. **Dimension pass** — collect distinct `(externalId, name, position, team)` tuples into JS Maps while streaming. After stream end: `prisma.team.createMany({ skipDuplicates: true })` then `prisma.player.createMany({ skipDuplicates: true })` (now safe because of the new constraints). Follow with `findMany({ where: { externalId: { in: [...] } } })` to build an in-memory `externalId → id` map.
    2. **Fact pass** — buffer N=100 stat rows → `prisma.$transaction(buffer.map(row => prisma.nflPlayerStat.upsert(...)))`. Same for `nflWeeklyStat`.
  - Drops awaits from ~1,800 → ~20 per stage. Memory residency drops in lockstep.

#### Phase 4 — Safety gate before destructive writes
- **Validate before delete.** Today there is no `deleteMany`, but introducing one without a guard is what bites us mid-crash. Required ordering for any rerun that wipes prior weekly rows:
  1. Run Python export → CSV files exist on disk and pass row-count + header schema check (e.g., `>= 1` row, all expected columns present).
  2. ONLY THEN open a transaction that deletes prior `nflWeeklyStat` rows for the (season, seasonType) and inserts new ones in batches.
  3. Wrap delete + insert in a single Prisma transaction where feasible; otherwise fail loud and leave old data intact.
- Add ingest-completion verification step: after the script returns, run `select season, seasonType, count(*)` query; abort the rerun loop if any (year, seasonType) shows 0 weekly rows when it should not. Reference baseline: 7 years × 2 types = 14 (year, seasonType) pairs, all > 0 expected after rerun.

#### Phase 5 — Run loop & operator hygiene
- `index.ts`: `await prisma.$disconnect()` between `regular` and `playoffs` invocations within a year. Optional: invoke each year+type as a separate Node process from a shell wrapper for fully fresh heap.
- Pre-flight: `vm_stat` free-pages check before spawning Python; abort with a friendly message if free < 800 MB.
- Doc note in README ingest section: "kill `npm run dev` before NFL ingest; quit Antigravity if free RAM < 1 GB."
- `--max-old-space-size=2048` in the ingest command — note in PLAN that this caps the **Node** heap only; Python/Prisma RSS not affected. Treat it as a guard rail, not machine protection.

### Tasks
- [x] Phase 1 — Python: stage-A/stage-B rewrite of `fetch_nfl.py` with `del` + `gc.collect()` between, `itertuples()` row streaming, no `weekly_skill` copy
- [x] Phase 2 — Node: `spawn` w/ `stdio: 'inherit'`, streaming weekly `csv-parse`, progress logging. Seasonal rows are small enough for current scope; no hosting blocker remains.
- [x] Phase 3a — Schema: add `@@unique([sportId, externalId])` to `Team` and `Player`; DB indexes verified; duplicate-count query returns 0.
- [x] Phase 3b — Replace `findFirst`→update/create with `nflPlayerStat.upsert` on existing compound key.
- [x] Phase 3c — Two-pass dimension/fact ingest: `createMany({ skipDuplicates: true })` + buffered `$transaction` batches of 100.
- [x] Phase 4 — CSV schema + row-count validation, guarded stale seasonal/weekly cleanup, and post-run count verification pattern added.
- [x] Phase 5 — Reclaimable-memory pre-flight, README ops note, and `NODE_OPTIONS=--max-old-space-size=2048` added.
- [ ] Future data QA — rerun/read-only verify every NFL 2018–2024 regular/playoff pair before a data-accuracy-focused launch. This is not required for hosting the app shell/current v1 scope.

### Out of scope
- Switching off `nfl_data_py` to ESPN/SportsRadar API — separate decision (see "NFL stats accuracy" item)
- Refactoring NBA/F1 ingest — they work fine on this box

### Caveats acknowledged from review
- `--max-old-space-size` is a Node-only guard; does not cap Python or total RSS.
- `spawn` with `stdout: 'pipe'` will block Python if not actively drained — default to `inherit`, switch to piped only with a data listener attached.
- Phase 1 cannot literally avoid DataFrames; goal is "no copies, no overlap" not "no frames".
- Phase 3a is a code-only fix on `NflPlayerStat` (constraint exists); the DB push is for `Team`/`Player` constraints needed by Phase 3c batching.

---

## Previous Plan: 2026-05-03 Polish + Compare + Infra

### Tasks
- [x] **Radar — drop fallback**: `leagueMaxStats` now required on `StatsRadarChart` and `PlayerExpandedStats`. Per-player-max fallback removed.
- [ ] **Radar — future**: API returns Percentile Ranks (0–100) per stat instead of raw values; frontend plots directly without normalization. (Deferred — requires query layer + types/api.ts changes per sport.)
- [x] **Player compare** — `lib/compare-basket.ts` (localStorage hook with `useSyncExternalStore`), checkbox column on `PlayerRow`, floating `CompareBasketBar` mounted in root layout, `/compare` route with cohort-normalized radar overlay + per-stat side-by-side cards + F1 cumulative-points line overlay. Max 5 players, same-sport only.
- [x] **Recent-season ingest (background)**: NBA 2023 (Regular + Playoffs) and F1 2023 done. Additional NBA/F1 2024–2025 refreshes are data backlog, not an app-readiness blocker.
- [x] **Supabase Auth**: `proxy.ts` refresh path, `app/login`, `app/logout`, and `HeaderUserMenu` are wired but public UI is intentionally gated by `AUTH_UI_ENABLED`.
- [x] **Redis / Upstash cache swap**: `@upstash/redis` installed; `lib/cache.ts` auto-detects `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` and falls back to in-memory map.

### Compare design (answered 2026-05-03)
- **Cross-season**: yes (e.g. Jokic 2023 vs LeBron 2024)
- **Cross-sport**: no (only same sport)
- **What to compare**: all relevant — summary stat cards, radar overlay, time-series overlay (where applicable)
- **UI flow**: dedicated route `/compare` (best for shareable URLs + complex layout)
- **Selection**: checkbox column on leaderboard rows
- **Max players**: 5
- **Basket persistence**: localStorage so picks survive cross-season navigation; floating "Compare basket (n)" button that links to `/compare?items=...`
- **Compare URL shape**: `/compare?items=playerId:sport:competition:year,...`

---

## Previous Plan: NBA Playoff Bracket

Two views for `nba-playoffs` competition: existing tabular leaderboard + new bracket. Clicking a bracket match shows a filtered table below with only those two teams' players.

### Tasks

- [x] Add `NbaPlayoffSeries` schema model (round, conference, seeds, team1/team2, wins, winner)
- [x] Add team relations + season relation for new model
- [x] Update NBA ingest: fetch `commonplayoffseries` + `leaguegamelog` (Playoffs), aggregate into series, derive round via earliest game date bucketing
- [x] Add `getNbaBracket(year)` query in `lib/queries/nba-bracket.ts` returning `{ east, west, finals }` shape
- [x] Add `BracketResponse` types to `types/api.ts`
- [x] Add `bracketKey(year)` to `lib/cache.ts`
- [x] Build `BracketMatch.tsx` (clickable match card with seeds/scores/colors)
- [x] Build `NbaBracketView.tsx` (5-column grid: East-R1 | East-CSF/CF | Finals | West-CSF/CF | West-R1)
- [x] Build `ViewToggle.tsx` (Table/Bracket segmented control, NBA-playoffs only)
- [x] Build `NbaPlayoffsView.tsx` client wrapper holding view + selected-match state
- [x] Add `teamFilter?: string[]` prop to `LeaderboardTable.tsx`, recompute ranks within filtered set
- [x] Wire `app/[sport]/[competition]/[year]/page.tsx` to render `NbaPlayoffsView` when sport=nba & comp=nba-playoffs
- [x] URL hash `#match=<seriesId>` for shareable selection
- [x] `npx prisma db push` + re-ingest playoffs 2018–2024 with bracket data (105 series stored)
- [x] Polish: bracket default view, SVG connector arrows, mobile stacking, empty state, playoff progression sort (champion's roster first)

### Open questions

- Seed assignment (highSeed/lowSeed) — defer to follow-up; needs `leaguestandings` ingest
- Mobile layout — defer to polish phase

---

## Reference

- Next.js v16 agent rules: [sportvault/AGENTS.md](sportvault/AGENTS.md)
