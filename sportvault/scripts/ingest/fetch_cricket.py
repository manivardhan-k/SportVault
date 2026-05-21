#!/usr/bin/env python3
import argparse
import csv
import gc
import io
import os
import ssl
import tempfile
import urllib.request
import zipfile
from collections import defaultdict

parser = argparse.ArgumentParser()
parser.add_argument('--year', type=int, required=True)
parser.add_argument('--type', type=str, required=True, choices=['t20i', 'odi', 'test', 'ipl'])
parser.add_argument('--output', type=str, required=True)
parser.add_argument('--match-output', type=str)
parser.add_argument('--input-dir', type=str)
args = parser.parse_args()

DOWNLOAD_PATH = {
    't20i': 't20s_male_csv.zip',
    'odi': 'odis_male_csv.zip',
    'test': 'tests_male_csv.zip',
    'ipl': 'ipl_csv.zip',
}
FORMAT_LABEL = {
    't20i': 'T20I',
    'odi': 'ODI',
    'test': 'TEST',
    'ipl': 'IPL',
}
BOWLER_UNCREDITED = {'run out', 'retired hurt', 'retired out', 'obstructing the field'}
BATTER_NOT_OUT = {'retired hurt', 'retired not out'}
T20I_MATCH_TYPES = {'IT20', 'T20I'}
PLAYER_NAME_ALIASES = {
    'kusal_mendis': ['bkg_mendis'],
    'akila_dananjaya': ['a_dananjaya'],
}
SUPPLEMENTAL_MATCHES = {
    ('t20i', 2024): [
        {
            'match_id': 'supplemental_uae_afg_2024_3rd_t20i',
            'date': '2024/01/02',
            'event': 'Afghanistan in United Arab Emirates 2023/2024',
            'teams': ['United Arab Emirates', 'Afghanistan'],
            'batting': {
                'United Arab Emirates': [
                    {'name': 'Waseem Muhammad', 'runs': 27, 'balls': 25, 'dismissed': True},
                    {'name': 'Aryan Lakra', 'runs': 1, 'balls': 2, 'dismissed': True},
                    {'name': 'Vriitya Aravind', 'runs': 0, 'balls': 1, 'dismissed': True},
                    {'name': 'Tanish Suri', 'runs': 7, 'balls': 12, 'dismissed': True},
                    {'name': 'Dhruv Parashar', 'runs': 0, 'balls': 2, 'dismissed': True},
                    {'name': 'Basil Hameed', 'runs': 12, 'balls': 17, 'dismissed': True},
                    {'name': 'Ali Naseer', 'runs': 21, 'balls': 22, 'dismissed': True},
                    {'name': 'Aayan Khan', 'runs': 10, 'balls': 10, 'dismissed': True},
                    {'name': 'Akif Raja', 'runs': 10, 'balls': 12, 'dismissed': True},
                    {'name': 'Muhammad Jawadullah', 'runs': 13, 'balls': 11, 'dismissed': False},
                    {'name': 'Junaid Siddique', 'runs': 6, 'balls': 7, 'dismissed': False},
                ],
                'Afghanistan': [
                    {'name': 'Hazratullah Zazai', 'runs': 36, 'balls': 32, 'dismissed': True},
                    {'name': 'Rahmanullah Gurbaz', 'runs': 20, 'balls': 14, 'dismissed': True},
                    {'name': 'Ibrahim Zadran', 'runs': 23, 'balls': 30, 'dismissed': True},
                    {'name': 'Azmatullah Omarzai', 'runs': 16, 'balls': 13, 'dismissed': True},
                    {'name': 'Darwish Rasooli', 'runs': 2, 'balls': 5, 'dismissed': True},
                    {'name': 'Najibullah Zadran', 'runs': 28, 'balls': 13, 'dismissed': False},
                    {'name': 'Mohammad Nabi', 'runs': 1, 'balls': 2, 'dismissed': True},
                    {'name': 'Sharafuddin Ashraf', 'runs': 0, 'balls': 2, 'dismissed': False},
                ],
            },
            'bowling': {
                'United Arab Emirates': [
                    {'name': 'Aayan Khan', 'overs': 4, 'balls': 0, 'runs_conceded': 26, 'wickets': 1},
                    {'name': 'Muhammad Jawadullah', 'overs': 4, 'balls': 0, 'runs_conceded': 30, 'wickets': 1},
                    {'name': 'Junaid Siddique', 'overs': 3, 'balls': 3, 'runs_conceded': 32, 'wickets': 2},
                    {'name': 'Ali Naseer', 'overs': 4, 'balls': 0, 'runs_conceded': 24, 'wickets': 1},
                    {'name': 'Dhruv Parashar', 'overs': 3, 'balls': 0, 'runs_conceded': 14, 'wickets': 1},
                ],
                'Afghanistan': [
                    {'name': 'Fazalhaq Farooqi', 'overs': 2, 'balls': 0, 'runs_conceded': 14, 'wickets': 0},
                    {'name': 'Naveen-ul-Haq', 'overs': 4, 'balls': 0, 'runs_conceded': 20, 'wickets': 4},
                    {'name': 'Azmatullah Omarzai', 'overs': 4, 'balls': 0, 'runs_conceded': 32, 'wickets': 2},
                    {'name': 'Qais Ahmad', 'overs': 4, 'balls': 0, 'runs_conceded': 24, 'wickets': 3},
                    {'name': 'Sharafuddin Ashraf', 'overs': 4, 'balls': 0, 'runs_conceded': 21, 'wickets': 0},
                    {'name': 'Mohammad Nabi', 'overs': 2, 'balls': 0, 'runs_conceded': 13, 'wickets': 0},
                ],
            },
        },
    ],
    ('odi', 2024): [
        {
            'match_id': 'supplemental_sl_afg_2024_1st_odi',
            'date': '2024/02/09',
            'event': 'Afghanistan in Sri Lanka ODI Series 2024',
            'teams': ['Sri Lanka', 'Afghanistan'],
            'batting': {
                'Sri Lanka': [
                    {'name': 'Pathum Nissanka', 'runs': 210, 'balls': 139, 'dismissed': False},
                    {'name': 'Avishka Fernando', 'runs': 88, 'balls': 88, 'dismissed': True},
                    {'name': 'Kusal Mendis', 'runs': 16, 'balls': 31, 'dismissed': True},
                    {'name': 'Sadeera Samarawickrama', 'runs': 45, 'balls': 36, 'dismissed': True},
                    {'name': 'Charith Asalanka', 'runs': 7, 'balls': 8, 'dismissed': False},
                ],
                'Afghanistan': [
                    {'name': 'Rahmanullah Gurbaz', 'runs': 1, 'balls': 3, 'dismissed': True},
                    {'name': 'Ibrahim Zadran', 'runs': 4, 'balls': 7, 'dismissed': True},
                    {'name': 'Rahmat Shah', 'runs': 7, 'balls': 14, 'dismissed': True},
                    {'name': 'Hashmatullah Shahidi', 'runs': 7, 'balls': 11, 'dismissed': True},
                    {'name': 'Azmatullah Omarzai', 'runs': 149, 'balls': 115, 'dismissed': False},
                    {'name': 'Gulbadin Naib', 'runs': 16, 'balls': 7, 'dismissed': True},
                    {'name': 'Mohammad Nabi', 'runs': 136, 'balls': 130, 'dismissed': True},
                    {'name': 'Ikram Alikhil', 'runs': 10, 'balls': 14, 'dismissed': False},
                ],
            },
            'bowling': {
                'Sri Lanka': [
                    {'name': 'Dilshan Madushanka', 'overs': 9, 'balls': 0, 'runs_conceded': 65, 'wickets': 0},
                    {'name': 'Pramod Madushan', 'overs': 10, 'balls': 0, 'runs_conceded': 75, 'wickets': 4},
                    {'name': 'Dushmantha Chameera', 'overs': 7, 'balls': 3, 'runs_conceded': 55, 'wickets': 2},
                    {'name': 'Wanindu Hasaranga', 'overs': 10, 'balls': 0, 'runs_conceded': 57, 'wickets': 0},
                    {'name': 'Maheesh Theekshana', 'overs': 10, 'balls': 0, 'runs_conceded': 56, 'wickets': 0},
                    {'name': 'Janith Liyanage', 'overs': 3, 'balls': 0, 'runs_conceded': 25, 'wickets': 0},
                    {'name': 'Charith Asalanka', 'overs': 0, 'balls': 3, 'runs_conceded': 3, 'wickets': 0},
                ],
                'Afghanistan': [
                    {'name': 'Fazalhaq Farooqi', 'overs': 9, 'balls': 0, 'runs_conceded': 77, 'wickets': 0},
                    {'name': 'Azmatullah Omarzai', 'overs': 6, 'balls': 0, 'runs_conceded': 55, 'wickets': 0},
                    {'name': 'Fareed Ahmad', 'overs': 9, 'balls': 0, 'runs_conceded': 79, 'wickets': 2},
                    {'name': 'Gulbadin Naib', 'overs': 8, 'balls': 0, 'runs_conceded': 61, 'wickets': 0},
                    {'name': 'Noor Ahmad', 'overs': 8, 'balls': 0, 'runs_conceded': 62, 'wickets': 0},
                    {'name': 'Mohammad Nabi', 'overs': 10, 'balls': 0, 'runs_conceded': 44, 'wickets': 1},
                ],
            },
        },
        {
            'match_id': 'supplemental_sl_afg_2024_2nd_odi',
            'date': '2024/02/11',
            'event': 'Afghanistan in Sri Lanka ODI Series 2024',
            'teams': ['Sri Lanka', 'Afghanistan'],
            'batting': {
                'Sri Lanka': [
                    {'name': 'Pathum Nissanka', 'runs': 18, 'balls': 17, 'dismissed': True},
                    {'name': 'Avishka Fernando', 'runs': 5, 'balls': 23, 'dismissed': True},
                    {'name': 'Kusal Mendis', 'runs': 61, 'balls': 65, 'dismissed': True},
                    {'name': 'Sadeera Samarawickrama', 'runs': 52, 'balls': 61, 'dismissed': True},
                    {'name': 'Charith Asalanka', 'runs': 97, 'balls': 74, 'dismissed': False},
                    {'name': 'Janith Liyanage', 'runs': 50, 'balls': 48, 'dismissed': True},
                    {'name': 'Wanindu Hasaranga', 'runs': 14, 'balls': 13, 'dismissed': True},
                ],
                'Afghanistan': [
                    {'name': 'Rahmanullah Gurbaz', 'runs': 8, 'balls': 20, 'dismissed': True},
                    {'name': 'Ibrahim Zadran', 'runs': 54, 'balls': 76, 'dismissed': True},
                    {'name': 'Rahmat Shah', 'runs': 63, 'balls': 69, 'dismissed': True},
                    {'name': 'Hashmatullah Shahidi', 'runs': 9, 'balls': 12, 'dismissed': True},
                    {'name': 'Azmatullah Omarzai', 'runs': 3, 'balls': 6, 'dismissed': True},
                    {'name': 'Mohammad Nabi', 'runs': 1, 'balls': 4, 'dismissed': True},
                    {'name': 'Ikram Alikhil', 'runs': 4, 'balls': 1, 'dismissed': True},
                    {'name': 'Gulbadin Naib', 'runs': 0, 'balls': 7, 'dismissed': True},
                    {'name': 'Qais Ahmad', 'runs': 1, 'balls': 4, 'dismissed': True},
                    {'name': 'Noor Ahmad', 'runs': 0, 'balls': 1, 'dismissed': True},
                    {'name': 'Fazalhaq Farooqi', 'runs': 0, 'balls': 3, 'dismissed': False},
                ],
            },
            'bowling': {
                'Sri Lanka': [
                    {'name': 'Dilshan Madushanka', 'overs': 7, 'balls': 0, 'runs_conceded': 28, 'wickets': 2},
                    {'name': 'Pramod Madushan', 'overs': 6, 'balls': 0, 'runs_conceded': 37, 'wickets': 1},
                    {'name': 'Asitha Fernando', 'overs': 6, 'balls': 0, 'runs_conceded': 23, 'wickets': 2},
                    {'name': 'Maheesh Theekshana', 'overs': 6, 'balls': 0, 'runs_conceded': 25, 'wickets': 0},
                    {'name': 'Janith Liyanage', 'overs': 2, 'balls': 0, 'runs_conceded': 13, 'wickets': 0},
                    {'name': 'Wanindu Hasaranga', 'overs': 6, 'balls': 5, 'runs_conceded': 27, 'wickets': 4},
                ],
                'Afghanistan': [
                    {'name': 'Fazalhaq Farooqi', 'overs': 10, 'balls': 0, 'runs_conceded': 55, 'wickets': 1},
                    {'name': 'Azmatullah Omarzai', 'overs': 10, 'balls': 0, 'runs_conceded': 56, 'wickets': 3},
                    {'name': 'Mohammad Nabi', 'overs': 10, 'balls': 0, 'runs_conceded': 38, 'wickets': 0},
                    {'name': 'Gulbadin Naib', 'overs': 5, 'balls': 0, 'runs_conceded': 48, 'wickets': 0},
                    {'name': 'Noor Ahmad', 'overs': 8, 'balls': 0, 'runs_conceded': 54, 'wickets': 1},
                    {'name': 'Qais Ahmad', 'overs': 7, 'balls': 0, 'runs_conceded': 55, 'wickets': 1},
                ],
            },
        },
        {
            'match_id': 'supplemental_sl_afg_2024_3rd_odi',
            'date': '2024/02/14',
            'event': 'Afghanistan in Sri Lanka ODI Series 2024',
            'teams': ['Afghanistan', 'Sri Lanka'],
            'batting': {
                'Afghanistan': [
                    {'name': 'Rahmanullah Gurbaz', 'runs': 48, 'balls': 57, 'dismissed': True},
                    {'name': 'Ibrahim Zadran', 'runs': 13, 'balls': 10, 'dismissed': True},
                    {'name': 'Rahmat Shah', 'runs': 65, 'balls': 77, 'dismissed': True},
                    {'name': 'Hashmatullah Shahidi', 'runs': 5, 'balls': 8, 'dismissed': True},
                    {'name': 'Azmatullah Omarzai', 'runs': 54, 'balls': 59, 'dismissed': True},
                    {'name': 'Ikram Alikhil', 'runs': 32, 'balls': 38, 'dismissed': True},
                    {'name': 'Mohammad Nabi', 'runs': 14, 'balls': 21, 'dismissed': True},
                    {'name': 'Sharafuddin Ashraf', 'runs': 4, 'balls': 9, 'dismissed': True},
                    {'name': 'Qais Ahmad', 'runs': 11, 'balls': 4, 'dismissed': True},
                    {'name': 'Fareed Ahmad', 'runs': 5, 'balls': 5, 'dismissed': True},
                    {'name': 'Fazalhaq Farooqi', 'runs': 0, 'balls': 3, 'dismissed': False},
                ],
                'Sri Lanka': [
                    {'name': 'Pathum Nissanka', 'runs': 118, 'balls': 101, 'dismissed': True},
                    {'name': 'Avishka Fernando', 'runs': 91, 'balls': 66, 'dismissed': True},
                    {'name': 'Kusal Mendis', 'runs': 40, 'balls': 29, 'dismissed': True},
                    {'name': 'Sadeera Samarawickrama', 'runs': 8, 'balls': 5, 'dismissed': False},
                    {'name': 'Charith Asalanka', 'runs': 7, 'balls': 13, 'dismissed': False},
                ],
            },
            'bowling': {
                'Afghanistan': [
                    {'name': 'Fazalhaq Farooqi', 'overs': 5, 'balls': 0, 'runs_conceded': 54, 'wickets': 0},
                    {'name': 'Azmatullah Omarzai', 'overs': 4, 'balls': 0, 'runs_conceded': 29, 'wickets': 0},
                    {'name': 'Sharafuddin Ashraf', 'overs': 6, 'balls': 0, 'runs_conceded': 47, 'wickets': 0},
                    {'name': 'Fareed Ahmad', 'overs': 4, 'balls': 0, 'runs_conceded': 45, 'wickets': 0},
                    {'name': 'Mohammad Nabi', 'overs': 9, 'balls': 2, 'runs_conceded': 46, 'wickets': 1},
                    {'name': 'Qais Ahmad', 'overs': 7, 'balls': 0, 'runs_conceded': 46, 'wickets': 2},
                ],
                'Sri Lanka': [
                    {'name': 'Dilshan Madushanka', 'overs': 6, 'balls': 0, 'runs_conceded': 52, 'wickets': 0},
                    {'name': 'Pramod Madushan', 'overs': 8, 'balls': 2, 'runs_conceded': 45, 'wickets': 3},
                    {'name': 'Asitha Fernando', 'overs': 9, 'balls': 0, 'runs_conceded': 44, 'wickets': 2},
                    {'name': 'Dunith Wellalage', 'overs': 10, 'balls': 0, 'runs_conceded': 38, 'wickets': 2},
                    {'name': 'Janith Liyanage', 'overs': 2, 'balls': 0, 'runs_conceded': 11, 'wickets': 0},
                    {'name': 'Akila Dananjaya', 'overs': 10, 'balls': 0, 'runs_conceded': 54, 'wickets': 2},
                    {'name': 'Charith Asalanka', 'overs': 3, 'balls': 0, 'runs_conceded': 17, 'wickets': 0},
                ],
            },
        },
    ],
}


