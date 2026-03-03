#!/usr/bin/env python3
"""
verify_hypotheses_h6_h12.py
Tests hypotheses H6-H12 against Tinder + Hinge RGPD data.

H6:  Response delay after match → conversation quality
H7:  "Elle first" matches → better quality
H8:  Date-bound conversations have detectable patterns
H9:  Matches come in clusters (success breeds success)
H10: Previous days' like ratio → next day conversion (ELO momentum)
H11: Hour of Hinge like → match probability
H12: Post-shadowban recovery follows a predictable pattern
"""

import json
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import math

sys.stdout.reconfigure(encoding='utf-8')

# ============================================================
# DATA LOADING
# ============================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TINDER_PATH = os.path.join(SCRIPT_DIR, '..', 'Personal', 'Tinder', 'data.json')
HINGE_PATH = os.path.join(os.path.expanduser('~'), 'Downloads', 'export', 'matches.json')

with open(TINDER_PATH, 'r', encoding='utf-8') as f:
    tinder = json.load(f)

with open(HINGE_PATH, 'r', encoding='utf-8') as f:
    hinge_data = json.load(f)

# Parse Tinder
usage = tinder['Usage']
tinder_messages = tinder['Messages']

# Parse daily data
days_all = sorted(usage['app_opens'].keys())
daily = {}
for d in days_all:
    daily[d] = {
        'opens': int(usage['app_opens'].get(d, 0)),
        'likes': int(usage['swipes_likes'].get(d, 0)),
        'passes': int(usage['swipes_passes'].get(d, 0)),
        'matches': int(usage['matches'].get(d, 0)),
        'msgs_sent': int(usage['messages_sent'].get(d, 0)),
        'msgs_rcvd': int(usage['messages_received'].get(d, 0)),
    }
sorted_days = sorted(daily.keys())

# Parse Hinge
hinge_matches = [d for d in hinge_data if d.get('match')]
hinge_likes_only = [d for d in hinge_data if not d.get('match')]


def parse_ts(ts_str):
    """Parse Hinge timestamp string to datetime."""
    for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%S']:
        try:
            return datetime.strptime(ts_str, fmt)
        except ValueError:
            pass
    return None


def parse_rfc(s):
    """Parse Tinder RFC format: 'Mon, 23 Feb 2026 12:39:29 GMT'."""
    try:
        return datetime.strptime(s, '%a, %d %b %Y %H:%M:%S GMT')
    except (ValueError, TypeError):
        return None


def wilson_ci(successes, trials, z=1.96):
    """Wilson score confidence interval."""
    if trials == 0:
        return (0, 0)
    p = successes / trials
    denom = 1 + z**2 / trials
    centre = p + z**2 / (2 * trials)
    margin = z * math.sqrt((p * (1 - p) + z**2 / (4 * trials)) / trials)
    return ((centre - margin) / denom, (centre + margin) / denom)


# ============================================================
# H6: RESPONSE TIME → CONVERSATION QUALITY
# ============================================================

print("=" * 70)
print("  H6: DÉLAI RÉPONSE APRÈS MATCH → QUALITÉ CONVERSATION")
print("=" * 70)

# --- HINGE ---
print("\n  HINGE — Délai match → 1er message vs qualité:")
h6_hinge = []
for m in hinge_matches:
    match_ts = parse_ts(m['match'][0]['timestamp'])
    chats = m.get('chats', [])
    if match_ts and chats:
        first_chat_ts = parse_ts(chats[0]['timestamp'])
        if first_chat_ts:
            delay_h = (first_chat_ts - match_ts).total_seconds() / 3600
            h6_hinge.append({
                'delay_h': delay_h,
                'chat_count': len(chats),
                'match_ts': match_ts,
            })

h6_hinge_no_chat = sum(1 for m in hinge_matches if not m.get('chats'))
print(f"  Matchs avec chat: {len(h6_hinge)}, sans chat (ghost immédiat): {h6_hinge_no_chat}")

