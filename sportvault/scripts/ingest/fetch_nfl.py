#!/usr/bin/env python3
"""
Export NFL player stats to CSV using nfl_data_py.
Streams rows to avoid holding multiple DataFrames in memory simultaneously.

Stage A: load weekly_data, groupby to build meta + skill-player set, stream weekly CSV, free.
Stage B: load seasonal_data, lookup meta, stream seasonal CSV, free.

Usage: python scripts/ingest/fetch_nfl.py --year 2023 --output /tmp/nfl_2023.csv [--weekly-output /tmp/nfl_2023_weekly.csv] [--games-output /tmp/nfl_2023_games.csv] [--season-type REG|POST]
Install: pip install nfl_data_py pandas
"""
import argparse
import csv
import gc
import nfl_data_py as nfl

parser = argparse.ArgumentParser()
parser.add_argument('--year', type=int, required=True)
parser.add_argument('--output', type=str, required=True)
parser.add_argument('--weekly-output', type=str, default=None)
parser.add_argument('--games-output', type=str, default=None)
parser.add_argument('--season-type', type=str, default='REG', choices=['REG', 'POST'])
args = parser.parse_args()

SKILL_POSITIONS = {'QB', 'RB', 'WR', 'TE'}
WEEKLY_STAT_COLS = [
    'passing_yards', 'passing_tds', 'interceptions', 'completions', 'attempts',
    'completion_percentage', 'passer_rating',
    'rushing_yards', 'rushing_tds',
    'receptions', 'receiving_yards', 'receiving_tds', 'fantasy_points',
]

def is_missing(value):
    if value is None:
        return True
    try:
        return bool(value != value)
    except Exception:
        return False

def csv_value(value):
    return '' if is_missing(value) else value

def row_value(row, names):
    for name in names:
        if name in row.index:
            return row[name]
    return None

# ---------- Stage A: weekly data → meta dict + weekly CSV ----------
print(f"[stage A] loading weekly NFL {args.year} {args.season_type}...")
weekly = nfl.import_weekly_data([args.year])
weekly = weekly[weekly['season_type'] == args.season_type]

# Build meta dict (player_id -> {name, pos, team, passer_rating mean}) via groupby
agg_spec = dict(
    player_name=('player_name', 'last'),
    player_display_name=('player_display_name', 'last'),
    position=('position', 'last'),
    recent_team=('recent_team', 'last'),
)
if 'passer_rating' in weekly.columns:
    agg_spec['passer_rating'] = ('passer_rating', 'mean')

meta_df = weekly.groupby('player_id').agg(**agg_spec).reset_index()
meta = {}
for row in meta_df.itertuples(index=False):
    pos = (row.position or '').upper()
    if pos not in SKILL_POSITIONS:
        continue
    meta[row.player_id] = {
        'player_name': row.player_name or '',
        'player_display_name': getattr(row, 'player_display_name', '') or '',
        'position': pos,
        'recent_team': (row.recent_team or '').strip() or 'UNK',
        'passer_rating_mean': getattr(row, 'passer_rating', 0.0) if 'passer_rating' in agg_spec else 0.0,
    }
del meta_df

skill_ids = set(meta.keys())
print(f"[stage A] {len(skill_ids)} skill-position players")