def to_int(value):
    try:
        return int(float(value or 0))
    except Exception:
        return 0


def player_key(name, fallback=''):
    raw = (name or fallback or '').strip()
    return raw.lower().replace(' ', '_')


def canonical_player_id(name, fallback=''):
    key = player_key(name, fallback)
    if player_ids_by_name.get(key):
        return player_ids_by_name[key]
    for alias_key in PLAYER_NAME_ALIASES.get(key, []):
        if player_ids_by_name.get(alias_key):
            return player_ids_by_name[alias_key]
    return key


def clean(value):
    raw = (value or '').strip()
    return '' if raw == '""' else raw


url = f"https://cricsheet.org/downloads/{DOWNLOAD_PATH[args.type]}"


def download_source_bytes(download_url):
    try:
        with urllib.request.urlopen(download_url) as resp:
            return resp.read()
    except Exception:
        insecure_context = ssl._create_unverified_context()
        with urllib.request.urlopen(download_url, context=insecure_context) as resp:
            return resp.read()


def open_match_streams():
    if args.input_dir:
        print(f"[cricket] reading local fixtures from {args.input_dir}")
        for name in sorted(os.listdir(args.input_dir)):
            if not name.endswith('.csv'):
                continue
            path = os.path.join(args.input_dir, name)
            with open(path, 'r', encoding='utf-8', newline='') as fh:
                yield name, csv.reader(fh)
        return

    cache_dir = os.path.join(tempfile.gettempdir(), 'sportvault-source-cache')
    os.makedirs(cache_dir, exist_ok=True)
    cache_path = os.path.join(cache_dir, os.path.basename(url))

    if os.path.exists(cache_path):
        print(f"[cricket] using cache {cache_path}")
        with open(cache_path, 'rb') as fh:
            data = fh.read()
    else:
        print(f"[cricket] downloading {url}")
        data = download_source_bytes(url)
        with open(cache_path, 'wb') as fh:
            fh.write(data)

    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        for name in zf.namelist():
            if not name.endswith('.csv'):
                continue
            with zf.open(name) as fh:
                yield name, csv.reader(io.TextIOWrapper(fh, encoding='utf-8'))


