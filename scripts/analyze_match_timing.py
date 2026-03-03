"""
Analyse timing matchs vs activité — Dark pattern detection
Croise les timestamps de matchs avec les sessions de swipe.
"""

import json
import sys
import os
from datetime import datetime, timedelta
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ============================================================
# TINDER — App opens vs Matches vs Likes per day
# ============================================================

print("=" * 70)
print("  TINDER — CORRÉLATION ACTIVITÉ vs MATCHS")
print("=" * 70)

with open(os.path.join(base, 'Personal', 'Tinder', 'data.json'), 'r', encoding='utf-8') as f:
    tinder = json.load(f)

usage = tinder.get('Usage', {})

# Extract daily data
app_opens = usage.get('app_opens', {})
swipes_likes = usage.get('swipes_likes', {})
swipes_passes = usage.get('swipes_passes', {})
matches = usage.get('matches', {})

# Normalize dates (Tinder uses YYYY-MM-DD format)
all_dates = sorted(set(list(app_opens.keys()) + list(matches.keys())))

print(f"\nPériode: {all_dates[0] if all_dates else '?'} → {all_dates[-1] if all_dates else '?'}")
print(f"Jours trackés: {len(all_dates)}")
print(f"Total opens: {sum(app_opens.values())}")
print(f"Total likes: {sum(swipes_likes.values())}")
print(f"Total passes: {sum(swipes_passes.values())}")
print(f"Total matches: {sum(matches.values())}")

# Daily correlation
print(f"\n--- JOURS AVEC MATCHS ---")
match_days = {d: v for d, v in matches.items() if v > 0}
print(f"Jours avec au moins 1 match: {len(match_days)}/{len(all_dates)}")

for date, match_count in sorted(match_days.items()):
    opens = app_opens.get(date, 0)
    likes = swipes_likes.get(date, 0)
    passes = swipes_passes.get(date, 0)

    # Check previous day activity
    prev_date = (datetime.strptime(date, '%Y-%m-%d') - timedelta(days=1)).strftime('%Y-%m-%d')
    prev_opens = app_opens.get(prev_date, 0)
    prev_likes = swipes_likes.get(prev_date, 0)

    # Check if match day had swipe activity
    had_activity = likes > 0 or passes > 0
    had_prev_activity = prev_likes > 0

    print(f"  {date}: {match_count} match(s) | opens={opens} likes={likes} passes={passes} | veille: opens={prev_opens} likes={prev_likes} | {'ACTIF' if had_activity else 'PAS DE SWIPE'}")

# Pattern: Do matches come on days with swipes or days after?
print(f"\n--- PATTERN: MATCH LE JOUR DU SWIPE vs APRÈS ---")
match_with_swipe = 0
match_without_swipe = 0
match_after_swipe = 0  # no swipe today but swipe yesterday
match_no_activity = 0

for date, match_count in match_days.items():
    likes_today = swipes_likes.get(date, 0)
    passes_today = swipes_passes.get(date, 0)

    prev_date = (datetime.strptime(date, '%Y-%m-%d') - timedelta(days=1)).strftime('%Y-%m-%d')
    likes_prev = swipes_likes.get(prev_date, 0)

    prev2_date = (datetime.strptime(date, '%Y-%m-%d') - timedelta(days=2)).strftime('%Y-%m-%d')
    likes_prev2 = swipes_likes.get(prev2_date, 0)

    if likes_today > 0:
        match_with_swipe += match_count
    elif likes_prev > 0 or likes_prev2 > 0:
        match_after_swipe += match_count
    else:
        match_no_activity += match_count

total_matches = sum(match_days.values())
print(f"  Matchs le jour d'un swipe:           {match_with_swipe} ({match_with_swipe/total_matches*100:.1f}%)")
print(f"  Matchs 1-2 jours APRÈS un swipe:     {match_after_swipe} ({match_after_swipe/total_matches*100:.1f}%)")
print(f"  Matchs sans activité récente:         {match_no_activity} ({match_no_activity/total_matches*100:.1f}%)")