# Stream weekly CSV (filter skill players + collect only stat columns we use)
if args.weekly_output:
    print(f"[stage A] writing weekly CSV → {args.weekly_output}")
    available_stats = [c for c in WEEKLY_STAT_COLS if c in weekly.columns]
    header = ['player_id', 'week'] + available_stats
    weekly_count = 0
    with open(args.weekly_output, 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader()
        for row in weekly.itertuples(index=False):
            pid = row.player_id
            if pid not in skill_ids:
                continue
            wk = getattr(row, 'week', None)
            if wk is None:
                continue
            out = {'player_id': pid, 'week': int(wk)}
            for col in available_stats:
                v = getattr(row, col, None)
                out[col] = csv_value(v)
            w.writerow(out)
            weekly_count += 1
    print(f"[stage A] wrote {weekly_count} weekly rows")

# Free weekly DataFrame before loading seasonal
del weekly
gc.collect()

# ---------- Stage B: seasonal data → seasonal CSV (with meta merged) ----------
print(f"[stage B] loading seasonal NFL {args.year} {args.season_type}...")
seasonal = nfl.import_seasonal_data([args.year], s_type=args.season_type)

def passer_rating_from_seasonal(att, cmp_, yds, td, ints):
    att = att or 0
    if att <= 0:
        return 0.0
    cmp_ = cmp_ or 0
    yds = yds or 0
    td = td or 0
    ints = ints or 0
    a = max(0, min(2.375, (cmp_ / att - 0.3) * 5))
    b = max(0, min(2.375, (yds / att - 3) * 0.25))
    c = max(0, min(2.375, (td / att) * 20))
    d = max(0, min(2.375, 2.375 - (ints / att * 25)))
    return round(((a + b + c + d) / 6) * 100, 1)

SEASONAL_NUMERIC_COLS = [
    'games', 'passing_yards', 'passing_tds', 'interceptions',
    'completions', 'attempts',
    'rushing_yards', 'rushing_tds',
    'receptions', 'targets', 'receiving_yards', 'receiving_tds',
]

avail_seasonal = [c for c in SEASONAL_NUMERIC_COLS if c in seasonal.columns]
header = ['player_id', 'player_name', 'player_display_name', 'position', 'recent_team', 'passer_rating'] + avail_seasonal

print(f"[stage B] writing seasonal CSV → {args.output}")
seasonal_count = 0
computed_pr = 0
with open(args.output, 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=header)
    w.writeheader()
    for row in seasonal.itertuples(index=False):
        pid = row.player_id
        m = meta.get(pid)
        if not m:
            continue  # skip non-skill positions

        att = getattr(row, 'attempts', 0) or 0
        cmp_ = getattr(row, 'completions', 0) or 0
        yds = getattr(row, 'passing_yards', 0) or 0
        td = getattr(row, 'passing_tds', 0) or 0
        ints = getattr(row, 'interceptions', 0) or 0

        pr = m['passer_rating_mean'] or 0.0
        if (is_missing(pr) or pr == 0) and m['position'] == 'QB':
            pr = passer_rating_from_seasonal(att, cmp_, yds, td, ints)
            computed_pr += 1

        out = {
            'player_id': pid,
            'player_name': m['player_name'],
            'player_display_name': m['player_display_name'],
            'position': m['position'],
            'recent_team': m['recent_team'],
            'passer_rating': csv_value(pr),
        }
        for col in avail_seasonal:
            v = getattr(row, col, None)
            out[col] = csv_value(v)
        w.writerow(out)
        seasonal_count += 1

del seasonal
del meta
gc.collect()

print(f"[stage B] wrote {seasonal_count} seasonal rows ({computed_pr} passer_rating computed from seasonal totals)")

# ---------- Stage C: schedules → completed games CSV ----------
if args.games_output:
    print(f"[stage C] loading schedules for {args.year}...")
    schedules = nfl.import_schedules([args.year])

    season_type_col = None
    for candidate in ['game_type', 'season_type']:
        if candidate in schedules.columns:
            season_type_col = candidate
            break
    if season_type_col:
        if args.season_type == 'POST':
            # game_type uses WC/DIV/CON/SB; season_type uses POST
            allowed = {'WC', 'DIV', 'CON', 'SB', 'POST'}
        else:
            allowed = {'REG'}
        schedules = schedules[schedules[season_type_col].isin(allowed)]


    header = ['game_id', 'week', 'gameday', 'home_team', 'away_team', 'home_score', 'away_score']
    game_count = 0
    with open(args.games_output, 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader()
        for _, row in schedules.iterrows():
            week = row_value(row, ['week'])
            home_team = row_value(row, ['home_team'])
            away_team = row_value(row, ['away_team'])
            home_score = row_value(row, ['home_score', 'home_points'])
            away_score = row_value(row, ['away_score', 'away_points'])

            if week is None or is_missing(home_team) or is_missing(away_team):
                continue
            if is_missing(home_score) or is_missing(away_score):
                continue

            game_id = row_value(row, ['game_id', 'gsis_id', 'gamekey'])
            gameday = row_value(row, ['gameday', 'game_date', 'date'])
            out = {
                'game_id': csv_value(game_id) or f"{args.year}-{args.season_type}-{int(week)}-{away_team}-{home_team}",
                'week': int(week),
                'gameday': csv_value(gameday),
                'home_team': str(home_team).strip().upper(),
                'away_team': str(away_team).strip().upper(),
                'home_score': int(home_score),
                'away_score': int(away_score),
            }
            w.writerow(out)
            game_count += 1

    del schedules
    gc.collect()
    print(f"[stage C] wrote {game_count} completed games")

print("done")