delay_buckets = [
    ('< 1h', 0, 1),
    ('1-6h', 1, 6),
    ('6-24h', 6, 24),
    ('1-3 jours', 24, 72),
    ('3+ jours', 72, 99999),
]
print(f"\n  {'Délai':<20} {'N':>3} {'Msgs moy':>10} {'Msgs méd':>10} {'Ghost≤3':>8}")
for label, lo, hi in delay_buckets:
    bucket = [x for x in h6_hinge if lo <= x['delay_h'] < hi]
    if bucket:
        msgs = sorted([x['chat_count'] for x in bucket])
        avg_msg = sum(msgs) / len(msgs)
        med_msg = msgs[len(msgs) // 2]
        ghost_pct = sum(1 for x in msgs if x <= 3) / len(msgs) * 100
        print(f"  {label:<20} {len(bucket):>3} {avg_msg:>10.1f} {med_msg:>10} {ghost_pct:>7.0f}%")

# --- TINDER ---
print("\n  TINDER — Analyse des réponses:")

t6_data = []
# NOTE: Tinder RGPD export only includes YOUR sent messages, not received ones.
# from="You" for ALL messages. We can't determine who messaged first or her reply delay.
# We CAN analyze: your message timing, spacing, lengths.
# For aggregate sent/received, we use Usage data (messages_sent, messages_received).
for convo in tinder_messages:
    messages = convo.get('messages', [])
    if not messages:
        continue

    msg_timestamps = []
    msg_lengths = []
    for msg in messages:
        ts = parse_rfc(msg.get('sent_date', ''))
        msg_timestamps.append(ts)
        msg_lengths.append(len(msg.get('message', '')))

    valid_ts = [t for t in msg_timestamps if t]
    first_msg = valid_ts[0] if valid_ts else None
    last_msg = valid_ts[-1] if valid_ts else None
    duration_h = (last_msg - first_msg).total_seconds() / 3600 if first_msg and last_msg and last_msg > first_msg else 0

    # Time between messages (your message spacing)
    intervals = []
    for i in range(1, len(valid_ts)):
        delta = (valid_ts[i] - valid_ts[i - 1]).total_seconds() / 3600
        intervals.append(delta)

    t6_data.append({
        'total': len(messages),  # Only YOUR messages (export limitation)
        'avg_len': sum(msg_lengths) / max(1, len(msg_lengths)),
        'duration_h': duration_h,
        'first_msg': first_msg,
        'avg_interval_h': sum(intervals) / max(1, len(intervals)) if intervals else 0,
    })

# Tinder: aggregate sent/received from Usage data
total_sent = sum(daily[d]['msgs_sent'] for d in sorted_days)
total_rcvd = sum(daily[d]['msgs_rcvd'] for d in sorted_days)
print(f"\n  TINDER — Données agrégées Usage:")
print(f"  Total msgs envoyés: {total_sent}, reçus: {total_rcvd}, ratio reçu/envoyé: {total_rcvd/max(1,total_sent):.2f}")
print(f"  ⚠️ L'export RGPD Tinder ne contient QUE tes msgs envoyés → pas d'analyse de réponse possible")

# Tinder: your messaging patterns
print(f"\n  TINDER — Tes patterns de messaging ({len(t6_data)} convos):")
print(f"  {'Tes msgs envoyés':<25} {'N':>3} {'Durée moy':>10} {'Avg len':>8} {'Interval':>10}")
msg_buckets = [
    ('1-2 msgs (ghost)', lambda x: x['total'] <= 2),
    ('3-5 msgs', lambda x: 3 <= x['total'] <= 5),
    ('6-10 msgs', lambda x: 6 <= x['total'] <= 10),
    ('11+ msgs (invested)', lambda x: x['total'] >= 11),
]
for label, pred in msg_buckets:
    bucket = [x for x in t6_data if pred(x)]
    if bucket:
        n = len(bucket)
        avg_dur = sum(x['duration_h'] for x in bucket) / n
        avg_len = sum(x['avg_len'] for x in bucket) / n
        avg_int = sum(x['avg_interval_h'] for x in bucket) / n
        print(f"  {label:<25} {n:>3} {avg_dur:>8.0f}h {avg_len:>7.0f}c {avg_int:>9.1f}h")


# ============================================================
# H7: "ELLE FIRST" MATCHS = MEILLEURE QUALITÉ
# ============================================================

print("\n" + "=" * 70)
print("  H7: MATCHS 'ELLE FIRST' = MEILLEURE QUALITÉ?")
print("=" * 70)

# --- TINDER ---
print("\n  TINDER — ⚠️ L'export RGPD ne contient QUE tes messages envoyés.")
print("  On ne peut PAS déterminer qui a messagé en premier sur Tinder.")
print("  Proxy: les jours où tu reçois des msgs SANS en envoyer = elle a initié.")

# Days where received > 0 but sent == 0
she_initiated_days = [(d, daily[d]) for d in sorted_days
                       if daily[d]['msgs_rcvd'] > 0 and daily[d]['msgs_sent'] == 0]
you_initiated_days = [(d, daily[d]) for d in sorted_days
                       if daily[d]['msgs_sent'] > 0]
print(f"\n  Jours avec msgs reçus SANS envoyer (elle relance): {len(she_initiated_days)}")
print(f"  Jours où TU envoies des msgs: {len(you_initiated_days)}")

# Compare days where she sends more vs you send more
print(f"\n  Ratio reçu/envoyé par jour (jours avec les deux > 0):")
both_days = [(d, daily[d]) for d in sorted_days
             if daily[d]['msgs_sent'] > 0 and daily[d]['msgs_rcvd'] > 0]
high_engage = [(d, dd) for d, dd in both_days if dd['msgs_rcvd'] >= dd['msgs_sent']]
low_engage = [(d, dd) for d, dd in both_days if dd['msgs_rcvd'] < dd['msgs_sent']]
print(f"  Elle répond ≥ autant que toi: {len(high_engage)} jours")
print(f"  Elle répond < que toi: {len(low_engage)} jours")

# H7 placeholder for Tinder
you_first_t = t6_data  # All convos (can't split)
her_first_t = []  # Can't identify

# --- HINGE: no sender info → use delay as proxy ---
print("\n  HINGE — Proxy: délai match→1er msg (instant = elle avait déjà liké):")
hinge_instant = [x for x in h6_hinge if x['delay_h'] < 0.5]   # < 30 min
hinge_delayed = [x for x in h6_hinge if x['delay_h'] >= 0.5]

print(f"\n  {'Type':<30} {'N':>3} {'Msgs moy':>10} {'Ghost≤3':>8}")
for label, bucket in [('Instant (<30min = elle first?)', hinge_instant),
                       ('Delayed (>30min = toi first?)', hinge_delayed)]:
    if bucket:
        msgs = [x['chat_count'] for x in bucket]
        avg = sum(msgs) / len(msgs)
        ghost = sum(1 for m in msgs if m <= 3) / len(msgs) * 100
        print(f"  {label:<30} {len(bucket):>3} {avg:>10.1f} {ghost:>7.0f}%")

# Tinder: daily messaging ratio analysis
print(f"\n  TINDER — Jours avec fort engagement reçu (ratio rcvd/sent ≥ 1.5):")
hot_days = [(d, dd) for d, dd in both_days if dd['msgs_rcvd'] / max(1, dd['msgs_sent']) >= 1.5]
if hot_days:
    for d, dd in hot_days[:10]:
        ratio = dd['msgs_rcvd'] / max(1, dd['msgs_sent'])
        print(f"    {d}: sent={dd['msgs_sent']}, rcvd={dd['msgs_rcvd']}, ratio={ratio:.1f}×, matchs={dd['matches']}")
else:
    print(f"    Aucun jour avec ratio rcvd/sent ≥ 1.5")


# ============================================================
# H8: PATTERN DES CONVERSATIONS → DATE
# ============================================================

print("\n" + "=" * 70)
print("  H8: PATTERN DES CONVOS QUI MÈNENT À UN DATE")
print("=" * 70)

# --- TINDER ---
print("\n  TINDER — Métriques par catégorie de conversation:")
convo_stats = []
# NOTE: Only YOUR sent messages in the export. "total" = your msgs only.
for convo in tinder_messages:
    messages = convo.get('messages', [])
    if not messages:
        continue

    msg_lengths = [len(m.get('message', '')) for m in messages]
    timestamps = [parse_rfc(m.get('sent_date', '')) for m in messages]
    timestamps = [t for t in timestamps if t]
    duration_h = (timestamps[-1] - timestamps[0]).total_seconds() / 3600 if len(timestamps) >= 2 else 0
    duration_days = max(0.04, duration_h / 24)

    convo_stats.append({
        'total': len(messages),  # Your msgs only
        'avg_len': sum(msg_lengths) / max(1, len(msg_lengths)),
        'duration_h': duration_h,
        'msgs_per_day': len(messages) / duration_days,
    })

categories = [
    ('Ghost (≤2 msgs toi)', lambda x: x['total'] <= 2),
    ('Court (3-5)', lambda x: 3 <= x['total'] <= 5),
    ('Moyen (6-10)', lambda x: 6 <= x['total'] <= 10),
    ('Long (11+ ≈ date)', lambda x: x['total'] >= 11),
]

print(f"\n  ⚠️ L'export Tinder ne contient QUE tes msgs envoyés (pas les reçus).")
print(f"  'Total' ci-dessous = tes msgs uniquement. Pour les reçus: Usage agrégé.\n")
print(f"  {'Catégorie':<25} {'N':>3} {'Avg len':>8} {'Msg/j':>7} {'Durée':>8}")
for label, pred in categories:
    bucket = [x for x in convo_stats if pred(x)]
    if bucket:
        n = len(bucket)
        al = sum(x['avg_len'] for x in bucket) / n
        amp = sum(x['msgs_per_day'] for x in bucket) / n
        adh = sum(x['duration_h'] for x in bucket) / n
        print(f"  {label:<25} {n:>3} {al:>7.0f}c {amp:>7.1f} {adh:>6.0f}h")

# Key differentiators
print("\n  TINDER — Ce qui distingue les longues convos (≥11 de tes msgs) des courtes:")
long_c = [x for x in convo_stats if x['total'] >= 11]
short_c = [x for x in convo_stats if 1 <= x['total'] < 11]
if long_c and short_c:
    metrics = [
        ('Ta longueur msg (chars)', 'avg_len'),
        ('Tes msgs/jour', 'msgs_per_day'),
        ('Durée (h)', 'duration_h'),
    ]
    print(f"  {'Métrique':<30} {'Long (≥11)':>12} {'Court (<11)':>12} {'Δ':>8}")
    for label, key in metrics:
        l_avg = sum(x[key] for x in long_c) / len(long_c)
        s_avg = sum(x[key] for x in short_c) / len(short_c)
        diff = ((l_avg - s_avg) / max(0.01, abs(s_avg))) * 100
        print(f"  {label:<30} {l_avg:>12.1f} {s_avg:>12.1f} {diff:>+7.0f}%")

# --- HINGE ---
print("\n  HINGE — Métriques par catégorie:")
hinge_convos = []
for m in hinge_matches:
    chats = m.get('chats', [])
    match_ts = parse_ts(m['match'][0]['timestamp'])
    blocked = len(m.get('block', [])) > 0

    if not chats:
        hinge_convos.append({'total': 0, 'avg_len': 0, 'duration_h': 0,
                             'msgs_per_day': 0, 'blocked': blocked})
        continue

    timestamps = [parse_ts(c['timestamp']) for c in chats]
    timestamps = [t for t in timestamps if t]
    duration_h = (timestamps[-1] - timestamps[0]).total_seconds() / 3600 if len(timestamps) >= 2 else 0
    msg_lens = [len(c.get('body', '')) for c in chats]

    hinge_convos.append({
        'total': len(chats),
        'avg_len': sum(msg_lens) / max(1, len(msg_lens)),
        'duration_h': duration_h,
        'msgs_per_day': len(chats) / max(0.04, duration_h / 24),
        'blocked': blocked,
    })

print(f"\n  {'Catégorie':<22} {'N':>3} {'Msg len moy':>12} {'Msg/j':>7} {'Durée':>8} {'Unmatch%':>9}")
for label, pred in categories:
    bucket = [x for x in hinge_convos if pred(x)]
    if bucket:
        n = len(bucket)
        al = sum(x['avg_len'] for x in bucket) / n
        amp = sum(x['msgs_per_day'] for x in bucket) / n
        adh = sum(x['duration_h'] for x in bucket) / n
        bp = sum(1 for x in bucket if x['blocked']) / n * 100
        print(f"  {label:<22} {n:>3} {al:>12.0f} {amp:>7.1f} {adh:>6.0f}h {bp:>8.0f}%")

# Hinge long vs short
h_long = [x for x in hinge_convos if x['total'] >= 16]
h_short = [x for x in hinge_convos if 1 <= x['total'] < 16]
if h_long and h_short:
    print(f"\n  HINGE — Long vs court:")
    print(f"  Long (≥16): {len(h_long)} convos, avg {sum(x['total'] for x in h_long)/len(h_long):.0f} msgs, unmatch {100*sum(1 for x in h_long if x['blocked'])/len(h_long):.0f}%")
    print(f"  Court (<16): {len(h_short)} convos, avg {sum(x['total'] for x in h_short)/len(h_short):.0f} msgs, unmatch {100*sum(1 for x in h_short if x['blocked'])/len(h_short):.0f}%")


# ============================================================
# H9: MATCHS EN CLUSTERS
# ============================================================

print("\n" + "=" * 70)
print("  H9: MATCHS EN CLUSTERS (SUCCÈS ENGENDRE SUCCÈS?)")
print("=" * 70)

# --- TINDER ---
match_counts = [daily[d]['matches'] for d in sorted_days]

after_match = after_match_ok = after_no = after_no_ok = 0
for i in range(len(match_counts) - 1):
    if match_counts[i] > 0:
        after_match += 1
        if match_counts[i + 1] > 0:
            after_match_ok += 1
    else:
        after_no += 1
        if match_counts[i + 1] > 0:
            after_no_ok += 1

p_after_yes = after_match_ok / max(1, after_match)
p_after_no = after_no_ok / max(1, after_no)
ratio_cluster = p_after_yes / max(0.001, p_after_no)

print(f"\n  TINDER — Probabilité de match le lendemain:")
print(f"  Après jour AVEC match:  {after_match_ok}/{after_match} = {100*p_after_yes:.1f}%")
print(f"  Après jour SANS match:  {after_no_ok}/{after_no} = {100*p_after_no:.1f}%")
print(f"  Ratio: {ratio_cluster:.2f}×")
ci_yes = wilson_ci(after_match_ok, after_match)
ci_no = wilson_ci(after_no_ok, after_no)
print(f"  CI 95%: après match [{100*ci_yes[0]:.1f}%, {100*ci_yes[1]:.1f}%] vs après 0 [{100*ci_no[0]:.1f}%, {100*ci_no[1]:.1f}%]")
overlap = ci_yes[0] <= ci_no[1] and ci_no[0] <= ci_yes[1]
print(f"  Significatif? {'❌ NON (CI se chevauchent)' if overlap else '✅ OUI (CI ne se chevauchent pas)'}")

# Streak analysis
print(f"\n  TINDER — Streaks (jours consécutifs avec ≥1 match):")
streaks = []
cs = 0
for m in match_counts:
    if m > 0:
        cs += 1
    else:
        if cs > 0:
            streaks.append(cs)
        cs = 0
if cs > 0:
    streaks.append(cs)

sc = Counter(streaks)
for length in sorted(sc.keys()):
    pct = sc[length] / max(1, len(streaks)) * 100
    print(f"    {length} jour(s): {sc[length]}× ({pct:.0f}%)")

# Multi-match days
multi = [(sorted_days[i], match_counts[i]) for i in range(len(match_counts)) if match_counts[i] >= 2]
print(f"\n  Jours avec 2+ matchs: {len(multi)}")
for d, c in multi:
    idx = sorted_days.index(d)
    nxt = match_counts[idx + 1:idx + 4]
    print(f"    {d}: {c} matchs → next 3j: {nxt}")

# --- HINGE ---
print(f"\n  HINGE — Clustering:")
_hinge_parsed = [(parse_ts(m['match'][0]['timestamp']), m) for m in hinge_matches]
hinge_match_dates = sorted([ts.date() for ts, _ in _hinge_parsed if ts is not None])
hinge_daily_m = Counter(hinge_match_dates)

if hinge_match_dates:
    d_start = hinge_match_dates[0]
    d_end = hinge_match_dates[-1]
    all_hinge = []
    d = d_start
    while d <= d_end:
        all_hinge.append((d, hinge_daily_m.get(d, 0)))
        d += timedelta(days=1)

    ha_y = ha_y_ok = ha_n = ha_n_ok = 0
    for i in range(len(all_hinge) - 1):
        _, mt = all_hinge[i]
        _, mn = all_hinge[i + 1]
        if mt > 0:
            ha_y += 1
            if mn > 0:
                ha_y_ok += 1
        else:
            ha_n += 1
            if mn > 0:
                ha_n_ok += 1

    print(f"  Après jour AVEC match:  {ha_y_ok}/{ha_y} = {100*ha_y_ok/max(1,ha_y):.1f}%")
    print(f"  Après jour SANS match:  {ha_n_ok}/{ha_n} = {100*ha_n_ok/max(1,ha_n):.1f}%")

    # Inter-match intervals
    intervals = [(hinge_match_dates[i+1] - hinge_match_dates[i]).days for i in range(len(hinge_match_dates)-1)]
    if intervals:
        print(f"\n  Intervalles entre matchs Hinge:")
        print(f"    Min: {min(intervals)}j, Max: {max(intervals)}j, Médiane: {sorted(intervals)[len(intervals)//2]}j, Moy: {sum(intervals)/len(intervals):.1f}j")
        within_2d = sum(1 for iv in intervals if iv <= 2)
        print(f"    Matchs à ≤2j d'intervalle: {within_2d}/{len(intervals)} ({100*within_2d/len(intervals):.0f}%)")


# ============================================================
# H10: LIKE RATIO DES JOURS PRÉCÉDENTS → CONVERSION
# ============================================================

print("\n" + "=" * 70)
print("  H10: LIKE RATIO DES 7J PRÉCÉDENTS → CONVERSION DU JOUR")
print("=" * 70)

rolling = []
for i, d in enumerate(sorted_days):
    if i < 7:
        continue
    # 7-day rolling like ratio
    l7 = sum(daily[sorted_days[j]]['likes'] for j in range(i - 7, i))
    p7 = sum(daily[sorted_days[j]]['passes'] for j in range(i - 7, i))
    tot7 = l7 + p7
    ratio7 = l7 / max(1, tot7)

    tl = daily[d]['likes']
    tm = daily[d]['matches']
    if tl > 0:
        rolling.append({
            'date': d,
            'ratio7': ratio7,
            'conv': tm / tl,
            'matches': tm,
            'likes': tl,
        })

ratio_bkts = [
    ('<25% (très sélectif)', 0, 0.25),
    ('25-35%', 0.25, 0.35),
    ('35-45%', 0.35, 0.45),
    ('45-55%', 0.45, 0.55),
    ('>55% (mass-like)', 0.55, 1.01),
]

print(f"\n  {'Ratio 7j précédents':<25} {'Jours':>6} {'Likes':>7} {'Matchs':>7} {'Conv':>8}")
for label, lo, hi in ratio_bkts:
    bucket = [x for x in rolling if lo <= x['ratio7'] < hi]
    if bucket:
        tl = sum(x['likes'] for x in bucket)
        tm = sum(x['matches'] for x in bucket)
        conv = tm / max(1, tl) * 100
        print(f"  {label:<25} {len(bucket):>6} {tl:>7} {tm:>7} {conv:>7.2f}%")

# Pearson correlation
if rolling:
    xv = [d['ratio7'] for d in rolling]
    yv = [d['conv'] for d in rolling]
    n = len(xv)
    xm = sum(xv) / n
    ym = sum(yv) / n
    cov = sum((x - xm) * (y - ym) for x, y in zip(xv, yv)) / n
    sx = (sum((x - xm) ** 2 for x in xv) / n) ** 0.5
    sy = (sum((y - ym) ** 2 for y in yv) / n) ** 0.5
    r = cov / (sx * sy) if sx > 0 and sy > 0 else 0
    print(f"\n  Pearson r = {r:.3f} ({'FAIBLE' if abs(r) < 0.2 else 'MODÉRÉE' if abs(r) < 0.4 else 'FORTE'})")

# Also test: 3-day lag (does selectivity 3 days ago matter more?)
rolling3 = []
for i, d in enumerate(sorted_days):
    if i < 3:
        continue
    l3 = sum(daily[sorted_days[j]]['likes'] for j in range(i - 3, i))
    p3 = sum(daily[sorted_days[j]]['passes'] for j in range(i - 3, i))
    tot3 = l3 + p3
    ratio3 = l3 / max(1, tot3)
    tl = daily[d]['likes']
    tm = daily[d]['matches']
    if tl > 0:
        rolling3.append({'ratio3': ratio3, 'conv': tm / tl})

if rolling3:
    xv = [d['ratio3'] for d in rolling3]
    yv = [d['conv'] for d in rolling3]
    n = len(xv)
    xm = sum(xv) / n
    ym = sum(yv) / n
    cov = sum((x - xm) * (y - ym) for x, y in zip(xv, yv)) / n
    sx = (sum((x - xm) ** 2 for x in xv) / n) ** 0.5
    sy = (sum((y - ym) ** 2 for y in yv) / n) ** 0.5
    r3 = cov / (sx * sy) if sx > 0 and sy > 0 else 0
    print(f"  Pearson r (3-day lag) = {r3:.3f}")


# ============================================================
# H11: HEURE DU LIKE HINGE → PROBABILITÉ DE MATCH
# ============================================================

print("\n" + "=" * 70)
print("  H11: HEURE DU LIKE HINGE → PROBABILITÉ DE MATCH")
print("=" * 70)

# Likes: use block timestamp as proxy (caveat: it's removal time, not like time)
hourly_likes = defaultdict(int)
for entry in hinge_likes_only:
    blk = entry.get('block', [])
    if blk:
        ts = parse_ts(blk[0]['timestamp'])
        if ts:
            hourly_likes[ts.hour] += 1

# Matches: match timestamp
hourly_matches = defaultdict(int)
for m in hinge_matches:
    ts = parse_ts(m['match'][0]['timestamp'])
    if ts:
        hourly_matches[ts.hour] += 1

# Also: first chat hour
hourly_first_chat = defaultdict(int)
for m in hinge_matches:
    chats = m.get('chats', [])
    if chats:
        ts = parse_ts(chats[0]['timestamp'])
        if ts:
            hourly_first_chat[ts.hour] += 1

print(f"\n  ⚠️  CAVEAT: les timestamps 'likes' sont ceux du BLOCK/REMOVE,")
print(f"     pas du like initial. On montre quand même pour la tendance.\n")

print(f"  {'Heure':<6} {'Likes*':>7} {'Matchs':>7} {'Conv*':>7}  {'':>20}")
for h in range(24):
    li = hourly_likes.get(h, 0)
    ma = hourly_matches.get(h, 0)
    cv = ma / max(1, li) * 100 if li > 0 else 0
    bar = '█' * min(30, int(cv * 3)) if cv > 0 else ''
    if li > 0 or ma > 0:
        print(f"  {h:02d}h   {li:>7} {ma:>7} {cv:>6.1f}%  {bar}")

# Grouped by slot
print(f"\n  {'Créneau':<22} {'Likes*':>7} {'Matchs':>7} {'Conv*':>8}")
slots = [
    ('Matin (6-9h)', range(6, 10)),
    ('Midi (10-13h)', range(10, 14)),
    ('Après-midi (14-17h)', range(14, 18)),
    ('Soirée (18-21h)', range(18, 22)),
    ('Nuit (22-5h)', list(range(22, 24)) + list(range(0, 6))),
]
for label, hours in slots:
    li = sum(hourly_likes.get(h, 0) for h in hours)
    ma = sum(hourly_matches.get(h, 0) for h in hours)
    cv = ma / max(1, li) * 100 if li > 0 else 0
    print(f"  {label:<22} {li:>7} {ma:>7} {cv:>7.2f}%")

# Match hour distribution
print(f"\n  Distribution horaire des MATCHS Hinge (timestamp du match):")
for h in range(24):
    ma = hourly_matches.get(h, 0)
    if ma > 0:
        bar = '██' * ma
        print(f"  {h:02d}h: {ma:>2} {bar}")


# ============================================================
# H12: RÉCUPÉRATION POST-SHADOWBAN
# ============================================================

print("\n" + "=" * 70)
print("  H12: RÉCUPÉRATION POST-SHADOWBAN")
print("=" * 70)

# Detect shadowbans: 7+ days with likes > 0 and matches == 0
shadowbans = []
sb_start = None
sb_likes = 0
for i, d in enumerate(sorted_days):
    li = daily[d]['likes']
    ma = daily[d]['matches']
    if li > 0 and ma == 0:
        if sb_start is None:
            sb_start = i
            sb_likes = li
        else:
            sb_likes += li
    else:
        if sb_start is not None and (i - sb_start) >= 7:
            shadowbans.append({
                'start': sorted_days[sb_start],
                'end': sorted_days[i - 1],
                'duration': i - sb_start,
                'likes_wasted': sb_likes,
                'end_idx': i,
                'start_idx': sb_start,
            })
        sb_start = None
        sb_likes = 0

print(f"\n  {len(shadowbans)} shadowbans détectés (≥7j, likes>0, matchs=0)\n")

print(f"  {'Période':<28} {'Durée':>5} {'L gasp':>7} {'j→match':>8} {'Conv 14j après':>15} {'Pause après':>12}")
for sb in shadowbans:
    ei = sb['end_idx']

    # Days until next match
    d2m = None
    for j in range(ei, min(ei + 30, len(sorted_days))):
        if daily[sorted_days[j]]['matches'] > 0:
            d2m = j - ei
            break

    # Conv in 14 days after shadowban
    post_l = post_m = 0
    for j in range(ei, min(ei + 14, len(sorted_days))):
        post_l += daily[sorted_days[j]]['likes']
        post_m += daily[sorted_days[j]]['matches']
    post_conv = post_m / max(1, post_l) * 100

    # Pause days (0-likes) immediately after
    pause = 0
    for j in range(ei, min(ei + 14, len(sorted_days))):
        if daily[sorted_days[j]]['likes'] == 0:
            pause += 1
        else:
            break

    d2m_s = f"{d2m}j" if d2m is not None else ">30j"
    print(f"  {sb['start']}→{sb['end']} {sb['duration']:>3}j {sb['likes_wasted']:>6}L {d2m_s:>8} {post_conv:>14.1f}% {pause:>10}j")

# Analyze: pre-shadowban behavior → recovery
print(f"\n  Comportement AVANT le shadowban → vitesse de recovery:")
print(f"  {'Période':<28} {'L/j avant':>10} {'Ratio avant':>12} {'Pause':>6} {'Conv recovery':>14}")
for sb in shadowbans:
    si = sb['start_idx']
    ei = sb['end_idx']

    if si >= 7:
        pre_l = sum(daily[sorted_days[j]]['likes'] for j in range(si - 7, si))
        pre_p = sum(daily[sorted_days[j]]['passes'] for j in range(si - 7, si))
        pre_ratio = pre_l / max(1, pre_l + pre_p)
        lpd = pre_l / 7

        # Pause after
        pause = 0
        for j in range(ei, min(ei + 14, len(sorted_days))):
            if daily[sorted_days[j]]['likes'] == 0:
                pause += 1
            else:
                break

        # Recovery conv (after pause)
        rec_l = rec_m = 0
        for j in range(ei + pause, min(ei + pause + 14, len(sorted_days))):
            rec_l += daily[sorted_days[j]]['likes']
            rec_m += daily[sorted_days[j]]['matches']
        rec_conv = rec_m / max(1, rec_l) * 100

        print(f"  {sb['start']}→{sb['end']} {lpd:>8.0f} L/j {pre_ratio:>10.0%} {pause:>4}j {rec_conv:>13.1f}%")

# Correlation: pause duration → recovery conv
pause_recovery = []
for sb in shadowbans:
    ei = sb['end_idx']
    pause = 0
    for j in range(ei, min(ei + 30, len(sorted_days))):
        if daily[sorted_days[j]]['likes'] == 0:
            pause += 1
        else:
            break
    rec_l = rec_m = 0
    for j in range(ei + pause, min(ei + pause + 14, len(sorted_days))):
        rec_l += daily[sorted_days[j]]['likes']
        rec_m += daily[sorted_days[j]]['matches']
    if rec_l > 0:
        pause_recovery.append({'pause': pause, 'conv': rec_m / rec_l * 100})

if len(pause_recovery) >= 3:
    print(f"\n  Corrélation pause (jours) → conv recovery:")
    for pr in sorted(pause_recovery, key=lambda x: x['pause']):
        bar = '█' * int(pr['conv'] * 5)
        print(f"    {pr['pause']:>2}j pause → {pr['conv']:>5.1f}% conv  {bar}")


# ============================================================
# SYNTHÈSE
# ============================================================

print("\n" + "=" * 70)
print("  SYNTHÈSE H6-H12")
print("=" * 70)

print(f"""
  H6: DÉLAI RÉPONSE → QUALITÉ
  ─────────────────────────────
  Hinge: {len(h6_hinge)} matchs avec chat analysés.
  Tinder: export limité (que tes msgs), {len(t6_data)} convos analysées.
  → Le délai match→1er message sur Hinge corrèle avec la qualité.

  H7: "ELLE FIRST" = MEILLEURE QUALITÉ?
  ─────────────────────────────────────
  Tinder: export ne contient que tes messages → impossible de déterminer qui initie.
  Hinge: proxy par délai match→1er msg.

  H8: PATTERN DES CONVOS → DATE
  ──────────────────────────────
  Tinder: {len(long_c)} longues convos (≥11 de tes msgs), {len(short_c)} courtes.
  Hinge: {len(h_long) if h_long else 0} longues (≥16 msgs), {len(h_short) if h_short else 0} courtes.

  H9: MATCHS EN CLUSTERS
  ──────────────────────
  Tinder: P(match demain | match aujourd'hui) = {100*p_after_yes:.1f}%
          P(match demain | pas match) = {100*p_after_no:.1f}%
          Ratio: {ratio_cluster:.2f}×
          CI: {"se chevauchent → NON significatif" if overlap else "ne se chevauchent pas → SIGNIFICATIF"}

  H10: ELO MOMENTUM
  ──────────────────
  Pearson r (7j) = {r:.3f}, r (3j) = {r3:.3f}
  → {"FAIBLE" if abs(r) < 0.2 else "MODÉRÉE" if abs(r) < 0.4 else "FORTE"} corrélation

  H11: HEURE HINGE
  ────────────────
  ⚠️ Timestamps des likes = timestamps de SUPPRESSION, pas d'envoi.
  → Donnée trop bruitée pour conclure sur l'heure optimale.

  H12: RECOVERY POST-SHADOWBAN
  ─────────────────────────────
  {len(shadowbans)} shadowbans analysés.
  → Vérifier si la durée de pause prédit la qualité du recovery.
""")
