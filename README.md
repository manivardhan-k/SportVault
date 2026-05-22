# SportVault

Historical sports data platform for F1, Soccer, NFL, NBA, Cricket, Tennis, and MMA. Layered folder UI: sport → season type → year → leaderboard (with descriptive stat tooltips) → expanded player stats with sport-specific charts.

**Live demo:** https://sport-vault-app.vercel.app

## Stack

- **Next.js 16** (App Router, params-as-Promise) + TypeScript
- **Tailwind CSS v4** + Framer Motion v12 (light theme)
- **Recharts** for sport charts (line / radar / bar / scatter)
- **Prisma v7** (`driverAdapters` preview) + `@prisma/adapter-pg`
- **PostgreSQL** via Supabase (direct host for dev/ingest, session pooler for Docker)
- **Redis-ready** cache interface (in-memory now, Upstash drop-in later)
- **Ingestion**: Node + Python (NFL via `nfl_data_py`)

## Getting Started

```bash
cd sportvault
npm install
npx prisma db push          # create schema (Prisma v7 — db push, not migrate dev)
npm run dev                 # http://localhost:3000
```

`.env.local`:
```
DATABASE_URL="postgresql://...:5432/postgres"   # session pooler (IPv4, Docker)
DIRECT_URL="postgresql://...:5432/postgres"     # direct host (IPv6, ingest)
AUTH_UI_ENABLED="false"                         # keep public login/sign-up disabled until launch
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
UPSTASH_REDIS_REST_URL=""                       # optional production cache
UPSTASH_REDIS_REST_TOKEN=""
```

## Hosting Checklist

Run from `sportvault/` before deployment:
```bash
npm run prehost
npm audit --audit-level=moderate
```

Hosting notes:
- `next.config.ts` sets standalone output and baseline security headers.
- Auth is off unless `AUTH_UI_ENABLED=true` and Supabase env vars are present.
- Use Upstash Redis in production to avoid per-instance memory-cache misses.
- Build does not require Google Fonts network access; font stacks are local/system fallbacks.

### Vercel deployment

Recommended first production host:
- Import `https://github.com/manivardhan-k/SportVault` into Vercel.
- Set **Root Directory** to `sportvault`.
- Framework preset: **Next.js**.
- Install command: `npm ci`.
- Build command: `npm run build`.
- Output directory: leave default / auto-detected.

Production environment variables:
```
DATABASE_URL="postgresql://..."              # Supabase session pooler / IPv4-friendly runtime URL
DIRECT_URL="postgresql://..."                # Supabase direct URL for Prisma tooling
AUTH_UI_ENABLED="false"
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."
UPSTASH_REDIS_REST_URL=""                    # optional but recommended for production
UPSTASH_REDIS_REST_TOKEN=""
```

Deploy sequence:
```bash
cd sportvault
npm run prehost
npm audit --audit-level=moderate
cd ..
git add -A
git commit -m "Prepare SportVault for hosting"
git push origin master
```

Then create/promote the Vercel production deployment. If using the Vercel CLI instead of Git import, run from repo root after login:
```bash
vercel sportvault
vercel sportvault --prod
```

## Docker

```bash
docker compose up -d --build
```

`docker-compose.yml` adds `extra_hosts: host.docker.internal:host-gateway` (Supabase direct is IPv6-only; Docker Desktop on macOS routes through pooler).

## Ingestion

Run from `sportvault/`:
```bash
npm run ingest -- --sport f1     --year 2024
npm run ingest -- --sport nfl    --year 2024 --type regular
npm run ingest -- --sport nfl    --year 2024 --type playoffs
npm run ingest -- --sport nba    --year 2024 --type playoffs
npm run ingest -- --sport soccer --year 2024
npm run ingest -- --sport cricket --year 2024 --type t20i
npm run ingest -- --sport cricket --year 2024 --type odi
npm run ingest -- --sport cricket --year 2024 --type test
npm run ingest -- --sport tennis  --year 2024 --tour atp
npm run ingest -- --sport tennis  --year 2024 --tour wta
npm run ingest -- --sport mma     --year 2024
```

NFL notes:
- Before first NFL bracket/standings rerun after this change:
  `npx prisma db push`
  `npx ts-node --project tsconfig.scripts.json -r dotenv/config scripts/apply-rls.ts`
- `npm run ingest -- --sport nfl --year <year> --type regular` now writes player stats **and** team standings used by Team sorting.
- `npm run ingest -- --sport nfl --year <year> --type playoffs` now writes player stats, playoff team standings, and `nfl_playoff_games` used by bracket view.

Pending manual runs:
- none for active v1 sports

Current UI scope:
- live: F1, NFL, NBA, Cricket, Tennis
- hidden/disabled: Soccer, MMA

For NFL backfills, stop `npm run dev` first and close memory-heavy apps if free RAM is under 1 GB. The ingest script sets `NODE_OPTIONS=--max-old-space-size=2048`; that caps the Node heap only, not Python or total process RSS.

## Project Layout

```
sportvault/
├── app/                                  # Next.js App Router (pages + API routes)
├── components/
│   ├── charts/                           # F1SeasonLineChart, NflQbScatterChart, StatsRadarChart, StatsBarChart, NflWeeklyBarChart
│   ├── leaderboard/                      # LeaderboardTable, PlayerRow, PlayerExpandedStats, HeroStrip, TeamHeroStrip
│   ├── layout/                           # SportTabs, CompetitionSelector, YearSelector
├── config/                               # Per-sport configs (f1, soccer, nfl, nba, cricket, tennis, mma) + registry
├── lib/
│   ├── queries/                          # Per-sport data queries (f1.ts, soccer.ts, nfl.ts, nba.ts, cricket.ts, tennis.ts, mma.ts)
│   ├── db.ts                             # Prisma client (driver adapter)
│   ├── cache.ts                          # MemoryCache + getCached helper
│   └── format.ts                         # Shared formatters
├── scripts/ingest/                       # Per-sport ingest scripts + Python exporters / scrapers
├── types/                                # api.ts, sport-config.ts
├── utils/supabase/                       # Supabase SSR server helper
└── prisma/schema.prisma                  # Active sport/player/stat models + standings + race results
```

## Sport-Specific Data Sources

| Sport | API | Cost |
|-------|-----|------|
| F1 | Jolpica (Ergast mirror) `api.jolpi.ca/ergast/f1/` | Free |
| Soccer | football-data.org v4 | Free tier (PL only) |
| NFL | `nfl_data_py` (Python) → CSV → upsert | Free |
| NBA | NBA official stats API | Free, no key |
| Cricket | Cricsheet bulk CSV zips | Free |
| Tennis | Jeff Sackmann ATP/WTA match CSVs | Free |
| MMA | UFC Stats fighter pages | Free |

## Plan

See [PLAN.md](PLAN.md) for project status, history of plans, and outstanding work.

## Agent Rules

- [sportvault/AGENTS.md](sportvault/AGENTS.md) — Next.js 16 has breaking changes from training data; consult `node_modules/next/dist/docs/` before writing Next-specific code
- [sportvault/CLAUDE.md](sportvault/CLAUDE.md) — re-exports AGENTS.md