def is_target_match(match_year, match_type):
    if match_year != str(args.year):
        return False
    if args.type == 't20i' and match_type and match_type not in T20I_MATCH_TYPES:
        return False
    return True


def add_match_player(player_id, player_name, team_name, match_id):
    player = players[player_id]
    player['player_name'] = player_name
    player['team_counts'][team_name] += 1
    player['matches'].add(match_id)
    return player


def add_match_entry(player_id, player_name, team_name, opponent_name, match_id, match_date):
    entry = match_players[(player_id, match_id)]
    entry['player_name'] = player_name
    entry['team'] = team_name
    entry['opponent'] = opponent_name
    entry['match_date'] = (match_date or '').replace('/', '-')
    return entry


def apply_supplemental_matches():
    for match in SUPPLEMENTAL_MATCHES.get((args.type, args.year), []):
        match_id = match['match_id']
        match_date = match['date']
        for team_name, innings in match['batting'].items():
            opponent_name = next((team for team in match['teams'] if team != team_name), 'Opposition')
            for batter in innings:
                player_id = canonical_player_id(batter['name'], batter['name'])
                stats = add_match_player(player_id, batter['name'], team_name, match_id)
                match_entry = add_match_entry(player_id, batter['name'], team_name, opponent_name, match_id, match_date)
                innings_key = f"{match_id}:{team_name}:{player_id}"
                stats['innings'].add(innings_key)
                stats['runs'] += batter['runs']
                stats['balls_faced'] += batter['balls']
                match_entry['runs'] += batter['runs']
                match_entry['balls_faced'] += batter['balls']
                innings_runs[(player_id, f"{match_id}:{team_name}")] += batter['runs']
                if batter['dismissed']:
                    stats['dismissals'] += 1
                    match_entry['dismissed'] = True

        for team_name, spell_list in match['bowling'].items():
            opponent_name = next((team for team in match['teams'] if team != team_name), 'Opposition')
            for spell in spell_list:
                player_id = canonical_player_id(spell['name'], spell['name'])
                stats = add_match_player(player_id, spell['name'], team_name, match_id)
                match_entry = add_match_entry(player_id, spell['name'], team_name, opponent_name, match_id, match_date)
                stats['runs_conceded'] += spell['runs_conceded']
                stats['balls_bowled'] += spell['overs'] * 6 + spell['balls']
                stats['wickets'] += spell['wickets']
                match_entry['runs_conceded'] += spell['runs_conceded']
                match_entry['balls_bowled'] += spell['overs'] * 6 + spell['balls']
                match_entry['wickets'] += spell['wickets']

