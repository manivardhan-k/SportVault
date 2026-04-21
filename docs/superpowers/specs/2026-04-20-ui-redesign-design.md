# SportVault UI Redesign — Design Spec
_2026-04-20_

## Direction

Editorial dark. The Athletic meets F1TV. Near-black background, tight editorial typography, sport accent colors used as sharp purposeful accents. Targets both portfolio impressiveness and casual fan approachability. Neutral enough to serve all four sports equally.

---

## 1. Design System

### Typography
| Role | Font | Notes |
|------|------|-------|
| Headings / display | `Sora` | `letter-spacing: -0.01em` at large sizes |
| Numbers / stats | `JetBrains Mono` | Monospaced — every digit same width |
| Body / UI | `Inter` | Neutral, doesn't compete |

### Color Palette
```
Background:       #080808
Surface:          #111111   (cards, table bg)
Surface raised:   #1a1a1a   (hover, expanded rows)
Row separator:    #1c1c1c   (divider — not full border)
Card border:      transparent → #2a2a2a on hover/focus
Text primary:     #f0f0f0
Text secondary:   #888888
Text muted:       #444444

Positive delta:   #27ae60   (desaturated green)
Negative delta:   #c0392b   (desaturated red)
Neutral delta:    #888888
Data highlight:   #f5a623   (amber — see Amber Rule below)
```

### Sport Accent Colors
```
F1:     #E10600  (official F1 red)
Soccer: #00B04F  (pitch green)
NFL:    #013369  (NFL navy — default; team color on player view, luminance-clamped)
NBA:    #C9082A  (NBA red)
```
Sport accent used for: hero gradient wash, active tab underline, active sort indicator, chart primary line.

### Amber Rule — exactly one value per table
- Amber (`#f5a623`) marks the leader's primary stat — the top value in the active sort column
- Exactly one amber value per table at all times
- Amber follows the active sort column, not the default sort
- Never on labels, never on secondary stats, never alongside accent color
- Default sort is always canonical; active sort is clearly indicated via column underline

### Delta Colors
Applied to stat cells where direction matters (e.g. NFL INT count, passer rating):
- Positive (good): `#27ae60`
- Negative (bad): `#c0392b`
- Neutral / N/A: `#888888`
- Delta colors are never overridden by team or accent colors

### NFL Team Color Usage
- Default league view: NFL navy `#013369`
- Player-specific views: team color allowed, luminance-clamped to avoid visual chaos
- Team color never used for text
- Team color never replaces delta colors (green/red)

### Loading States
- Skeleton shimmer: `#0d0d0d` → `#111111`
- No spinners, no accent color in skeleton
- Keeps the product feeling fast and serious

### Motion
- Row hover: 150ms fade to surface raised
- Row expand: 200ms height transition
- No page transitions

---

## 2. Layout & Shell

```
┌──────────────────────────────────────────────────────────┐
│ SPORTVAULT            🏎️ F1 · ⚽ Soccer · 🏈 NFL · 🏀 NBA│  48px sticky
├──────────────────────────────────────────────────────────┤
│ Championship          ● disabled-tab                     │  40px competition tabs
│ ──────────────────────────────────────────────────────── │
│  HERO STRIP                                              │  56px
├──────────────────────────────────────────────────────────┤
│                           ◄ 2022 · 2023 · 2024 · 2025 ► │  year selector inline
│  LEADERBOARD TABLE                                       │
│  (expandable rows)                                       │
└──────────────────────────────────────────────────────────┘
```

### Header
- Logo `SPORTVAULT` in `Sora` bold, left
- Sport tabs right, separated by `·` dividers
- Active sport: accent-color text + 2px underline
- Emoji icon stays, slightly smaller, leading the name
- No background pill — typography only

### Competition Tabs
- Plain text links in `Inter` medium
- Active: 2px accent-color underline, text-primary
- Disabled: text-muted, `cursor-not-allowed`, `●` prefix to indicate no data
- No rounded pills

### Year Selector
- Replaces right sidebar
- Inline, right-aligned, above table
- Available years as text, active in text-primary, others text-muted
- `JetBrains Mono` for numbers
- `◄ ►` chevrons when years overflow

---

## 3. Hero Strip

**Always shows the season leader on default sort. Never reacts to user re-sorting.**

```
◉ P1  MAX VERSTAPPEN   Red Bull    437 PTS  ·  11W  ·  8PP       2024 Season
```

- Height: 56px
- Background: sport accent at 6% opacity, radial bleed from left edge — barely there
- Position prefix: `JetBrains Mono`, text-muted
- Team color dot: small, never brighter than accent bleed, never animated
- Player name: `Sora` bold ~20px, text-primary
- Stats separator `·` in text-muted
- **First stat**: text-primary (primary importance)
- **Second + third stats**: text-secondary
- Season label: right-aligned, vertically centered, `JetBrains Mono`, text-muted — metadata not content

