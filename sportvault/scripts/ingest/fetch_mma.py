#!/usr/bin/env python3
import argparse
import concurrent.futures
import csv
import re
import string
import time
import urllib.request
from html import unescape
from threading import Lock

parser = argparse.ArgumentParser()
parser.add_argument('--year', type=int, required=True)
parser.add_argument('--output', type=str, required=True)
args = parser.parse_args()

BASE = 'http://www.ufcstats.com'
HEADERS = {'User-Agent': 'Mozilla/5.0'}
MAX_WORKERS = 4
KNOWN_WEIGHT_CLASSES = [
    "Women's Strawweight",
    "Women's Flyweight",
    "Women's Bantamweight",
    "Women's Featherweight",
    'Flyweight',
    'Bantamweight',
    'Featherweight',
    'Lightweight',
    'Welterweight',
    'Middleweight',
    'Light Heavyweight',
    'Heavyweight',
    'Catch Weight',
    'Open Weight',
]
PLAYER_NAME_ALIASES = {
    'Mansur Abdul-Malik': 'Mansur Abdul Malik',
}


def fetch(url, timeout=20, retries=3):
    req = urllib.request.Request(url, headers=HEADERS)
    last_error = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read().decode('utf-8', errors='ignore')
        except Exception as exc:
            last_error = exc
            if attempt < retries - 1:
                time.sleep(1 + attempt)
    raise last_error


def clean(text):
    return re.sub(r'\s+', ' ', unescape(text or '')).strip()


def extract_first(pattern, text, default=''):
    match = re.search(pattern, text, re.I | re.S)
    return clean(match.group(1)) if match else default


def extract_metric(label, text):
    pattern = rf'{re.escape(label)}\s*</i>\s*([\d\.]+%?)'
    value = extract_first(pattern, text, '')
    return value.replace('%', '') if value else ''


def extract_fight_rows(text):
    return re.findall(
        r'<tr class="b-fight-details__table-row[^"]*js-fight-details-click[^"]*"[\s\S]*?</tr>',
        text,
        re.I,
    )


def extract_fight_url(row_html):
    return extract_first(r"doNav\('(http://www\.ufcstats\.com/fight-details/[^']+)'\)", row_html, '')


def normalize_weight_class(raw_value):
    value = clean(raw_value)
    if not value:
        return 'Open Weight'

    lower = value.lower()
    for token in [' interim title bout', ' title bout', ' tournament bout', ' bout']:
        lower = lower.replace(token, '')
    lower = lower.replace('ufc ', '')
    lower = lower.replace('catchweight', 'catch weight')
    lower = clean(lower)

    for weight_class in KNOWN_WEIGHT_CLASSES:
        if weight_class.lower() == lower or weight_class.lower() in lower:
            return weight_class

    return ' '.join(part.capitalize() for part in lower.split()) or 'Open Weight'


fighter_urls = []
for ch in string.ascii_lowercase:
    url = f'{BASE}/statistics/fighters?char={ch}&page=all'
    html = fetch(url)
    fighter_urls.extend(re.findall(r'href="(http://www\.ufcstats\.com/fighter-details/[^"]+)"', html))

fighter_urls = list(dict.fromkeys(fighter_urls))
rows_out = []
fight_detail_cache = {}
fight_detail_lock = Lock()


