"""
Hinge — Analyse complete V2
Fix: handles millisecond timestamps (2025-11-27 20:37:05.196)
Full dataset: 2325 likes, 38 matches, 251 days
"""

import json
import sys
import os
from datetime import datetime, timedelta
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(base, 'Personal', 'Hinge', 'matches.json'), 'r', encoding='utf-8') as f:
    data = json.load(f)

def parse_ts(ts_str):
    """Parse timestamp with or without milliseconds."""
    if not ts_str:
        return None
    # Strip milliseconds if present
    clean = ts_str.split('.')[0] if '.' in ts_str else ts_str
    for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%SZ']:
        try:
            return datetime.strptime(clean, fmt)
        except:
            continue
    return None

# Parse all entries
entries = []
parse_failures = 0
for entry in data:
    match_info = entry.get('match', [])
    chats = entry.get('chats', [])
    like_info = entry.get('like', [])
    block_info = entry.get('block', [])

    match_ts = parse_ts(match_info[0].get('timestamp', '')) if match_info else None
    like_ts = parse_ts(like_info[0].get('timestamp', '')) if like_info else None

    first_msg_ts = None
    if chats:
        sorted_chats = sorted(chats, key=lambda x: x.get('timestamp', ''))
        first_msg_ts = parse_ts(sorted_chats[0].get('timestamp', ''))

    if like_info and like_info[0].get('timestamp') and not like_ts:
        parse_failures += 1

    entries.append({
        'match_ts': match_ts,
        'like_ts': like_ts,
        'first_msg_ts': first_msg_ts,
        'chat_count': len(chats),
        'has_match': match_ts is not None,
        'has_block': len(block_info) > 0,
    })

likes = [e for e in entries if e['like_ts']]
matches = [e for e in entries if e['match_ts']]
both = [e for e in entries if e['match_ts'] and e['like_ts']]
matches_no_like = [e for e in entries if e['match_ts'] and not e['like_ts']]
blocks = [e for e in entries if e['has_block']]

print('=' * 70)
print('  HINGE — ANALYSE V2 (DATASET COMPLET)')
print('=' * 70)

print(f"\nParse failures: {parse_failures} (should be 0)")
print(f"Total entries: {len(entries)}")
print(f"Total likes parsed: {len(likes)}")
print(f"Total matches: {len(matches)}")
print(f"  dont tu as like en premier: {len(both)}")
print(f"  dont ELLE a like en premier: {len(matches_no_like)}")
print(f"Total blocks: {len(blocks)}")

like_dates = sorted([e['like_ts'] for e in likes])
match_dates = sorted([e['match_ts'] for e in matches])
total_days = (like_dates[-1] - like_dates[0]).days + 1

print(f"\nPeriode: {like_dates[0].date()} -> {like_dates[-1].date()} ({total_days} jours)")
print(f"Conversion globale: {len(matches)/len(likes)*100:.2f}%")
print(f"Likes/jour: {len(likes)/total_days:.1f}")
print(f"Matchs/jour: {len(matches)/total_days:.3f}")

# ============================================================
# 1. ACTIVITE QUOTIDIENNE + CORRELATION
# ============================================================
daily_likes = defaultdict(int)
daily_matches = defaultdict(int)

for e in likes:
    daily_likes[e['like_ts'].strftime('%Y-%m-%d')] += 1
for e in matches:
    daily_matches[e['match_ts'].strftime('%Y-%m-%d')] += 1

start = like_dates[0].date()
end = like_dates[-1].date()
all_days = []
current = start
while current <= end:
    all_days.append(current.strftime('%Y-%m-%d'))
    current += timedelta(days=1)

days_with_likes = [d for d in all_days if daily_likes.get(d, 0) > 0]
days_without_likes = [d for d in all_days if daily_likes.get(d, 0) == 0]

print(f"\n--- ACTIVITE ---")
print(f"Jours actifs: {len(days_with_likes)}/{len(all_days)} ({len(days_with_likes)/len(all_days)*100:.0f}%)")
print(f"Jours inactifs: {len(days_without_likes)}/{len(all_days)}")