# Lag analysis: average delay between swipe session and match
print(f"\n--- DÉLAI ENTRE DERNIÈRE SESSION ET MATCH ---")
lag_days = []
for date, mc in match_days.items():
    match_dt = datetime.strptime(date, '%Y-%m-%d')
    # Find the most recent swipe day before or on this date
    last_swipe = None
    for i in range(0, 8):  # Look back up to 7 days
        check = (match_dt - timedelta(days=i)).strftime('%Y-%m-%d')
        if swipes_likes.get(check, 0) > 0:
            last_swipe = i
            break
    if last_swipe is not None:
        lag_days.append(last_swipe)

if lag_days:
    print(f"  Délai moyen: {sum(lag_days)/len(lag_days):.1f} jours")
    print(f"  Délai médian: {sorted(lag_days)[len(lag_days)//2]} jours")
    lag_dist = Counter(lag_days)
    for lag, count in sorted(lag_dist.items()):
        bar = '█' * count
        print(f"    Jour+{lag}: {count} matchs {bar}")

# Correlation: does more opens/likes lead to more matches?
print(f"\n--- CORRÉLATION ACTIVITÉ → MATCHS ---")

# Group by activity level
high_activity_days = [d for d in all_dates if app_opens.get(d, 0) >= 30]
medium_activity_days = [d for d in all_dates if 10 <= app_opens.get(d, 0) < 30]
low_activity_days = [d for d in all_dates if 1 <= app_opens.get(d, 0) < 10]
zero_activity_days = [d for d in all_dates if app_opens.get(d, 0) == 0]

for name, days in [("Haute (30+ opens)", high_activity_days),
                    ("Moyenne (10-29)", medium_activity_days),
                    ("Basse (1-9)", low_activity_days),
                    ("Zéro opens", zero_activity_days)]:
    total_m = sum(matches.get(d, 0) for d in days)
    avg_m = total_m / len(days) if days else 0
    print(f"  {name:25s}: {len(days):3d} jours, {total_m:3d} matchs total, {avg_m:.2f} matchs/jour")

# Does opening the app WITHOUT swiping generate matches? (visibility check)
print(f"\n--- EST-CE QUE OUVRIR L'APP SANS SWIPER GÉNÈRE DES MATCHS ? ---")
open_no_swipe_days = [d for d in all_dates if app_opens.get(d, 0) > 0 and swipes_likes.get(d, 0) == 0 and swipes_passes.get(d, 0) == 0]
open_and_swipe_days = [d for d in all_dates if app_opens.get(d, 0) > 0 and (swipes_likes.get(d, 0) > 0 or swipes_passes.get(d, 0) > 0)]

matches_open_only = sum(matches.get(d, 0) for d in open_no_swipe_days)
matches_open_swipe = sum(matches.get(d, 0) for d in open_and_swipe_days)

print(f"  Jours avec open SANS swipe: {len(open_no_swipe_days)} jours → {matches_open_only} matchs ({matches_open_only/len(open_no_swipe_days):.3f}/jour)" if open_no_swipe_days else "  Aucun jour sans swipe")
print(f"  Jours avec open + swipe:    {len(open_and_swipe_days)} jours → {matches_open_swipe} matchs ({matches_open_swipe/len(open_and_swipe_days):.3f}/jour)" if open_and_swipe_days else "  Aucun jour avec swipe")

# Day of week analysis
print(f"\n--- MATCHS PAR JOUR DE LA SEMAINE ---")
dow_matches = defaultdict(int)
dow_opens = defaultdict(int)
dow_days_count = defaultdict(int)
dow_names = {0: 'Lundi', 1: 'Mardi', 2: 'Mercredi', 3: 'Jeudi', 4: 'Vendredi', 5: 'Samedi', 6: 'Dimanche'}