def parse_fighter(fighter_url):
    try:
        html = fetch(fighter_url)
    except Exception as exc:
        print(f'[mma] skipped {fighter_url}: {exc}', flush=True)
        return None

    name = extract_first(r'b-content__title-highlight[^>]*>([^<]+)<', html, '')
    if not name:
        return None

    name = PLAYER_NAME_ALIASES.get(name, name)
    fighter_id = fighter_url.rstrip('/').split('/')[-1]
    nationality = ''
    slpm = extract_metric('SLpM:', html)
    str_acc = extract_metric('Str. Acc.:', html)
    td_avg = extract_metric('TD Avg.:', html)
    td_acc = extract_metric('TD Acc.:', html)
    sub_avg = extract_metric('Sub. Avg.:', html)

    yearly_fights = []
    for row_html in extract_fight_rows(html):
        date_match = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s+\d{1,2},\s+(\d{4})', row_html)
        if not date_match or date_match.group(2) != str(args.year):
            continue

        fight_url = extract_fight_url(row_html)
        if not fight_url:
            continue

        result = extract_first(r'b-flag__text">([^<]+)<', row_html, '').lower()
        yearly_fights.append({
            'fight_url': fight_url,
            'result': result,
        })

    if not yearly_fights:
        return None

    return {
        'player_id': fighter_id,
        'player_name': name,
        'nationality': nationality,
        'sig_strikes_per_min': slpm or 0,
        'sig_strike_acc': str_acc or 0,
        'takedown_avg': td_avg or 0,
        'takedown_acc': td_acc or 0,
        'sub_avg': sub_avg or 0,
        'fights': yearly_fights,
    }


def parse_fight_detail(fight_url):
    with fight_detail_lock:
        cached = fight_detail_cache.get(fight_url)
    if cached:
        return cached

    html = fetch(fight_url)
    payload = {
        'weight_class': normalize_weight_class(
            extract_first(r'b-fight-details__fight-title[^>]*>([\s\S]*?)</i>', html, 'Open Weight')
        ),
    }
    with fight_detail_lock:
        fight_detail_cache[fight_url] = payload
    return payload


fighter_rows = []
with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
    futures = [executor.submit(parse_fighter, fighter_url) for fighter_url in fighter_urls]
    total = len(futures)
    for idx, future in enumerate(concurrent.futures.as_completed(futures), start=1):
        row = future.result()
        if row:
            fighter_rows.append(row)
        if idx % 100 == 0 or idx == total:
            print(f'[mma] processed {idx}/{total} fighters', flush=True)

fight_urls = sorted({
    fight['fight_url']
    for fighter in fighter_rows
    for fight in fighter['fights']
})

with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
    futures = [executor.submit(parse_fight_detail, fight_url) for fight_url in fight_urls]
    total = len(futures)
    for idx, future in enumerate(concurrent.futures.as_completed(futures), start=1):
        future.result()
        if idx % 100 == 0 or idx == total:
            print(f'[mma] processed {idx}/{total} fight details', flush=True)

for fighter in fighter_rows:
    grouped = {}
    for fight in fighter['fights']:
        weight_class = (fight_detail_cache.get(fight['fight_url']) or {}).get('weight_class', 'Open Weight')
        stats = grouped.setdefault(weight_class, {
            'player_id': fighter['player_id'],
            'player_name': fighter['player_name'],
            'nationality': fighter['nationality'],
            'weight_class': weight_class,
            'fights': 0,
            'wins': 0,
            'losses': 0,
            'sig_strikes_per_min': fighter['sig_strikes_per_min'],
            'sig_strike_acc': fighter['sig_strike_acc'],
            'takedown_avg': fighter['takedown_avg'],
            'takedown_acc': fighter['takedown_acc'],
            'sub_avg': fighter['sub_avg'],
        })
        stats['fights'] += 1
        if fight['result'].startswith('win'):
            stats['wins'] += 1
        elif fight['result'].startswith('loss'):
            stats['losses'] += 1

    rows_out.extend(grouped.values())

rows_out.sort(key=lambda row: (row['weight_class'], row['player_name']))

with open(args.output, 'w', newline='') as fh:
    writer = csv.DictWriter(fh, fieldnames=[
        'player_id', 'player_name', 'nationality', 'weight_class', 'fights', 'wins', 'losses',
        'sig_strikes_per_min', 'sig_strike_acc', 'takedown_avg', 'takedown_acc', 'sub_avg',
    ])
    writer.writeheader()
    for row in rows_out:
        writer.writerow(row)

print(f'[mma] wrote {args.output}')