# ============================================================
# 2. MATCH TIMING vs LIKE ACTIVITY
# ============================================================
print(f"\n--- MATCH LE JOUR D'UN LIKE vs APRES ---")

match_same_day = 0
match_j1 = 0
match_j2_3 = 0
match_no_recent = 0
match_no_recent_details = []

for e in matches:
    match_date = e['match_ts'].strftime('%Y-%m-%d')
    likes_today = daily_likes.get(match_date, 0)
    likes_prev = [daily_likes.get((e['match_ts'] - timedelta(days=i)).strftime('%Y-%m-%d'), 0) for i in range(1, 4)]

    if likes_today > 0:
        match_same_day += 1
    elif likes_prev[0] > 0:
        match_j1 += 1
    elif likes_prev[1] > 0 or likes_prev[2] > 0:
        match_j2_3 += 1
    else:
        match_no_recent += 1
        # Find last like day
        last_like_gap = None
        for i in range(1, 60):
            check = (e['match_ts'] - timedelta(days=i)).strftime('%Y-%m-%d')
            if daily_likes.get(check, 0) > 0:
                last_like_gap = i
                break
        match_no_recent_details.append((e['match_ts'], last_like_gap, e['chat_count']))

total_m = len(matches)
print(f"  Jour meme d'un like:     {match_same_day}/{total_m} ({match_same_day/total_m*100:.1f}%)")
print(f"  J+1:                     {match_j1}/{total_m} ({match_j1/total_m*100:.1f}%)")
print(f"  J+2-3:                   {match_j2_3}/{total_m} ({match_j2_3/total_m*100:.1f}%)")
print(f"  Sans like recent (4j+):  {match_no_recent}/{total_m} ({match_no_recent/total_m*100:.1f}%)")

if match_no_recent_details:
    print(f"\n  Detail matchs sans like recent:")
    for mt, gap, chats in match_no_recent_details:
        print(f"    {mt} — dernier like {gap}j avant, {chats} msgs")

# ============================================================
# 3. MATCHS SUR JOURS INACTIFS
# ============================================================
print(f"\n--- MATCHS JOURS INACTIFS ---")
matches_active = sum(daily_matches.get(d, 0) for d in days_with_likes)
matches_inactive = sum(daily_matches.get(d, 0) for d in days_without_likes)
print(f"  Jours AVEC likes: {matches_active}/{total_m} ({matches_active/total_m*100:.1f}%)")
print(f"  Jours SANS likes: {matches_inactive}/{total_m} ({matches_inactive/total_m*100:.1f}%)")

if matches_inactive > 0:
    for d in days_without_likes:
        m = daily_matches.get(d, 0)
        if m > 0:
            prev = None
            for i in range(1, 30):
                check = (datetime.strptime(d, '%Y-%m-%d') - timedelta(days=i)).strftime('%Y-%m-%d')
                if daily_likes.get(check, 0) > 0:
                    prev = (check, i)
                    break
            pl = f"dernier like: {prev[0]} ({prev[1]}j avant)" if prev else "aucun like"
            print(f"    {d}: {m} match — {pl}")

# ============================================================
# 4. CORRELATION VOLUME → MATCHS
# ============================================================
print(f"\n--- CORRELATION VOLUME LIKES -> MATCHS ---")

buckets = [
    ('Haute (15+)', [d for d in all_days if daily_likes.get(d, 0) >= 15]),
    ('Moyenne (5-14)', [d for d in all_days if 5 <= daily_likes.get(d, 0) < 15]),
    ('Basse (1-4)', [d for d in all_days if 1 <= daily_likes.get(d, 0) < 5]),
    ('Zero', [d for d in all_days if daily_likes.get(d, 0) == 0]),
]

for name, days in buckets:
    total_match = sum(daily_matches.get(d, 0) for d in days)
    total_like = sum(daily_likes.get(d, 0) for d in days)
    avg_m = total_match / len(days) if days else 0
    conv = total_match / total_like * 100 if total_like > 0 else 0
    print(f"  {name:20s}: {len(days):3d}j, {total_like:4d} likes, {total_match:2d} matchs ({avg_m:.3f}/j, conv {conv:.1f}%)")

