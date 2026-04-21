#!/usr/bin/env python3
"""
Export NFL player stats to CSV using nfl_data_py.
Usage: python scripts/ingest/fetch_nfl.py --year 2023 --output /tmp/nfl_2023.csv
Install: pip install nfl_data_py pandas
"""
import argparse
import nfl_data_py as nfl
import pandas as pd

parser = argparse.ArgumentParser()
parser.add_argument('--year', type=int, required=True)
parser.add_argument('--output', type=str, required=True)
parser.add_argument('--season-type', type=str, default='REG', choices=['REG', 'POST'])
args = parser.parse_args()

print(f"Fetching NFL {args.year} {args.season_type} seasonal data...")

# Seasonal data — clean pre-aggregated season totals, no double-counting
seasonal = nfl.import_seasonal_data([args.year], s_type=args.season_type)

# Weekly data — for player name, position, team, passer_rating
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

# Merge
merged = seasonal.merge(meta, on='player_id', how='inner')

# Keep only skill positions
merged = merged[merged['position'].isin(['QB', 'RB', 'WR', 'TE'])]

merged.to_csv(args.output, index=False)
print(f"Exported {len(merged)} records to {args.output}")