for d in all_dates:
    try:
        dt = datetime.strptime(d, '%Y-%m-%d')
        dow = dt.weekday()
        dow_matches[dow] += matches.get(d, 0)
        dow_opens[dow] += app_opens.get(d, 0)
        dow_days_count[dow] += 1
    except:
        pass

for dow in range(7):
    m = dow_matches[dow]
    o = dow_opens[dow]
    n = dow_days_count[dow]
    avg_m = m / n if n > 0 else 0
    avg_o = o / n if n > 0 else 0
    print(f"  {dow_names[dow]:12s}: {m:3d} matchs ({avg_m:.2f}/jour), {o:5d} opens ({avg_o:.1f}/jour)")

# Hour analysis from messages (first message = approximate match time for conversations)
print(f"\n--- ANALYSE TEMPORELLE DES MESSAGES TINDER ---")
messages = tinder.get('Messages', [])
first_msg_hours = []
for convo in messages:
    msgs = convo.get('messages', [])
    if msgs:
        ts_str = msgs[0].get('sent_date', '')
        for fmt in ['%a, %d %b %Y %H:%M:%S %Z', '%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ']:
            try:
                ts = datetime.strptime(ts_str.strip(), fmt)
                first_msg_hours.append(ts.hour)
                break
            except:
                continue

if first_msg_hours:
    hour_dist = Counter(first_msg_hours)
    print(f"  Heure du premier message (proxy heure match):")
    for h in range(24):
        c = hour_dist.get(h, 0)
        bar = '█' * c
        print(f"    {h:2d}h: {c:2d} {bar}")


# ============================================================
# HINGE — Match timestamp analysis
# ============================================================

print(f"\n{'='*70}")
print(f"  HINGE — ANALYSE TIMING DES MATCHS")
print(f"{'='*70}")

with open(os.path.join(base, 'Personal', 'Hinge', 'matches.json'), 'r', encoding='utf-8') as f:
    hinge = json.load(f)

# Extract match timestamps and first message timestamps
match_data = []
for entry in hinge:
    match_info = entry.get('match', [])
    chats = entry.get('chats', [])
    like_info = entry.get('like', [])

    match_ts = None
    if match_info:
        ts_str = match_info[0].get('timestamp', '')
        try:
            match_ts = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S')
        except:
            pass

    first_msg_ts = None
    if chats:
        sorted_chats = sorted(chats, key=lambda x: x.get('timestamp', ''))
        ts_str = sorted_chats[0].get('timestamp', '')
        try:
            first_msg_ts = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S')
        except:
            pass

    like_ts = None
    if like_info:
        ts_str = like_info[0].get('timestamp', '')
        try:
            like_ts = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S')
        except:
            pass

    match_data.append({
        'match_ts': match_ts,
        'first_msg_ts': first_msg_ts,
        'like_ts': like_ts,
        'has_chat': len(chats) > 0,
        'chat_count': len(chats)
    })

# Match hour distribution
print(f"\nTotal entrées: {len(match_data)}")
matches_with_ts = [m for m in match_data if m['match_ts']]
matches_with_like = [m for m in match_data if m['like_ts']]
matches_with_both = [m for m in match_data if m['match_ts'] and m['like_ts']]

print(f"Matchs avec timestamp: {len(matches_with_ts)}")
print(f"Likes avec timestamp: {len(matches_with_like)}")
print(f"Avec les deux: {len(matches_with_both)}")

if matches_with_ts:
    print(f"\n--- HEURE DES MATCHS ---")
    match_hours = Counter(m['match_ts'].hour for m in matches_with_ts)
    for h in range(24):
        c = match_hours.get(h, 0)
        bar = '█' * c
        print(f"  {h:2d}h: {c:3d} {bar}")

    print(f"\n--- JOUR DES MATCHS ---")
    match_dows = Counter(m['match_ts'].strftime('%A') for m in matches_with_ts)
    for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
        c = match_dows.get(day, 0)
        bar = '█' * c
        print(f"  {day:12s}: {c:3d} {bar}")