# ============================================================
# 5. DELAI LIKE → MATCH (ALL 30 pairs)
# ============================================================
print(f"\n--- DELAI LIKE -> MATCH (N={len(both)}) ---")
delays = []
for e in both:
    delay_h = (e['match_ts'] - e['like_ts']).total_seconds() / 3600
    delays.append(delay_h)

for d in sorted(delays):
    if d < 0:
        tag = "ELLE FIRST"
    elif d < 1:
        tag = "INSTANT"
    elif d < 24:
        tag = f"meme jour ({d:.1f}h)"
    elif d < 168:
        tag = f"J+{d/24:.0f}"
    else:
        tag = f"{d/24:.0f} jours (!)"
    print(f"  {d:8.1f}h ({d/24:6.1f}j) — {tag}")

# Buckets
delay_buckets = [
    ('<1h', lambda d: d < 1),
    ('1-6h', lambda d: 1 <= d < 6),
    ('6-24h', lambda d: 6 <= d < 24),
    ('1-7j', lambda d: 24 <= d < 168),
    ('7-30j', lambda d: 168 <= d < 720),
    ('>30j', lambda d: d >= 720),
]

print(f"\n  Distribution:")
for name, fn in delay_buckets:
    c = sum(1 for d in delays if fn(d))
    pct = c / len(delays) * 100
    bar = '#' * c * 2
    print(f"    {name:10s}: {c:2d} ({pct:4.1f}%) {bar}")

print(f"\n  Mediane: {sorted(delays)[len(delays)//2]:.1f}h ({sorted(delays)[len(delays)//2]/24:.1f}j)")
print(f"  Moyenne: {sum(delays)/len(delays):.1f}h ({sum(delays)/len(delays)/24:.1f}j)")

# ============================================================
# 6. HEURES
# ============================================================
print(f"\n--- HEURE: LIKES vs MATCHS ---")
like_hours = Counter(e['like_ts'].hour for e in likes)
match_hours = Counter(e['match_ts'].hour for e in matches)

