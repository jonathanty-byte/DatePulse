"""
Hinge — Deep match timing analysis
Analyses: like activity correlation with matches, daily patterns,
absence/return, conversion over time, dark pattern detection.
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
    if not ts_str:
        return None
    for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%S.%fZ']:
        try:
            return datetime.strptime(ts_str.split('.')[0] if 'T' in ts_str else ts_str, fmt)
        except:
            continue
    return None

# Parse all entries
entries = []
for entry in data:
    match_info = entry.get('match', [])
    chats = entry.get('chats', [])
    like_info = entry.get('like', [])

    match_ts = parse_ts(match_info[0].get('timestamp', '')) if match_info else None
    like_ts = parse_ts(like_info[0].get('timestamp', '')) if like_info else None

    first_msg_ts = None
    if chats:
        sorted_chats = sorted(chats, key=lambda x: x.get('timestamp', ''))
        first_msg_ts = parse_ts(sorted_chats[0].get('timestamp', ''))

    entries.append({
        'match_ts': match_ts,
        'like_ts': like_ts,
        'first_msg_ts': first_msg_ts,
        'chat_count': len(chats),
        'has_match': match_ts is not None
    })

likes = [e for e in entries if e['like_ts']]
matches = [e for e in entries if e['match_ts']]
both = [e for e in entries if e['match_ts'] and e['like_ts']]
matches_no_like = [e for e in entries if e['match_ts'] and not e['like_ts']]

print('=' * 70)
print('  HINGE — ANALYSE COMPLÈTE TIMING & DARK PATTERNS')
print('=' * 70)

# ============================================================
# 1. VUE D'ENSEMBLE
# ============================================================
like_dates = sorted([e['like_ts'] for e in likes])
match_dates = sorted([e['match_ts'] for e in matches])

total_days = (like_dates[-1] - like_dates[0]).days
print(f"\n--- VUE D'ENSEMBLE ---")
print(f"Periode likes: {like_dates[0].date()} -> {like_dates[-1].date()} ({total_days} jours)")
print(f"Total likes envoyes: {len(likes)}")
print(f"Total matchs: {len(matches)}")
print(f"  dont matchs avec like de ta part: {len(both)}")
print(f"  dont matchs SANS like (= elle a like, tu as like en retour): {len(matches_no_like)}")
print(f"Taux de conversion global: {len(matches)/len(likes)*100:.1f}%")
print(f"Likes/jour moyen: {len(likes)/total_days:.1f}")
print(f"Matchs/jour moyen: {len(matches)/total_days:.2f}")

# ============================================================
# 2. ACTIVITÉ QUOTIDIENNE
# ============================================================
daily_likes = defaultdict(int)
daily_matches = defaultdict(int)

for e in likes:
    d = e['like_ts'].strftime('%Y-%m-%d')
    daily_likes[d] += 1

for e in matches:
    d = e['match_ts'].strftime('%Y-%m-%d')
    daily_matches[d] += 1

# All days in range
start = like_dates[0].date()
end = like_dates[-1].date()
all_days = []
current = start
while current <= end:
    all_days.append(current.strftime('%Y-%m-%d'))
    current += timedelta(days=1)

days_with_likes = [d for d in all_days if daily_likes.get(d, 0) > 0]
days_without_likes = [d for d in all_days if daily_likes.get(d, 0) == 0]

print(f"\n--- ACTIVITE QUOTIDIENNE ---")
print(f"Jours avec au moins 1 like: {len(days_with_likes)}/{len(all_days)} ({len(days_with_likes)/len(all_days)*100:.0f}%)")
print(f"Jours sans aucun like: {len(days_without_likes)}/{len(all_days)} ({len(days_without_likes)/len(all_days)*100:.0f}%)")

# ============================================================
# 3. QUESTION CLÉ: MATCHS LE JOUR D'UN LIKE vs APRÈS
# ============================================================
print(f"\n--- QUESTION CLE: MATCH LE JOUR D'UN LIKE vs APRES ---")

match_same_day = 0
match_j1 = 0
match_j2_3 = 0
match_no_recent = 0

for e in matches:
    match_date = e['match_ts'].strftime('%Y-%m-%d')
    likes_today = daily_likes.get(match_date, 0)

    prev_1 = (e['match_ts'] - timedelta(days=1)).strftime('%Y-%m-%d')
    likes_prev1 = daily_likes.get(prev_1, 0)

    prev_2 = (e['match_ts'] - timedelta(days=2)).strftime('%Y-%m-%d')
    likes_prev2 = daily_likes.get(prev_2, 0)

    prev_3 = (e['match_ts'] - timedelta(days=3)).strftime('%Y-%m-%d')
    likes_prev3 = daily_likes.get(prev_3, 0)

    if likes_today > 0:
        match_same_day += 1
    elif likes_prev1 > 0:
        match_j1 += 1
    elif likes_prev2 > 0 or likes_prev3 > 0:
        match_j2_3 += 1
    else:
        match_no_recent += 1

total_m = len(matches)
print(f"  Match le jour OU tu as like:      {match_same_day}/{total_m} ({match_same_day/total_m*100:.1f}%)")
print(f"  Match J+1 apres dernier like:     {match_j1}/{total_m} ({match_j1/total_m*100:.1f}%)")
print(f"  Match J+2-3 apres dernier like:   {match_j2_3}/{total_m} ({match_j2_3/total_m*100:.1f}%)")
print(f"  Match sans like recent (4+ jours): {match_no_recent}/{total_m} ({match_no_recent/total_m*100:.1f}%)")

# Detail the no-recent matches
if match_no_recent > 0:
    print(f"\n  Detail matchs sans like recent:")
    for e in matches:
        match_date = e['match_ts'].strftime('%Y-%m-%d')
        likes_window = sum(daily_likes.get((e['match_ts'] - timedelta(days=i)).strftime('%Y-%m-%d'), 0) for i in range(4))
        if likes_window == 0:
            # Find last like day
            last_like = None
            for i in range(1, 60):
                check = (e['match_ts'] - timedelta(days=i)).strftime('%Y-%m-%d')
                if daily_likes.get(check, 0) > 0:
                    last_like = (check, i)
                    break
            ll_str = f"dernier like {last_like[0]} ({last_like[1]}j avant)" if last_like else "aucun like trouve"
            print(f"    {e['match_ts']} — {ll_str}")

# ============================================================
# 4. CORRÉLATION VOLUME LIKES → MATCHS
# ============================================================
print(f"\n--- CORRELATION VOLUME LIKES -> MATCHS ---")

high_like_days = [d for d in all_days if daily_likes.get(d, 0) >= 15]
med_like_days = [d for d in all_days if 5 <= daily_likes.get(d, 0) < 15]
low_like_days = [d for d in all_days if 1 <= daily_likes.get(d, 0) < 5]
zero_like_days = [d for d in all_days if daily_likes.get(d, 0) == 0]

for name, days in [('Haute (15+ likes/j)', high_like_days),
                   ('Moyenne (5-14)', med_like_days),
                   ('Basse (1-4)', low_like_days),
                   ('Zero likes', zero_like_days)]:
    total_match = sum(daily_matches.get(d, 0) for d in days)
    total_like = sum(daily_likes.get(d, 0) for d in days)
    avg_match = total_match / len(days) if days else 0
    conv = total_match / total_like * 100 if total_like > 0 else 0
    print(f"  {name:25s}: {len(days):3d} jours, {total_like:4d} likes, {total_match:2d} matchs ({avg_match:.3f}/jour, conv {conv:.1f}%)")

# ============================================================
# 5. MATCHS JOURS INACTIFS (manipulation de visibilité?)
# ============================================================
print(f"\n--- MATCHS SUR JOURS INACTIFS (test manipulation visibilite) ---")
matches_on_active = sum(daily_matches.get(d, 0) for d in days_with_likes)
matches_on_inactive = sum(daily_matches.get(d, 0) for d in days_without_likes)
print(f"  Matchs les jours AVEC likes:  {matches_on_active}/{total_m} ({matches_on_active/total_m*100:.1f}%)")
print(f"  Matchs les jours SANS likes:  {matches_on_inactive}/{total_m} ({matches_on_inactive/total_m*100:.1f}%)")

if matches_on_inactive > 0:
    print(f"\n  Detail matchs sans activite:")
    for d in days_without_likes:
        m = daily_matches.get(d, 0)
        if m > 0:
            # Find previous like day
            prev_like = None
            for i in range(1, 30):
                check = (datetime.strptime(d, '%Y-%m-%d') - timedelta(days=i)).strftime('%Y-%m-%d')
                if daily_likes.get(check, 0) > 0:
                    prev_like = (check, i)
                    break
            pl_str = f"dernier like: {prev_like[0]} ({prev_like[1]}j avant)" if prev_like else "aucun like"
            print(f"    {d}: {m} match(s) — {pl_str}")

# ============================================================
# 6. DÉLAI LIKE → MATCH (détaillé)
# ============================================================
print(f"\n--- DELAI LIKE -> MATCH (N={len(both)}, paires avec les deux timestamps) ---")
delays_hours = []
for e in both:
    delay_h = (e['match_ts'] - e['like_ts']).total_seconds() / 3600
    delays_hours.append(delay_h)

delays_sorted = sorted(delays_hours)
for d in delays_sorted:
    if d < 0:
        tag = "ELLE A LIKE AVANT"
    elif d < 1:
        tag = "INSTANT (elle avait deja like)"
    elif d < 24:
        tag = "meme jour"
    elif d < 48:
        tag = "J+1"
    elif d < 72:
        tag = "J+2"
    elif d < 168:
        tag = f"J+{int(d/24)}"
    else:
        tag = f"{d/24:.0f} jours"
    print(f"  {d:8.1f}h ({d/24:5.1f}j) — {tag}")

buckets = [('<1h', 0), ('1-6h', 0), ('6-12h', 0), ('12-24h', 0), ('1-2j', 0), ('2-3j', 0), ('3-7j', 0), ('7j+', 0)]
for d in delays_hours:
    if d < 1:
        buckets[0] = (buckets[0][0], buckets[0][1] + 1)
    elif d < 6:
        buckets[1] = (buckets[1][0], buckets[1][1] + 1)
    elif d < 12:
        buckets[2] = (buckets[2][0], buckets[2][1] + 1)
    elif d < 24:
        buckets[3] = (buckets[3][0], buckets[3][1] + 1)
    elif d < 48:
        buckets[4] = (buckets[4][0], buckets[4][1] + 1)
    elif d < 72:
        buckets[5] = (buckets[5][0], buckets[5][1] + 1)
    elif d < 168:
        buckets[6] = (buckets[6][0], buckets[6][1] + 1)
    else:
        buckets[7] = (buckets[7][0], buckets[7][1] + 1)

print(f"\n  Distribution delai like->match:")
for name, c in buckets:
    bar = '#' * c * 2
    pct = c / len(both) * 100 if both else 0
    print(f"    {name:12s}: {c:2d} ({pct:4.1f}%) {bar}")

if delays_hours:
    print(f"\n  Mediane: {sorted(delays_hours)[len(delays_hours)//2]:.1f}h ({sorted(delays_hours)[len(delays_hours)//2]/24:.1f}j)")
    print(f"  Moyenne: {sum(delays_hours)/len(delays_hours):.1f}h ({sum(delays_hours)/len(delays_hours)/24:.1f}j)")

# ============================================================
# 7. HEURE DES LIKES vs MATCHS
# ============================================================
print(f"\n--- HEURE DES LIKES vs HEURE DES MATCHS ---")
like_hours = Counter(e['like_ts'].hour for e in likes)
match_hours = Counter(e['match_ts'].hour for e in matches)

print(f"  {'Heure':6s} {'Likes':>6s}  {'Matchs':>6s}")
for h in range(24):
    l = like_hours.get(h, 0)
    m = match_hours.get(h, 0)
    l_bar = '#' * (l // 20)
    m_bar = '=' * m
    print(f"  {h:2d}h    {l:4d}  {l_bar:30s} |  {m:2d} {m_bar}")

# ============================================================
# 8. JOUR DE LA SEMAINE
# ============================================================
print(f"\n--- JOUR DE LA SEMAINE: LIKES vs MATCHS ---")
dow_names = {0: 'Lundi', 1: 'Mardi', 2: 'Mercredi', 3: 'Jeudi', 4: 'Vendredi', 5: 'Samedi', 6: 'Dimanche'}
like_dow = Counter(e['like_ts'].weekday() for e in likes)
match_dow = Counter(e['match_ts'].weekday() for e in matches)
dow_day_count = Counter(datetime.strptime(d, '%Y-%m-%d').weekday() for d in all_days)

for dow in range(7):
    l = like_dow.get(dow, 0)
    m = match_dow.get(dow, 0)
    n = dow_day_count.get(dow, 1)
    conv = m / l * 100 if l > 0 else 0
    print(f"  {dow_names[dow]:10s}: {l:4d} likes ({l/n:.1f}/j), {m:2d} matchs ({m/n:.2f}/j), conv {conv:.2f}%")

# ============================================================
# 9. TAUX DE CONVERSION MENSUEL
# ============================================================
print(f"\n--- TAUX DE CONVERSION MENSUEL ---")
monthly_likes = defaultdict(int)
monthly_matches = defaultdict(int)

for e in likes:
    m = e['like_ts'].strftime('%Y-%m')
    monthly_likes[m] += 1

for e in matches:
    m = e['match_ts'].strftime('%Y-%m')
    monthly_matches[m] += 1

for month in sorted(set(list(monthly_likes.keys()) + list(monthly_matches.keys()))):
    l = monthly_likes.get(month, 0)
    m = monthly_matches.get(month, 0)
    conv = m / l * 100 if l > 0 else 0
    bar = '=' * m * 2
    print(f"  {month}: {l:4d} likes, {m:2d} matchs ({conv:.1f}%) {bar}")

# ============================================================
# 10. ABSENCE → RETOUR
# ============================================================
print(f"\n--- PATTERN ABSENCE -> RETOUR ---")
sorted_like_days = sorted(set(e['like_ts'].strftime('%Y-%m-%d') for e in likes))

absences = []
for i in range(1, len(sorted_like_days)):
    curr = sorted_like_days[i]
    prev = sorted_like_days[i - 1]
    gap = (datetime.strptime(curr, '%Y-%m-%d') - datetime.strptime(prev, '%Y-%m-%d')).days

    if gap >= 3:
        likes_return = daily_likes.get(curr, 0)
        matches_return = daily_matches.get(curr, 0)
        # Matches during absence
        matches_during = 0
        for d_offset in range(1, gap):
            absence_day = (datetime.strptime(prev, '%Y-%m-%d') + timedelta(days=d_offset)).strftime('%Y-%m-%d')
            matches_during += daily_matches.get(absence_day, 0)

        absences.append((gap, prev, curr, likes_return, matches_return, matches_during))
        print(f"  Absent {gap}j ({prev} -> {curr}): {likes_return} likes retour, {matches_return} matchs retour, {matches_during} matchs PENDANT absence")

if not absences:
    print(f"  Aucune absence de 3+ jours detectee")

# ============================================================
# 11. "ELLE A LIKÉ EN PREMIER" — Matchs sans like de ta part
# ============================================================
print(f"\n--- MATCHS 'ELLE A LIKE EN PREMIER' ---")
print(f"  Matchs avec like de TA part (tu as initie): {len(both)}")
print(f"  Matchs SANS like de ta part (elle t'a like dans Standouts/Likes You, tu as like en retour): {len(matches_no_like)}")
if total_m > 0:
    print(f"  Proportion 'elle first': {len(matches_no_like)/total_m*100:.1f}%")

for e in matches_no_like:
    print(f"    Match: {e['match_ts']} — {e['chat_count']} messages")

# ============================================================
# 12. TOP JOURS DE MATCH
# ============================================================
print(f"\n--- TOP JOURS DE MATCH ---")
match_day_list = sorted(daily_matches.items(), key=lambda x: x[1], reverse=True)
for d, m in match_day_list[:10]:
    if m > 0:
        l = daily_likes.get(d, 0)
        dow = dow_names[datetime.strptime(d, '%Y-%m-%d').weekday()]
        print(f"  {d} ({dow:10s}): {m} matchs, {l} likes envoyes ce jour")

# ============================================================
# 13. SYNTHÈSE HINGE
# ============================================================
print(f"\n{'='*70}")
print(f"  SYNTHESE HINGE")
print(f"{'='*70}")

print(f"""
1. MATCHS vs ACTIVITE:
   - {match_same_day/total_m*100:.0f}% matchs le jour d'un like (vs {95.6:.0f}% Tinder)
   - {match_no_recent/total_m*100:.0f}% matchs sans activite recente
   -> Hinge est {'SIMILAIRE' if match_same_day/total_m > 0.7 else 'DIFFERENT de'} Tinder

2. MATCHS JOURS INACTIFS:
   - {matches_on_inactive}/{total_m} matchs sur jours sans like ({matches_on_inactive/total_m*100:.1f}%)
   -> {'EVIDENCE de matchs passifs (dark pattern?)' if matches_on_inactive/total_m > 0.15 else 'Peu de matchs passifs'}

3. CORRELATION VOLUME:
   - Jours haute activite: {sum(daily_matches.get(d,0) for d in high_like_days)}/{len(high_like_days)} matchs ({sum(daily_matches.get(d,0) for d in high_like_days)/len(high_like_days):.3f}/j) si high_like_days else 'N/A'
   - Jours zero activite: {sum(daily_matches.get(d,0) for d in zero_like_days)}/{len(zero_like_days)} matchs

4. SES LIKES vs TES LIKES:
   - {len(matches_no_like)} matchs ou elle a like en premier ({len(matches_no_like)/total_m*100:.1f}%)
   - {len(both)} matchs ou tu as like en premier ({len(both)/total_m*100:.1f}%)

5. DELAI MEDIAN: {sorted(delays_hours)[len(delays_hours)//2]:.1f}h (like -> match)
""")