players = defaultdict(lambda: {
    'player_name': '',
    'team_counts': defaultdict(int),
    'matches': set(),
    'innings': set(),
    'runs': 0,
    'balls_faced': 0,
    'dismissals': 0,
    'wickets': 0,
    'runs_conceded': 0,
    'balls_bowled': 0,
})
match_players = defaultdict(lambda: {
    'player_name': '',
    'team': 'Unknown',
    'opponent': 'Opposition',
    'match_date': '',
    'runs': 0,
    'balls_faced': 0,
    'dismissed': False,
    'wickets': 0,
    'runs_conceded': 0,
    'balls_bowled': 0,
})
innings_runs = defaultdict(int)
player_ids_by_name = {}

for name, reader in open_match_streams():
    registry = {}
    player_rows = []
    teams = []
    ball_rows = []
    match_year = None
    match_date = ''
    match_type = ''

    for row in reader:
        if not row:
            continue
        row_type = clean(row[0])
        if row_type == 'info':
            info_type = clean(row[1]) if len(row) > 1 else ''
            if info_type == 'team' and len(row) > 2:
                teams.append(clean(row[2]))
            elif info_type == 'date' and len(row) > 2 and not match_year:
                match_date = clean(row[2])
                match_year = match_date[:4]
            elif info_type == 'match_type' and len(row) > 2:
                match_type = clean(row[2]).upper()
            elif info_type == 'player' and len(row) > 3:
                player_rows.append((clean(row[2]), clean(row[3])))
            elif info_type == 'registry' and len(row) > 4 and clean(row[2]) == 'people':
                registry[clean(row[3])] = clean(row[4])
        elif row_type == 'ball':
            if match_year and not is_target_match(match_year, match_type):
                break
            ball_rows.append(row)

    if not is_target_match(match_year, match_type):
        del registry, player_rows, teams, ball_rows
        gc.collect()
        continue

    match_id = name.rsplit('.', 1)[0]
    team_by_player = {}

    for team_name, player_name in player_rows:
        if not player_name:
            continue
        player_id = registry.get(player_name) or player_key(player_name, player_name)
        player_ids_by_name[player_key(player_name, player_name)] = player_id
        team_name = team_name or 'Unknown'
        team_by_player[player_id] = team_name
        player = players[player_id]
        player['player_name'] = player_name
        player['team_counts'][team_name] += 1
        player['matches'].add(match_id)

    for row in ball_rows:
        innings_id = clean(row[1]) if len(row) > 1 else '1'
        batting_team = clean(row[3]) if len(row) > 3 else 'Unknown'
        striker = clean(row[4]) if len(row) > 4 else ''
        non_striker = clean(row[5]) if len(row) > 5 else ''
        bowler = clean(row[6]) if len(row) > 6 else ''
        runs_off_bat = to_int(clean(row[7]) if len(row) > 7 else 0)
        wides = to_int(clean(row[9]) if len(row) > 9 else 0)
        noballs = to_int(clean(row[10]) if len(row) > 10 else 0)
        player_dismissed = clean(row[15]) if len(row) > 15 else ''
        wicket_type = clean(row[14]).lower() if len(row) > 14 else ''

        batting_team = batting_team or 'Unknown'
        bowling_team = 'Opposition'
        if len(teams) >= 2 and batting_team in teams:
            bowling_team = teams[1] if teams[0] == batting_team else teams[0]

        for batter_name in [striker, non_striker]:
            if not batter_name:
                continue
            batter_id = registry.get(batter_name) or player_key(batter_name, batter_name)
            player_ids_by_name[player_key(batter_name, batter_name)] = batter_id
            batter = players[batter_id]
            batter['player_name'] = batter_name
            batter['team_counts'][batting_team] += 1
            batter['matches'].add(match_id)

        if bowler:
            bowler_id = registry.get(bowler) or player_key(bowler, bowler)
            player_ids_by_name[player_key(bowler, bowler)] = bowler_id
            bowler_stats = players[bowler_id]
            bowler_stats['player_name'] = bowler
            bowler_stats['team_counts'][team_by_player.get(bowler_id) or bowling_team] += 1
            bowler_stats['matches'].add(match_id)

        if striker:
            striker_id = registry.get(striker) or player_key(striker, striker)
            player_ids_by_name[player_key(striker, striker)] = striker_id
            batter = players[striker_id]
            batter_entry = add_match_entry(striker_id, striker, batting_team, bowling_team, match_id, match_date)
            batter['innings'].add(f"{match_id}:{innings_id}:{striker_id}")
            batter['runs'] += runs_off_bat
            batter_entry['runs'] += runs_off_bat
            if wides == 0:
                batter['balls_faced'] += 1
                batter_entry['balls_faced'] += 1
            innings_runs[(striker_id, f"{match_id}:{innings_id}")] += runs_off_bat

        if bowler:
            bowler_id = registry.get(bowler) or player_key(bowler, bowler)
            player_ids_by_name[player_key(bowler, bowler)] = bowler_id
            bowler_stats = players[bowler_id]
            bowler_entry = add_match_entry(bowler_id, bowler, team_by_player.get(bowler_id) or bowling_team, batting_team, match_id, match_date)
            bowler_stats['runs_conceded'] += runs_off_bat + wides + noballs
            bowler_entry['runs_conceded'] += runs_off_bat + wides + noballs
            if wides == 0 and noballs == 0:
                bowler_stats['balls_bowled'] += 1
                bowler_entry['balls_bowled'] += 1
            if player_dismissed and wicket_type not in BOWLER_UNCREDITED:
                bowler_stats['wickets'] += 1
                bowler_entry['wickets'] += 1

        if player_dismissed:
            dismissed_id = registry.get(player_dismissed) or player_key(player_dismissed, player_dismissed)
            player_ids_by_name[player_key(player_dismissed, player_dismissed)] = dismissed_id
            dismissed = players[dismissed_id]
            dismissed['player_name'] = player_dismissed
            dismissed_entry = add_match_entry(dismissed_id, player_dismissed, team_by_player.get(dismissed_id) or batting_team, bowling_team, match_id, match_date)
            if wicket_type not in BATTER_NOT_OUT:
                dismissed['dismissals'] += 1
                dismissed_entry['dismissed'] = True

    gc.collect()