# Like → Match delay
if matches_with_both:
    print(f"\n--- DÉLAI LIKE → MATCH ---")
    delays = []
    for m in matches_with_both:
        delay = (m['match_ts'] - m['like_ts']).total_seconds() / 3600  # hours
        delays.append(delay)

    # Some might be negative (she liked first, then you liked = instant match)
    instant = [d for d in delays if abs(d) < 1]
    same_day = [d for d in delays if 1 <= abs(d) < 24]
    next_day = [d for d in delays if 24 <= abs(d) < 72]
    later = [d for d in delays if abs(d) >= 72]
    negative = [d for d in delays if d < -1]  # match before like = she liked first

    print(f"  Instantané (<1h): {len(instant)} ({len(instant)/len(delays)*100:.1f}%) — tu likes, elle a déjà liké = match")
    print(f"  Même jour (1-24h): {len(same_day)} ({len(same_day)/len(delays)*100:.1f}%)")
    print(f"  J+1 à J+3: {len(next_day)} ({len(next_day)/len(delays)*100:.1f}%)")
    print(f"  Plus de 3 jours: {len(later)} ({len(later)/len(delays)*100:.1f}%)")
    print(f"  Match AVANT like (elle t'a liké d'abord): {len(negative)} ({len(negative)/len(delays)*100:.1f}%)")

    if delays:
        print(f"\n  Délai moyen: {sum(abs(d) for d in delays)/len(delays):.1f}h")
        print(f"  Délai médian: {sorted(abs(d) for d in delays)[len(delays)//2]:.1f}h")

# Match → First message delay
print(f"\n--- DÉLAI MATCH → PREMIER MESSAGE ---")
msg_delays = []
for m in match_data:
    if m['match_ts'] and m['first_msg_ts']:
        delay = (m['first_msg_ts'] - m['match_ts']).total_seconds() / 3600
        msg_delays.append(delay)

if msg_delays:
    instant = [d for d in msg_delays if abs(d) < 1]
    same_day = [d for d in msg_delays if 1 <= d < 24]
    next_day = [d for d in msg_delays if 24 <= d < 72]
    later = [d for d in msg_delays if d >= 72]

    print(f"  Message dans l'heure: {len(instant)} ({len(instant)/len(msg_delays)*100:.1f}%)")
    print(f"  Message même jour: {len(same_day)} ({len(same_day)/len(msg_delays)*100:.1f}%)")
    print(f"  Message J+1 à J+3: {len(next_day)} ({len(next_day)/len(msg_delays)*100:.1f}%)")
    print(f"  Message après 3+ jours: {len(later)} ({len(later)/len(msg_delays)*100:.1f}%)")

# Entries with no match but with like (you liked, no match = one-sided)
no_match = [m for m in match_data if not m['match_ts'] and m['like_ts']]
with_match = [m for m in match_data if m['match_ts']]
print(f"\n--- RATIO LIKE → MATCH (Hinge) ---")
total_entries = len(match_data)
print(f"  Entrées totales dans matches.json: {total_entries}")
print(f"  Avec match timestamp: {len(with_match)}")
print(f"  Sans match (like sans retour ou expiré?): {len(no_match)}")


# ============================================================
# TINDER — Temporal pattern: activity bursts vs matches
# ============================================================

print(f"\n{'='*70}")
print(f"  TINDER — PATTERN BURST D'ACTIVITÉ → MATCHS")
print(f"{'='*70}")

# Find "burst" days (high activity) and track matches in following days
burst_days = [(d, app_opens[d]) for d in sorted(app_opens.keys()) if app_opens[d] >= 40]
print(f"\nJours de burst (40+ opens): {len(burst_days)}")

