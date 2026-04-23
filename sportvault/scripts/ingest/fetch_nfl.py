#!/usr/bin/env python3
"""
Export NFL player stats to CSV using nfl_data_py.
Usage: python scripts/ingest/fetch_nfl.py --year 2023 --output /tmp/nfl_2023.csv [--weekly-output /tmp/nfl_2023_weekly.csv]
Install: pip install nfl_data_py pandas
"""
import argparse
import nfl_data_py as nfl
import pandas as pd

parser = argparse.ArgumentParser()
parser.add_argument('--year', type=int, required=True)
parser.add_argument('--output', type=str, required=True)
parser.add_argument('--weekly-output', type=str, default=None)
parser.add_argument('--season-type', type=str, default='REG', choices=['REG', 'POST'])
args = parser.parse_args()

print(f"Fetching NFL {args.year} {args.season_type} seasonal data...")

# Seasonal data — clean pre-aggregated season totals, no double-counting
seasonal = nfl.import_seasonal_data([args.year], s_type=args.season_type)

# Weekly data — for player name, position, team, passer_rating (and per-week stats)
weekly = nfl.import_weekly_data([args.year])
weekly = weekly[weekly['season_type'] == args.season_type]

# Get per-player metadata: name, position, team (last known), avg passer_rating
agg_spec = dict(
    player_name=('player_name', 'last'),
    player_display_name=('player_display_name', 'last'),
    position=('position', 'last'),
    recent_team=('recent_team', 'last'),
)
if 'passer_rating' in weekly.columns:
    agg_spec['passer_rating'] = ('passer_rating', 'mean')

meta = weekly.groupby('player_id').agg(**agg_spec).reset_index()
if 'passer_rating' not in meta.columns:
    meta['passer_rating'] = 0.0

# Merge seasonal + metadata
merged = seasonal.merge(meta, on='player_id', how='inner')

# Keep only skill positions
merged = merged[merged['position'].isin(['QB', 'RB', 'WR', 'TE'])]

merged.to_csv(args.output, index=False)
print(f"Exported {len(merged)} records to {args.output}")

# Export weekly stats if requested
if args.weekly_output:
    print(f"Exporting weekly data...")
    # Only skill position players that made it into the seasonal merge
    skill_ids = set(merged['player_id'].unique())
    weekly_skill = weekly[weekly['player_id'].isin(skill_ids)].copy()

    # Keep only columns we care about
    keep_cols = ['player_id', 'week']
    stat_cols = [
        'passing_yards', 'passing_tds', 'interceptions', 'completions',
        'attempts', 'rushing_yards', 'rushing_tds', 'receptions',
        'receiving_yards', 'receiving_tds', 'fantasy_points',
    ]
    if 'passer_rating' in weekly_skill.columns:
        stat_cols.append('passer_rating')
    if 'completion_percentage' in weekly_skill.columns:
        stat_cols.append('completion_percentage')

    available = [c for c in stat_cols if c in weekly_skill.columns]
    weekly_out = weekly_skill[keep_cols + available].copy()
    weekly_out.to_csv(args.weekly_output, index=False)
    print(f"Exported {len(weekly_out)} weekly records to {args.weekly_output}")