**Per-sport hero stats:**
```
F1:     PTS (primary)  ·  Wins  ·  Pole Positions
Soccer: Goals (primary) · Assists · Apps
NFL QB: Pass YDS (primary) · TDs · INT
NBA:    PPG (primary) · RPG · APG
```

---

## 4. Leaderboard Table

### Column Headers
- All-caps, 11px, `letter-spacing: 0.08em`, text-muted
- Active sort column: thin accent-color underline (not arrow icon)
- Sticky on scroll

### Row Design
- Left edge: 3px solid team color
- Position: `JetBrains Mono`, text-muted
- Name: `Sora` semibold, text-primary
- Team: text-secondary, smaller
- Stats: `JetBrains Mono`, right-aligned per column
- Points/yards bar: horizontal bar behind row, scaled to leader's value, team color at 15% opacity
- Expand chevron `›` right edge → rotates to `⌄` when open
- Row separator: `#1c1c1c` divider (not full border)
- Hover: surface raised `#1a1a1a`, 150ms

### Industry-Standard Column Labels
```
F1:     #   Driver          Constructor   PTS    W    POD   PP
Soccer: #   Player          Club          Apps   G    A     xG
NFL QB: #   Player (badge)  Team          G      YDS  TD    INT   RTG
NBA:    #   Player          Team          G      PPG  RPG   APG   FG%
```

---

## 5. Expanded Player Row

```
├── P1  MAX VERSTAPPEN  ─────────────────────────────── ⌄ ──┤
│  [437 PTS]  [11 Wins]  [14 Pod]  [8 Poles]  [1 DNF]       │
│                                                             │
│  CUMULATIVE POINTS ─────────────────────── [Pts | Pos]     │
│  [chart — full width]                                       │
│                                             + Compare       │
└─────────────────────────────────────────────────────────────┘
```

- Stat cards: `#1a1a1a` bg, label 10px all-caps text-muted, value `JetBrains Mono` 18px
- Chart area: full width, `#1c1c1c` top divider, chart title 11px all-caps left, toggle right
- `+ Compare` link: bottom-right, text-muted, disabled (wired in future)

**Per-sport chart types:**
```
F1:     Line — cumulative points or finish position per round (dual mode toggle shown)
Soccer: No chart — season summary stat cards only (football-data.org free tier has no per-game data)
NFL QB: Scatter — passing yards vs TD:INT ratio (no toggle — single mode)
NBA:    Radar — PPG/RPG/APG/FG%/3P% (no toggle — single mode)
```

Chart toggle (Pts / Pos) is rendered only when `chartConfig.dualMode === true`. Currently only F1. All other sports show no toggle UI.

---

## 6. Icon System

### Rules — no exceptions
- Max one icon per semantic purpose
  - Status: `⚡` (fastest lap), `★` (triple-double)
  - Category: `⚽` (goals column header)
  - Role: `QB` badge (position pill)
- Icons annotate text — never replace it. Remove all icons and the table must be fully legible
- Always rendered at secondary contrast (`#888888`)
- Never full white, never accent color, never amber
- Never animated
- No icon-only states anywhere

---

## 7. Sport-Specific Details

### F1
- Position format: `P1`, `P2` in `JetBrains Mono`
- Constructor column: 2px color swatch left-border in constructor color
- Fastest lap `⚡` in expanded row (secondary contrast, annotates not encodes)
- Chart x-axis: `RD 1`, `RD 2` etc.

### Soccer
- Position format: `1`, `2` (no prefix)
- Goals column header: `⚽` icon at secondary contrast
- xG column: **removed** — football-data.org free tier does not provide xG data. Column omitted entirely until a data source is available. No placeholder, no empty column.
- Nationality flag emoji next to player name (small, secondary)

### NFL
- Position badge (`QB` / `RB` / `WR` / `TE`): muted pill left of player name — shown in all position views, purely cosmetic annotation
- Table columns are position-specific (QB view shows YDS/TD/INT/RTG; RB view shows Rush Yds/TDs/Rec; WR/TE view shows Rec/Rec Yds/TDs). Position badges do not imply a shared column set.
- Passer rating delta colors (`#27ae60` ≥ 100, `#c0392b` for poor): **deferred** until passer_rating data is fixed (currently always 0). UI renders plain text until data is valid.
- INTs = 0: positive delta `#27ae60`; INTs ≥ 15: negative delta `#c0392b` — these use existing data, implement immediately
- NGS data disclaimer: one line, text-muted, below table

### NBA
- Team abbreviation in team column (space efficiency)
- Efficiency bar behind PPG column (team color, 15% opacity — same as F1 points bar)
- `★` triple-double indicator (future — when data available)

---

## 8. Future: Compare Feature

- `+ Compare` button in expanded row (disabled now, enabled later)
- Will allow selecting 2–4 players across the same season
- Overlay or split-panel showing side-by-side stats + charts
- Add to backlog in PLAN.md

---

## Out of Scope for This Implementation
- Player profile pages (dedicated URLs)
- Search / filter by player name
- Auth / user accounts
- Mobile layout (responsive polish is a separate pass)