for date, opens in burst_days[:20]:
    likes = swipes_likes.get(date, 0)
    passes = swipes_passes.get(date, 0)
    m_today = matches.get(date, 0)

    # Next 3 days matches
    m_next = []
    for i in range(1, 4):
        nd = (datetime.strptime(date, '%Y-%m-%d') + timedelta(days=i)).strftime('%Y-%m-%d')
        m_next.append(matches.get(nd, 0))

    print(f"  {date}: {opens} opens, {likes}L/{passes}P → matchs: J0={m_today} J+1={m_next[0]} J+2={m_next[1]} J+3={m_next[2]}")

# Absence → return pattern (did they give matches to lure back?)
print(f"\n--- PATTERN ABSENCE → RETOUR ---")
sorted_dates = sorted(app_opens.keys())
for i in range(1, len(sorted_dates)):
    curr = sorted_dates[i]
    prev = sorted_dates[i-1]

    gap = (datetime.strptime(curr, '%Y-%m-%d') - datetime.strptime(prev, '%Y-%m-%d')).days

    if gap >= 3:  # At least 3 days absent
        m_return = matches.get(curr, 0)
        opens_return = app_opens.get(curr, 0)
        likes_return = swipes_likes.get(curr, 0)

        # Check matches 1 day before return (while absent)
        day_before = (datetime.strptime(curr, '%Y-%m-%d') - timedelta(days=1)).strftime('%Y-%m-%d')
        m_before = matches.get(day_before, 0)

        print(f"  Absent {gap}j ({prev} → {curr}): retour={opens_return} opens, {likes_return} likes → {m_return} matchs (veille absence: {m_before} matchs)")


# ============================================================
# SYNTHESIS: The engagement loop
# ============================================================

print(f"\n{'='*70}")
print(f"  SYNTHÈSE — MÉCANISMES DE RÉTENTION DÉTECTÉS")
print(f"{'='*70}")

# 1. Match timing vs swipe timing
total_m = sum(matches.values())
m_swipe_day = match_with_swipe
m_delayed = match_after_swipe
m_passive = match_no_activity

print(f"""
QUESTION 1: Est-ce que les matchs arrivent PENDANT le swipe ?
  Matchs le jour d'un swipe:    {m_swipe_day}/{total_m} ({m_swipe_day/total_m*100:.1f}%)
  Matchs 1-2j APRÈS swipe:      {m_delayed}/{total_m} ({m_delayed/total_m*100:.1f}%)
  Matchs sans activité récente:  {m_passive}/{total_m} ({m_passive/total_m*100:.1f}%)
""")

# 2. Does opening without swiping generate matches?
print(f"""QUESTION 2: Ouvrir l'app SANS swiper génère-t-il des matchs ?
  Open sans swipe: {len(open_no_swipe_days)} jours → {matches_open_only} matchs
  Open + swipe:    {len(open_and_swipe_days)} jours → {matches_open_swipe} matchs
""")

# 3. Activity level correlation
print(f"""QUESTION 3: Plus d'activité = plus de matchs ?
  Haute activité (30+ opens): {sum(matches.get(d, 0) for d in high_activity_days)} matchs / {len(high_activity_days)} jours = {sum(matches.get(d, 0) for d in high_activity_days)/len(high_activity_days):.3f}/jour
  Moyenne (10-29 opens):      {sum(matches.get(d, 0) for d in medium_activity_days)} matchs / {len(medium_activity_days)} jours = {sum(matches.get(d, 0) for d in medium_activity_days)/len(medium_activity_days):.3f}/jour
  Basse (1-9 opens):          {sum(matches.get(d, 0) for d in low_activity_days)} matchs / {len(low_activity_days)} jours = {sum(matches.get(d, 0) for d in low_activity_days)/len(low_activity_days):.3f}/jour
""" if high_activity_days and medium_activity_days and low_activity_days else "Données insuffisantes")