apply_supplemental_matches()

with open(args.output, 'w', newline='') as fh:
    writer = csv.DictWriter(fh, fieldnames=[
        'player_id', 'player_name', 'team', 'format', 'matches', 'innings', 'runs',
        'average', 'strike_rate', 'fifties', 'hundreds', 'wickets', 'economy', 'bowl_avg',
    ])
    writer.writeheader()
    for player_id, stats in players.items():
        if not stats['player_name']:
            continue
        innings_count = len(stats['innings'])
        match_count = len(stats['matches'])
        dismissals = stats['dismissals']
        batting_average = round(stats['runs'] / dismissals, 2) if dismissals else float(stats['runs'])
        strike_rate = round((stats['runs'] / stats['balls_faced']) * 100, 2) if stats['balls_faced'] else 0
        overs = stats['balls_bowled'] / 6 if stats['balls_bowled'] else 0
        economy = round(stats['runs_conceded'] / overs, 2) if overs else 0
        bowl_avg = round(stats['runs_conceded'] / stats['wickets'], 2) if stats['wickets'] else 0
        innings_totals = [runs for (pid, _), runs in innings_runs.items() if pid == player_id]
        team = max(stats['team_counts'].items(), key=lambda item: item[1])[0] if stats['team_counts'] else 'Unknown'
        writer.writerow({
            'player_id': player_id,
            'player_name': stats['player_name'],
            'team': team,
            'format': FORMAT_LABEL[args.type],
            'matches': match_count,
            'innings': innings_count,
            'runs': stats['runs'],
            'average': batting_average,
            'strike_rate': strike_rate,
            'fifties': sum(1 for value in innings_totals if 50 <= value < 100),
            'hundreds': sum(1 for value in innings_totals if value >= 100),
            'wickets': stats['wickets'],
            'economy': economy,
            'bowl_avg': bowl_avg,
        })

