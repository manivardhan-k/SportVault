#!/usr/bin/env python3
import argparse
import csv
import io
import os
import tempfile
import urllib.request
from collections import defaultdict

parser = argparse.ArgumentParser()
parser.add_argument('--year', type=int, required=True)
parser.add_argument('--tour', type=str, required=True, choices=['atp', 'wta'])
parser.add_argument('--output', type=str, required=True)
parser.add_argument('--input-csv', type=str)
args = parser.parse_args()

SURFACE_MAP = {
    'Hard': 'HARD',
    'Clay': 'CLAY',
    'Grass': 'GRASS',
    'Carpet': 'CARPET',
}

tour = args.tour.lower()
url = f'https://raw.githubusercontent.com/JeffSackmann/tennis_{tour}/master/{tour}_matches_{args.year}.csv'


def load_source_text():
    if args.input_csv:
        print(f'[tennis] reading local fixture {args.input_csv}')
        with open(args.input_csv, 'r', encoding='utf-8') as fh:
            return fh.read()

    cache_dir = os.path.join(tempfile.gettempdir(), 'sportvault-source-cache')
    os.makedirs(cache_dir, exist_ok=True)
    cache_path = os.path.join(cache_dir, f'{tour}_matches_{args.year}.csv')

    if os.path.exists(cache_path):
        print(f'[tennis] using cache {cache_path}')
        with open(cache_path, 'r', encoding='utf-8') as fh:
            return fh.read()

    print(f'[tennis] downloading {url}')
    with urllib.request.urlopen(url) as resp:
        text = resp.read().decode('utf-8')
    with open(cache_path, 'w', encoding='utf-8') as fh:
        fh.write(text)
    return text


def include_match(row):
    score = (row.get('score') or '').strip().upper()
    if score in {'W/O', 'WO'}:
        return False

    # ATP year-end win/loss summaries still count Davis Cup, but walkovers should
    # not inflate official records. WTA year-end win summaries exclude United Cup
    # matches ('I'), but keep tour-level, Olympics, and Billie Jean King Cup rows.
    level = (row.get('tourney_level') or '').strip().upper()
    if tour == 'wta' and level == 'I':
        return False
    return True


text = load_source_text()

reader = csv.DictReader(io.StringIO(text))
agg = defaultdict(lambda: {
    'matches': 0,
    'wins': 0,
    'aces': 0,
    'double_faults': 0,
    'svpt': 0,
    'first_in': 0,
    'first_won': 0,
    'return_won': 0,
    'return_total': 0,
    'rank': 0,
    'last_date': '',
    'player_name': '',
    'nationality': '',
})

def to_int(value):
    try:
        return int(float(value or 0))
    except Exception:
        return 0

def update(player_id, player_name, nationality, surface, won, prefix, opp_prefix, row):
    if not player_id:
        return
    bucket_surfaces = ('ALL',) if surface == 'ALL' else ('ALL', surface)
    for bucket_surface in bucket_surfaces:
        key = (player_id, bucket_surface)
        cur = agg[key]
        cur['matches'] += 1
        cur['wins'] += won
        cur['aces'] += to_int(row.get(f'{prefix}_ace'))
        cur['double_faults'] += to_int(row.get(f'{prefix}_df'))
        svpt = to_int(row.get(f'{prefix}_svpt'))
        first_in = to_int(row.get(f'{prefix}_1stIn'))
        first_won = to_int(row.get(f'{prefix}_1stWon'))
        opp_svpt = to_int(row.get(f'{opp_prefix}_svpt'))
        opp_first_won = to_int(row.get(f'{opp_prefix}_1stWon'))
        opp_second_won = to_int(row.get(f'{opp_prefix}_2ndWon'))
        cur['svpt'] += svpt
        cur['first_in'] += first_in
        cur['first_won'] += first_won
        cur['return_won'] += max(opp_svpt - opp_first_won - opp_second_won, 0)
        cur['return_total'] += opp_svpt
        cur['player_name'] = player_name
        cur['nationality'] = nationality or cur['nationality']
        date = row.get('tourney_date', '') or ''
        rank_col = 'winner_rank' if prefix == 'w' else 'loser_rank'
        rank = to_int(row.get(rank_col))
        if date >= cur['last_date']:
          cur['last_date'] = date
          if rank:
            cur['rank'] = rank

for row in reader:
    if not include_match(row):
        continue
    surface = SURFACE_MAP.get(row.get('surface', ''), 'ALL')
    update(row.get('winner_id', ''), row.get('winner_name', ''), row.get('winner_ioc', ''), surface, 1, 'w', 'l', row)
    update(row.get('loser_id', ''), row.get('loser_name', ''), row.get('loser_ioc', ''), surface, 0, 'l', 'w', row)

with open(args.output, 'w', newline='') as fh:
    writer = csv.DictWriter(fh, fieldnames=[
        'player_id', 'player_name', 'nationality', 'tour', 'surface', 'matches', 'wins',
        'aces', 'double_faults', 'first_serve_pct', 'first_srv_won_pct', 'return_won_pct', 'rank_year_end',
    ])
    writer.writeheader()
    for (player_id, surface), cur in agg.items():
        matches = cur['matches']
        if matches == 0:
            continue
        svpt = cur['svpt']
        first_in = cur['first_in']
        first_won = cur['first_won']
        return_total = cur['return_total']
        writer.writerow({
            'player_id': player_id,
            'player_name': cur['player_name'],
            'nationality': cur['nationality'],
            'tour': args.tour.upper(),
            'surface': surface,
            'matches': matches,
            'wins': cur['wins'],
            'aces': cur['aces'],
            'double_faults': cur['double_faults'],
            'first_serve_pct': round((first_in / svpt) * 100, 2) if svpt else 0,
            'first_srv_won_pct': round((first_won / first_in) * 100, 2) if first_in else 0,
            'return_won_pct': round((cur['return_won'] / return_total) * 100, 2) if return_total else 0,
            'rank_year_end': cur['rank'] or 0,
        })

print(f'[tennis] wrote {args.output}')
