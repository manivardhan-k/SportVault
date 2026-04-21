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

print(f"Fetching NFL {args.year} {args.season_type} weekly data...")
weekly = nfl.import_weekly_data([args.year])
weekly = weekly[weekly['season_type'] == args.season_type]

agg_dict = {
    'games': ('week', 'count'),
    'passing_yards': ('passing_yards', 'sum'),
    'passing_tds': ('passing_tds', 'sum'),
    'interceptions': ('interceptions', 'sum'),
    'rushing_yards': ('rushing_yards', 'sum'),
    'rushing_tds': ('rushing_tds', 'sum'),
    'receptions': ('receptions', 'sum'),
    'targets': ('targets', 'sum'),
    'receiving_yards': ('receiving_yards', 'sum'),
    'receiving_tds': ('receiving_tds', 'sum'),
}
if 'passer_rating' in weekly.columns:
    agg_dict['passer_rating'] = ('passer_rating', 'mean')

agg = weekly.groupby(['player_id', 'player_name', 'position', 'recent_team']).agg(**agg_dict).reset_index()
if 'passer_rating' not in agg.columns:
    agg['passer_rating'] = 0.0

agg.to_csv(args.output, index=False)
print(f"Exported {len(agg)} records to {args.output}")