print(f"  {'H':3s} {'Likes':>6s} {'Match':>6s}  {'Conv':>6s}")
for h in range(24):
    l = like_hours.get(h, 0)
    m = match_hours.get(h, 0)
    conv = f"{m/l*100:.1f}%" if l > 10 else "N/A"
    l_bar = '#' * (l // 20)
    m_bar = '=' * m
    print(f"  {h:2d}h {l:5d} {m:5d}  {conv:>6s}  {l_bar} | {m_bar}")

# Slots
print(f"\n  Par creneau:")
slots = [
    ('Matin 6-10h', 6, 10),
    ('Midi 10-14h', 10, 14),
    ('Apres-midi 14-18h', 14, 18),
    ('Soiree 18-22h', 18, 22),
    ('Nuit 22-2h', 22, 26),  # wrap around
]
for name, start_h, end_h in slots:
    if end_h > 24:
        l = sum(like_hours.get(h % 24, 0) for h in range(start_h, end_h))
        m = sum(match_hours.get(h % 24, 0) for h in range(start_h, end_h))
    else:
        l = sum(like_hours.get(h, 0) for h in range(start_h, end_h))
        m = sum(match_hours.get(h, 0) for h in range(start_h, end_h))
    conv = m / l * 100 if l > 0 else 0
    print(f"    {name:20s}: {l:5d} likes, {m:2d} matchs, conv {conv:.1f}%")

# ============================================================
# 7. JOURS DE LA SEMAINE
# ============================================================
print(f"\n--- JOUR DE LA SEMAINE ---")
dow_names = {0: 'Lundi', 1: 'Mardi', 2: 'Mercredi', 3: 'Jeudi', 4: 'Vendredi', 5: 'Samedi', 6: 'Dimanche'}
like_dow = Counter(e['like_ts'].weekday() for e in likes)
match_dow = Counter(e['match_ts'].weekday() for e in matches)
dow_count = Counter(datetime.strptime(d, '%Y-%m-%d').weekday() for d in all_days)

for dow in range(7):
    l = like_dow.get(dow, 0)
    m = match_dow.get(dow, 0)
    n = dow_count.get(dow, 1)
    conv = m / l * 100 if l > 0 else 0
    print(f"  {dow_names[dow]:10s}: {l:4d} likes ({l/n:.1f}/j), {m:2d} matchs ({m/n:.2f}/j), conv {conv:.2f}%")

# ============================================================
# 8. CONVERSION MENSUELLE
# ============================================================
print(f"\n--- CONVERSION MENSUELLE ---")
monthly_likes = defaultdict(int)
monthly_matches = defaultdict(int)
for e in likes:
    monthly_likes[e['like_ts'].strftime('%Y-%m')] += 1
for e in matches:
    monthly_matches[e['match_ts'].strftime('%Y-%m')] += 1

for month in sorted(set(list(monthly_likes.keys()) + list(monthly_matches.keys()))):
    l = monthly_likes.get(month, 0)
    m = monthly_matches.get(month, 0)
    conv = m / l * 100 if l > 0 else 0
    bar = '=' * m * 2
    print(f"  {month}: {l:4d} likes, {m:2d} matchs ({conv:.1f}%) {bar}")

# ============================================================
# 9. ABSENCE → RETOUR (PATTERN INACTIVITE → RECOMPENSE)
# ============================================================
print(f"\n--- PATTERN INACTIVITE -> RECOMPENSE ---")

# For each match, check if there was a gap of inactivity (>24h) before
for e in matches:
    match_date = e['match_ts'].strftime('%Y-%m-%d')
    match_dt = e['match_ts']

    # Check last 7 days of activity before match
    activity = []
    for i in range(7, 0, -1):
        d = (match_dt - timedelta(days=i)).strftime('%Y-%m-%d')
        l = daily_likes.get(d, 0)
        activity.append((d, l))

    today_likes = daily_likes.get(match_date, 0)

    # Was there a gap >24h before this match?
    gap_before = 0
    for d, l in reversed(activity):
        if l == 0:
            gap_before += 1
        else:
            break

    if gap_before >= 1:
        print(f"  {match_dt.strftime('%Y-%m-%d %H:%M')} — {gap_before}j inactif avant, {today_likes} likes ce jour, {e['chat_count']} msgs")

# Count: matches after >24h inactivity
matches_post_gap = 0
matches_no_gap = 0
for e in matches:
    match_date = e['match_ts'].strftime('%Y-%m-%d')
    prev_day = (e['match_ts'] - timedelta(days=1)).strftime('%Y-%m-%d')
    if daily_likes.get(prev_day, 0) == 0:
        matches_post_gap += 1
    else:
        matches_no_gap += 1

print(f"\n  Matchs AVEC inactivite veille (0 likes J-1): {matches_post_gap}/{total_m} ({matches_post_gap/total_m*100:.1f}%)")
print(f"  Matchs SANS inactivite (likes J-1 > 0):      {matches_no_gap}/{total_m} ({matches_no_gap/total_m*100:.1f}%)")

# Broader: match after 2+ days inactive
matches_post_gap2 = 0
for e in matches:
    match_dt = e['match_ts']
    prev1 = daily_likes.get((match_dt - timedelta(days=1)).strftime('%Y-%m-%d'), 0)
    prev2 = daily_likes.get((match_dt - timedelta(days=2)).strftime('%Y-%m-%d'), 0)
    if prev1 == 0 and prev2 == 0:
        matches_post_gap2 += 1

print(f"  Matchs apres 2j+ inactifs:                   {matches_post_gap2}/{total_m} ({matches_post_gap2/total_m*100:.1f}%)")

# ============================================================
# 10. THROTTLING: PERIODES 0-MATCH
# ============================================================
print(f"\n--- PERIODES ZERO-MATCH (throttling?) ---")

# Find consecutive week blocks with 0 matches
week_start = like_dates[0].date()
weeks = []
current = week_start
while current <= end:
    week_end = current + timedelta(days=6)
    week_likes = sum(daily_likes.get((current + timedelta(days=i)).strftime('%Y-%m-%d'), 0) for i in range(7))
    week_matches = sum(daily_matches.get((current + timedelta(days=i)).strftime('%Y-%m-%d'), 0) for i in range(7))
    weeks.append((current, week_likes, week_matches))
    current += timedelta(days=7)

# Find consecutive 0-match weeks
streak = []
for w_start, w_likes, w_matches in weeks:
    if w_matches == 0 and w_likes > 0:
        streak.append((w_start, w_likes))
    else:
        if len(streak) >= 2:
            total_l = sum(s[1] for s in streak)
            print(f"  {streak[0][0]} -> {streak[-1][0]+timedelta(days=6)} ({len(streak)} sem): {total_l} likes, 0 matchs")
        streak = []

if len(streak) >= 2:
    total_l = sum(s[1] for s in streak)
    print(f"  {streak[0][0]} -> {streak[-1][0]+timedelta(days=6)} ({len(streak)} sem): {total_l} likes, 0 matchs")

# ============================================================
# 11. BLOCKS
# ============================================================
print(f"\n--- BLOCKS ---")
blocks_on_match = sum(1 for e in entries if e['has_match'] and e['has_block'])
blocks_no_match = sum(1 for e in entries if not e['has_match'] and e['has_block'])
print(f"  Total blocks: {len(blocks)}")
print(f"  Blocks sur matchs: {blocks_on_match}")
print(f"  Blocks sur non-matchs (like sans retour): {blocks_no_match}")

# We Met proxy: matches with high chat count
print(f"\n--- ENGAGEMENT DES MATCHS ---")
active = sum(1 for e in matches if e['chat_count'] >= 5)
low = sum(1 for e in matches if 1 <= e['chat_count'] < 5)
ghost = sum(1 for e in matches if e['chat_count'] == 0)
print(f"  Active (5+ msgs): {active}/{total_m} ({active/total_m*100:.0f}%)")
print(f"  Low (1-4 msgs): {low}/{total_m} ({low/total_m*100:.0f}%)")
print(f"  Ghost (0 msg): {ghost}/{total_m} ({ghost/total_m*100:.0f}%)")

# ============================================================
# 12. COMPARAISON AVEC JSX (VERIFICATION)
# ============================================================
print(f"\n{'='*70}")
print(f"  COMPARAISON MON ANALYSE vs JSX CLAUDE.AI")
print(f"{'='*70}")

print(f"""
  {'Metrique':30s} {'Mon script':>12s} {'JSX':>12s} {'Match?':>8s}
  {'Total likes':30s} {len(likes):>12d} {'2364':>12s} {'~' if abs(len(likes)-2364)<100 else 'DIFF':>8s}
  {'Total matchs':30s} {len(matches):>12d} {'38':>12s} {'OK' if len(matches)==38 else 'DIFF':>8s}
  {'Periode (jours)':30s} {total_days:>12d} {'251':>12s} {'~' if abs(total_days-251)<10 else 'DIFF':>8s}
  {'Conversion':30s} {f'{len(matches)/len(likes)*100:.2f}%':>12s} {'1.61%':>12s}
  {'She liked first':30s} {len(matches_no_like):>12d} {'N/A':>12s}
  {'Blocks':30s} {len(blocks):>12d} {'25':>12s} {'OK' if len(blocks)==25 else 'DIFF':>8s}
""")

# ============================================================
# 13. SYNTHESE FINALE
# ============================================================
print(f"{'='*70}")
print(f"  SYNTHESE V2")
print(f"{'='*70}")
print(f"""
CORRECTIONS par rapport a V1:
- Likes: 1384 -> {len(likes)} (fix timestamp millisecondes)
- Matchs: 24 -> {len(matches)} (fix timestamp millisecondes)
- Periode: 152j -> {total_days}j

RESULTATS CLES:
1. Matchs le jour d'un like: {match_same_day}/{total_m} ({match_same_day/total_m*100:.1f}%)
2. Matchs J+1: {match_j1}/{total_m} ({match_j1/total_m*100:.1f}%)
3. Matchs sans like recent: {match_no_recent}/{total_m} ({match_no_recent/total_m*100:.1f}%)
4. Matchs sur jours inactifs: {matches_inactive}/{total_m} ({matches_inactive/total_m*100:.1f}%)
5. Matchs post-gap (veille inactive): {matches_post_gap}/{total_m} ({matches_post_gap/total_m*100:.1f}%)
6. She liked first: {len(matches_no_like)}/{total_m} ({len(matches_no_like)/total_m*100:.1f}%)
""")