print(f"[cricket] wrote {args.output}")

if args.match_output:
    with open(args.match_output, 'w', newline='') as fh:
        writer = csv.DictWriter(fh, fieldnames=[
            'player_id', 'player_name', 'team', 'opponent', 'format', 'match_id', 'match_date',
            'runs', 'balls_faced', 'dismissed', 'wickets', 'runs_conceded', 'balls_bowled', 'economy',
        ])
        writer.writeheader()
        for (player_id, match_id), stats in sorted(match_players.items(), key=lambda item: (item[1]['match_date'], item[0][1], item[1]['player_name'])):
            if not stats['player_name']:
                continue
            overs = stats['balls_bowled'] / 6 if stats['balls_bowled'] else 0
            economy = round(stats['runs_conceded'] / overs, 2) if overs else 0
            writer.writerow({
                'player_id': player_id,
                'player_name': stats['player_name'],
                'team': stats['team'],
                'opponent': stats['opponent'],
                'format': FORMAT_LABEL[args.type],
                'match_id': match_id,
                'match_date': stats['match_date'],
                'runs': stats['runs'],
                'balls_faced': stats['balls_faced'],
                'dismissed': 'true' if stats['dismissed'] else 'false',
                'wickets': stats['wickets'],
                'runs_conceded': stats['runs_conceded'],
                'balls_bowled': stats['balls_bowled'],
                'economy': economy,
            })

    print(f"[cricket] wrote {args.match_output}")
