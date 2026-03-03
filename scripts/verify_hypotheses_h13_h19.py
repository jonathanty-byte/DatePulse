#!/usr/bin/env python3
"""
verify_hypotheses_h13_h19.py
Tests hypotheses H13-H19 against Tinder + Hinge RGPD data.

H13: Opener content (question, length, language, emoji) → conversation survival
H14: Open-without-swipe → algorithmic penalty next day?
H15: Post-boost hangover — does boost destroy organic conversion?
H16: Cross-app activity — both apps same day vs one only
H17: Ghost message number — survival curve (at which msg # do convos die?)
H18: Match-to-first-message delay → conversation outcome
H19: Whippet/dog effect — mentioning the dog → longer convo?
"""

import json
import os
import sys
import re
import math
from datetime import datetime, timedelta
from collections import defaultdict, Counter

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
tinder_purchases = tinder.get('Purchases', {})

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
    for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%S']:
        try:
            return datetime.strptime(ts_str, fmt)
        except (ValueError, TypeError):
            pass
    return None


def parse_rfc(s):
    try:
        return datetime.strptime(s, '%a, %d %b %Y %H:%M:%S GMT')
    except (ValueError, TypeError):
        return None


def wilson_ci(successes, trials, z=1.96):
    if trials == 0:
        return (0, 0)
    p = successes / trials
    denom = 1 + z**2 / trials
    centre = p + z**2 / (2 * trials)
    margin = z * math.sqrt((p * (1 - p) + z**2 / (4 * trials)) / trials)
    return ((centre - margin) / denom, (centre + margin) / denom)


# ============================================================
# H13: OPENER CONTENT → CONVERSATION SURVIVAL
# ============================================================

print("=" * 70)
print("  H13: CONTENU DE L'OPENER → SURVIE DE LA CONVERSATION")
print("=" * 70)

print("\n  TINDER — Analyse du 1er message de chaque conversation:")

opener_data = []
for convo in tinder_messages:
    messages = convo.get('messages', [])
    if not messages:
        continue

    first_msg = messages[0]
    text = first_msg.get('message', '')
    total_your_msgs = len(messages)

    # Features
    has_question = '?' in text
    msg_len = len(text)
    has_emoji = bool(re.search(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0000FE00-\U0000FE0F\U0001F900-\U0001F9FF]', text))

    # Language detection (simple heuristic)
    fr_words = {'salut', 'bonjour', 'coucou', 'hey', 'ça', 'comment', 'quoi', 'tu',
                'toi', 'bien', 'cool', 'super', 'merci', 'oui', 'non', 'je', 'un', 'une',
                'le', 'la', 'les', 'des', 'du', 'et', 'est', 'pas', 'pour', 'avec',
                'ton', 'ta', 'tes', 'mon', 'ma', 'mes', 'sur', 'dans', 'qui', 'que'}
    en_words = {'hello', 'hi', 'how', 'are', 'you', 'what', 'the', 'is', 'do',
                'your', 'my', 'and', 'this', 'that', 'was', 'have', 'with', 'for'}

    words = set(text.lower().split())
    fr_count = len(words & fr_words)
    en_count = len(words & en_words)
    lang = 'FR' if fr_count >= en_count else 'EN' if en_count > fr_count else 'UNK'

    # Check if it's a generic opener
    generic_patterns = [
        r'^(hey|hi|hello|salut|bonjour|coucou|yo)\s*[!.,]?\s*$',
        r'^(hey|hi|hello|salut|bonjour|coucou)\s+(how are you|ça va|comment vas)',
        r'^(hey|salut|hello)\s+\w+\s*[!.,]?\s*$',  # "Hey [name]"
    ]
    is_generic = any(re.match(p, text.strip(), re.IGNORECASE) for p in generic_patterns)

    # Specific reference to bio/photo?
    bio_ref_words = {'photo', 'profil', 'bio', 'voyage', 'trip', 'where', 'où',
                     'quand', 'spot', 'endroit', 'lieu', 'restaurant', 'resto',
                     'rando', 'nepal', 'île', 'maurice', 'whippet', 'chien', 'dog'}
    has_specific_ref = bool(words & bio_ref_words)

    opener_data.append({
        'text': text[:80],
        'total': total_your_msgs,
        'has_question': has_question,
        'msg_len': msg_len,
        'has_emoji': has_emoji,
        'lang': lang,
        'is_generic': is_generic,
        'has_specific_ref': has_specific_ref,
    })

# Feature comparisons
features = [
    ('Question (?)', 'has_question', True, False),
    ('Générique', 'is_generic', True, False),
    ('Réf spécifique (bio/photo)', 'has_specific_ref', True, False),
    ('Emoji', 'has_emoji', True, False),
    ('Français', 'lang', 'FR', 'EN'),
]

print(f"\n  {'Feature':<30} {'Oui':>5} {'Msgs moy':>10} {'Non':>5} {'Msgs moy':>10} {'Δ':>8}")
for label, key, val_yes, val_no in features:
    yes_group = [x for x in opener_data if x[key] == val_yes]
    no_group = [x for x in opener_data if x[key] == val_no]
    if yes_group and no_group:
        y_avg = sum(x['total'] for x in yes_group) / len(yes_group)
        n_avg = sum(x['total'] for x in no_group) / len(no_group)
        diff = ((y_avg - n_avg) / max(0.01, n_avg)) * 100
        print(f"  {label:<30} {len(yes_group):>5} {y_avg:>10.1f} {len(no_group):>5} {n_avg:>10.1f} {diff:>+7.0f}%")

# Length buckets
print(f"\n  Longueur du 1er message → survie:")
len_bkts = [
    ('Court (<30c)', 0, 30),
    ('Moyen (30-80c)', 30, 80),
    ('Long (80-150c)', 80, 150),
    ('Très long (150+c)', 150, 99999),
]
print(f"  {'Longueur':<25} {'N':>3} {'Msgs moy':>10} {'Ghost≤2':>8} {'Long≥11':>8}")
for label, lo, hi in len_bkts:
    bucket = [x for x in opener_data if lo <= x['msg_len'] < hi]
    if bucket:
        avg = sum(x['total'] for x in bucket) / len(bucket)
        ghost = sum(1 for x in bucket if x['total'] <= 2) / len(bucket) * 100
        long_pct = sum(1 for x in bucket if x['total'] >= 11) / len(bucket) * 100
        print(f"  {label:<25} {len(bucket):>3} {avg:>10.1f} {ghost:>7.0f}% {long_pct:>7.0f}%")

# Show actual openers for long convos
print(f"\n  Top openers (convos ≥11 de tes msgs):")
long_openers = sorted([x for x in opener_data if x['total'] >= 11], key=lambda x: -x['total'])
for op in long_openers:
    q = '❓' if op['has_question'] else '  '
    print(f"    {op['total']:>3} msgs {q} [{op['lang']}] \"{op['text']}\"")

print(f"\n  Worst openers (ghost ≤2 msgs):")
ghost_openers = [x for x in opener_data if x['total'] <= 2]
for op in ghost_openers[:8]:
    q = '❓' if op['has_question'] else '  '
    print(f"    {op['total']:>3} msgs {q} [{op['lang']}] \"{op['text']}\"")

# HINGE: first chat message analysis
print(f"\n  HINGE — Analyse du 1er message de chaque match:")
hinge_opener_data = []
for m in hinge_matches:
    chats = m.get('chats', [])
    if not chats:
        continue
    first_chat = chats[0]
    text = first_chat.get('body', '')
    total_chats = len(chats)

    has_question = '?' in text
    msg_len = len(text)

    hinge_opener_data.append({
        'text': text[:80],
        'total': total_chats,
        'has_question': has_question,
        'msg_len': msg_len,
    })

print(f"  ⚠️ Pas de sender info → le 1er message peut être le tien OU le sien.")
if hinge_opener_data:
    q_yes = [x for x in hinge_opener_data if x['has_question']]
    q_no = [x for x in hinge_opener_data if not x['has_question']]
    if q_yes and q_no:
        print(f"  1er msg avec '?': {len(q_yes)} convos, avg {sum(x['total'] for x in q_yes)/len(q_yes):.0f} msgs")
        print(f"  1er msg sans '?': {len(q_no)} convos, avg {sum(x['total'] for x in q_no)/len(q_no):.0f} msgs")


# ============================================================
# H14: OPEN WITHOUT SWIPE → PENALTY NEXT DAY?
# ============================================================

print("\n" + "=" * 70)
print("  H14: OUVRIR SANS SWIPER → PÉNALITÉ ALGORITHMIQUE?")
print("=" * 70)

# Categorize days
open_only_days = []  # opens > 0, likes == 0, passes == 0
active_days = []     # opens > 0, likes > 0
inactive_days = []   # opens == 0

for i, d in enumerate(sorted_days):
    dd = daily[d]
    if dd['opens'] > 0 and dd['likes'] == 0 and dd['passes'] == 0:
        open_only_days.append(i)
    elif dd['opens'] > 0 and dd['likes'] > 0:
        active_days.append(i)
    elif dd['opens'] == 0:
        inactive_days.append(i)

# Conversion NEXT DAY after each type
def next_day_conv(day_indices):
    """Return (total_likes, total_matches, n_days) for the day AFTER each index."""
    total_l = total_m = n = 0
    for i in day_indices:
        if i + 1 < len(sorted_days):
            nd = daily[sorted_days[i + 1]]
            if nd['likes'] > 0:
                total_l += nd['likes']
                total_m += nd['matches']
                n += 1
    return total_l, total_m, n

def next_day_match_rate(day_indices):
    """Return P(match next day) regardless of swiping."""
    match_count = 0
    total = 0
    for i in day_indices:
        if i + 1 < len(sorted_days):
            nd = daily[sorted_days[i + 1]]
            total += 1
            if nd['matches'] > 0:
                match_count += 1
    return match_count, total

print(f"\n  Catégorisation des jours Tinder:")
print(f"  Open only (browse, 0 swipe): {len(open_only_days)} jours")
print(f"  Active (open + swipe):        {len(active_days)} jours")
print(f"  Inactive (0 opens):           {len(inactive_days)} jours")

print(f"\n  Conversion LE LENDEMAIN de chaque type de jour:")
print(f"  {'Jour précédent':<30} {'N jours':>8} {'Likes J+1':>10} {'Matchs J+1':>10} {'Conv J+1':>10}")

for label, indices in [('Open only (0 swipe)', open_only_days),
                       ('Active (swipe)', active_days),
                       ('Inactive (0 open)', inactive_days)]:
    tl, tm, n = next_day_conv(indices)
    conv = tm / max(1, tl) * 100
    print(f"  {label:<30} {n:>8} {tl:>10} {tm:>10} {conv:>9.2f}%")

print(f"\n  P(match le lendemain) de chaque type:")
print(f"  {'Jour précédent':<30} {'Match J+1':>10} {'Total':>8} {'P(match)':>10}")
for label, indices in [('Open only (0 swipe)', open_only_days),
                       ('Active (swipe)', active_days),
                       ('Inactive (0 open)', inactive_days)]:
    mc, tot = next_day_match_rate(indices)
    pct = mc / max(1, tot) * 100
    print(f"  {label:<30} {mc:>10} {tot:>8} {pct:>9.1f}%")

# Also: does the ALGO penalize? Compare matches on open-only days themselves
print(f"\n  Matchs sur les jours 'open only' (sans swipe):")
oo_matches = sum(daily[sorted_days[i]]['matches'] for i in open_only_days)
oo_total = len(open_only_days)
print(f"  {oo_matches} matchs sur {oo_total} jours open-only = {oo_matches/max(1,oo_total):.3f} m/j")
print(f"  (Ce sont des matchs Likes You ou delayed)")


# ============================================================
# H15: POST-BOOST HANGOVER
# ============================================================

print("\n" + "=" * 70)
print("  H15: POST-BOOST HANGOVER — LE BOOST DÉTRUIT-IL LA CONV ORGANIQUE?")
print("=" * 70)

# Explore Purchases structure
print(f"\n  Structure Purchases Tinder:")
if isinstance(tinder_purchases, dict):
    for key, val in tinder_purchases.items():
        if isinstance(val, list):
            print(f"    {key}: {len(val)} entries")
            if val:
                print(f"      Sample: {val[0]}")
        elif isinstance(val, dict):
            print(f"    {key}: dict with keys {list(val.keys())[:5]}")
            # Check for date-like values
            for k2, v2 in list(val.items())[:3]:
                print(f"      {k2}: {v2}")
        else:
            print(f"    {key}: {type(val).__name__} = {str(val)[:100]}")
elif isinstance(tinder_purchases, list):
    print(f"  Purchases is a list with {len(tinder_purchases)} items")
    if tinder_purchases:
        print(f"  Sample: {tinder_purchases[0]}")
else:
    print(f"  Purchases type: {type(tinder_purchases).__name__}")
    print(f"  Value: {str(tinder_purchases)[:200]}")

# Try to find boost-specific data
boost_dates = []
if isinstance(tinder_purchases, dict):
    for key in ['boosts', 'super_likes', 'subscription', 'boost']:
        if key in tinder_purchases:
            print(f"\n  Found '{key}' in Purchases: {tinder_purchases[key]}")
    # Explore all keys for date patterns
    for key, val in tinder_purchases.items():
        if isinstance(val, list):
            for item in val:
                if isinstance(item, dict):
                    for k2, v2 in item.items():
                        if isinstance(v2, str) and ('202' in v2 or 'boost' in str(v2).lower()):
                            print(f"    {key}.{k2} = {v2}")

# Alternative: detect boost days from Usage (sudden spike in opens + matches pattern)
print(f"\n  Proxy: détection des jours de boost via spikes d'activité:")
print(f"  (Jour avec opens > 50 ET matches ≥ 3 = probable boost)")
probable_boosts = []
for i, d in enumerate(sorted_days):
    dd = daily[d]
    if dd['opens'] >= 50 and dd['matches'] >= 3:
        probable_boosts.append((i, d, dd))

if probable_boosts:
    print(f"\n  {len(probable_boosts)} jours de boost probable:")
    print(f"  {'Date':<15} {'Opens':>6} {'Likes':>6} {'Matchs':>7} {'Conv 7j avant':>15} {'Conv 7j après':>15}")
    for idx, d, dd in probable_boosts:
        # 7 days before
        pre_l = pre_m = 0
        for j in range(max(0, idx - 7), idx):
            pre_l += daily[sorted_days[j]]['likes']
            pre_m += daily[sorted_days[j]]['matches']
        pre_conv = pre_m / max(1, pre_l) * 100

        # 7 days after (excluding boost day)
        post_l = post_m = 0
        for j in range(idx + 1, min(idx + 8, len(sorted_days))):
            post_l += daily[sorted_days[j]]['likes']
            post_m += daily[sorted_days[j]]['matches']
        post_conv = post_m / max(1, post_l) * 100

        print(f"  {d:<15} {dd['opens']:>6} {dd['likes']:>6} {dd['matches']:>7} {pre_conv:>14.2f}% {post_conv:>14.2f}%")
else:
    print(f"  Aucun jour avec opens ≥ 50 ET matchs ≥ 3 détecté.")
    # Relax criteria
    print(f"\n  Critère relaxé: opens > 30 ET matches ≥ 2:")
    for i, d in enumerate(sorted_days):
        dd = daily[d]
        if dd['opens'] >= 30 and dd['matches'] >= 2:
            pre_l = pre_m = post_l = post_m = 0
            for j in range(max(0, i - 7), i):
                pre_l += daily[sorted_days[j]]['likes']
                pre_m += daily[sorted_days[j]]['matches']
            for j in range(i + 1, min(i + 8, len(sorted_days))):
                post_l += daily[sorted_days[j]]['likes']
                post_m += daily[sorted_days[j]]['matches']
            pre_conv = pre_m / max(1, pre_l) * 100
            post_conv = post_m / max(1, post_l) * 100
            print(f"    {d}: O={dd['opens']} L={dd['likes']} M={dd['matches']} | 7j avant: {pre_conv:.2f}% | 7j après: {post_conv:.2f}%")


# ============================================================
# H16: CROSS-APP ACTIVITY
# ============================================================

print("\n" + "=" * 70)
print("  H16: ACTIVITÉ CROSS-APP — TINDER + HINGE MÊME JOUR")
print("=" * 70)

# Build Hinge daily activity map from match dates + chat dates
hinge_active_dates = set()

for m in hinge_matches:
    mt = parse_ts(m['match'][0]['timestamp'])
    if mt:
        hinge_active_dates.add(mt.strftime('%Y-%m-%d'))
    for c in m.get('chats', []):
        ct = parse_ts(c['timestamp'])
        if ct:
            hinge_active_dates.add(ct.strftime('%Y-%m-%d'))

# Also add likes (block dates as proxy)
for entry in hinge_likes_only:
    for b in entry.get('block', []):
        bt = parse_ts(b['timestamp'])
        if bt:
            hinge_active_dates.add(bt.strftime('%Y-%m-%d'))
    for c in entry.get('chats', []):
        ct = parse_ts(c['timestamp'])
        if ct:
            hinge_active_dates.add(ct.strftime('%Y-%m-%d'))

print(f"  Jours avec activité Hinge détectable: {len(hinge_active_dates)}")

# Classify Tinder days
both_app = []
tinder_only = []
hinge_only_dates = []

for d in sorted_days:
    tinder_active = daily[d]['likes'] > 0 or daily[d]['opens'] > 0
    hinge_active = d in hinge_active_dates

    if tinder_active and hinge_active:
        both_app.append(d)
    elif tinder_active:
        tinder_only.append(d)

# Hinge-only dates (not in Tinder data at all or Tinder inactive)
for hd in sorted(hinge_active_dates):
    if hd in daily:
        if daily[hd]['likes'] == 0 and daily[hd]['opens'] == 0:
            hinge_only_dates.append(hd)
    else:
        hinge_only_dates.append(hd)

print(f"\n  Classification des jours:")
print(f"  Tinder + Hinge: {len(both_app)} jours")
print(f"  Tinder only:    {len(tinder_only)} jours")
print(f"  Hinge only:     {len(hinge_only_dates)} jours")

# Tinder performance on both-app days vs tinder-only
print(f"\n  Performance TINDER selon activité cross-app:")
print(f"  {'Type':<25} {'Jours':>6} {'Likes':>7} {'Matchs':>7} {'Conv':>8} {'M/j':>6}")
for label, days_list in [('Tinder + Hinge', both_app), ('Tinder only', tinder_only)]:
    tl = sum(daily[d]['likes'] for d in days_list if d in daily)
    tm = sum(daily[d]['matches'] for d in days_list if d in daily)
    n = len(days_list)
    conv = tm / max(1, tl) * 100
    mpd = tm / max(1, n)
    print(f"  {label:<25} {n:>6} {tl:>7} {tm:>7} {conv:>7.2f}% {mpd:>5.2f}")

# Hinge match rate on both-app days
hinge_match_dates_set = set()
for m in hinge_matches:
    mt = parse_ts(m['match'][0]['timestamp'])
    if mt:
        hinge_match_dates_set.add(mt.strftime('%Y-%m-%d'))

both_hinge_matches = sum(1 for d in both_app if d in hinge_match_dates_set)
honly_hinge_matches = sum(1 for d in hinge_only_dates if d in hinge_match_dates_set)
print(f"\n  Matchs HINGE sur jours cross-app: {both_hinge_matches}/{len(both_app)} jours")
print(f"  Matchs HINGE sur jours Hinge-only: {honly_hinge_matches}/{len(hinge_only_dates)} jours")


# ============================================================
# H17: GHOST MESSAGE NUMBER — SURVIVAL CURVE
# ============================================================

print("\n" + "=" * 70)
print("  H17: COURBE DE SURVIE — À QUEL MESSAGE LES CONVOS MEURENT?")
print("=" * 70)

# TINDER survival curve (your messages only)
print(f"\n  TINDER — Courbe de survie (tes messages envoyés, {len(tinder_messages)} convos):")
t_msg_counts = []
for convo in tinder_messages:
    msgs = convo.get('messages', [])
    if msgs:
        t_msg_counts.append(len(msgs))

if t_msg_counts:
    total_convos = len(t_msg_counts)
    max_msgs = max(t_msg_counts)

    print(f"\n  {'Msg #':<8} {'Convos vivantes':>15} {'% survie':>10} {'Dropped ici':>12} {'% drop':>8}  {'':>20}")
    prev_alive = total_convos
    for msg_n in range(1, min(max_msgs + 1, 25)):
        alive = sum(1 for c in t_msg_counts if c >= msg_n)
        dropped = prev_alive - alive
        surv_pct = alive / total_convos * 100
        drop_pct = dropped / max(1, prev_alive) * 100
        bar = '█' * int(surv_pct / 3)
        print(f"  msg {msg_n:<4} {alive:>15} {surv_pct:>9.0f}% {dropped:>12} {drop_pct:>7.0f}%  {bar}")
        prev_alive = alive
        if alive == 0:
            break

    # Key drop points
    print(f"\n  Points de chute critiques:")
    prev = total_convos
    biggest_drops = []
    for msg_n in range(1, min(max_msgs + 1, 25)):
        alive = sum(1 for c in t_msg_counts if c >= msg_n)
        dropped = prev - alive
        if dropped > 0:
            biggest_drops.append((msg_n, dropped, dropped / total_convos * 100))
        prev = alive

    biggest_drops.sort(key=lambda x: -x[1])
    for msg_n, dropped, pct in biggest_drops[:5]:
        print(f"    Message #{msg_n}: {dropped} convos perdues ({pct:.0f}% du total)")

# HINGE survival curve (all messages, no sender distinction)
print(f"\n  HINGE — Courbe de survie ({len(hinge_matches)} matchs, tous msgs confondus):")
h_msg_counts = []
for m in hinge_matches:
    chats = m.get('chats', [])
    h_msg_counts.append(len(chats))

if h_msg_counts:
    total_h = len(h_msg_counts)
    max_h = max(h_msg_counts)

    print(f"\n  {'Msg #':<8} {'Convos vivantes':>15} {'% survie':>10} {'Dropped':>8}  {'':>20}")
    prev_alive = total_h
    for msg_n in [0, 1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 80, 100, 150, 200]:
        if msg_n > max_h:
            break
        alive = sum(1 for c in h_msg_counts if c >= msg_n)
        dropped = prev_alive - alive
        surv_pct = alive / total_h * 100
        bar = '█' * int(surv_pct / 3)
        print(f"  msg {msg_n:<4} {alive:>15} {surv_pct:>9.0f}%  {dropped:>7}  {bar}")
        prev_alive = alive

    # Ghost analysis
    ghost_0 = sum(1 for c in h_msg_counts if c == 0)
    ghost_1_3 = sum(1 for c in h_msg_counts if 1 <= c <= 3)
    active_4_15 = sum(1 for c in h_msg_counts if 4 <= c <= 15)
    long_16p = sum(1 for c in h_msg_counts if c >= 16)
    print(f"\n  Distribution Hinge:")
    print(f"    Ghost immédiat (0 msgs): {ghost_0} ({100*ghost_0/total_h:.0f}%)")
    print(f"    Ghost rapide (1-3 msgs): {ghost_1_3} ({100*ghost_1_3/total_h:.0f}%)")
    print(f"    Convo active (4-15):     {active_4_15} ({100*active_4_15/total_h:.0f}%)")
    print(f"    Longue convo (16+):      {long_16p} ({100*long_16p/total_h:.0f}%)")


# ============================================================
# H18: MATCH → FIRST MESSAGE DELAY → OUTCOME
# ============================================================

print("\n" + "=" * 70)
print("  H18: DÉLAI MATCH → 1ER MESSAGE (TOI) → RÉSULTAT")
print("=" * 70)

# TINDER: match is daily (Usage), first message timestamp is in Messages
print(f"\n  TINDER — Délai entre date du match et ton 1er message:")
print(f"  ⚠️ Match = date quotidienne (pas d'heure exacte). Précision = ±24h.")

# Try to correlate: find which day each convo's first message was sent,
# then look at the Usage data for nearby match days
t_delay_data = []
for convo in tinder_messages:
    msgs = convo.get('messages', [])
    if not msgs:
        continue
    first_ts = parse_rfc(msgs[0].get('sent_date', ''))
    if not first_ts:
        continue

    first_date = first_ts.strftime('%Y-%m-%d')

    # Find the closest match day on or before this date
    match_day = None
    for offset in range(0, 8):
        check_d = (first_ts - timedelta(days=offset)).strftime('%Y-%m-%d')
        if check_d in daily and daily[check_d]['matches'] > 0:
            match_day = check_d
            break

    if match_day:
        delay_days = (first_ts.date() - datetime.strptime(match_day, '%Y-%m-%d').date()).days
        t_delay_data.append({
            'delay_days': delay_days,
            'total': len(msgs),
            'match_day': match_day,
            'first_msg_day': first_date,
        })

if t_delay_data:
    delay_bkts = [
        ('Même jour (J0)', 0, 1),
        ('J+1', 1, 2),
        ('J+2-3', 2, 4),
        ('J+4+', 4, 100),
    ]
    print(f"\n  {'Délai':<25} {'N':>4} {'Msgs moy':>10} {'Ghost≤2':>8} {'Long≥11':>8}")
    for label, lo, hi in delay_bkts:
        bucket = [x for x in t_delay_data if lo <= x['delay_days'] < hi]
        if bucket:
            avg = sum(x['total'] for x in bucket) / len(bucket)
            ghost = sum(1 for x in bucket if x['total'] <= 2) / len(bucket) * 100
            long_pct = sum(1 for x in bucket if x['total'] >= 11) / len(bucket) * 100
            print(f"  {label:<25} {len(bucket):>4} {avg:>10.1f} {ghost:>7.0f}% {long_pct:>7.0f}%")

# HINGE: precise timestamps
print(f"\n  HINGE — Délai match → 1er message (précis):")
h_delay_data = []
for m in hinge_matches:
    match_ts = parse_ts(m['match'][0]['timestamp'])
    chats = m.get('chats', [])
    if match_ts and chats:
        first_chat = parse_ts(chats[0]['timestamp'])
        if first_chat:
            delay_h = (first_chat - match_ts).total_seconds() / 3600
            h_delay_data.append({
                'delay_h': delay_h,
                'total': len(chats),
            })

if h_delay_data:
    h_delay_bkts = [
        ('< 1h (instant)', 0, 1),
        ('1-4h', 1, 4),
        ('4-12h', 4, 12),
        ('12-24h', 12, 24),
        ('1-3 jours', 24, 72),
        ('3+ jours', 72, 99999),
    ]
    print(f"\n  {'Délai':<20} {'N':>4} {'Msgs moy':>10} {'Ghost≤3':>8} {'Long≥16':>8}")
    for label, lo, hi in h_delay_bkts:
        bucket = [x for x in h_delay_data if lo <= x['delay_h'] < hi]
        if bucket:
            avg = sum(x['total'] for x in bucket) / len(bucket)
            ghost = sum(1 for x in bucket if x['total'] <= 3) / len(bucket) * 100
            long_pct = sum(1 for x in bucket if x['total'] >= 16) / len(bucket) * 100
            print(f"  {label:<20} {len(bucket):>4} {avg:>10.1f} {ghost:>7.0f}% {long_pct:>7.0f}%")

    # Quick stats
    delays = [x['delay_h'] for x in h_delay_data]
    print(f"\n  Médiane: {sorted(delays)[len(delays)//2]:.1f}h, Moy: {sum(delays)/len(delays):.1f}h")


# ============================================================
# H19: WHIPPET / DOG EFFECT
# ============================================================

print("\n" + "=" * 70)
print("  H19: L'EFFET WHIPPET — MENTIONNER LE CHIEN → MEILLEURE CONVO?")
print("=" * 70)

# Tinder: search all YOUR messages for dog-related words
dog_words = {'whippet', 'chien', 'chienne', 'dog', 'puppy', 'toutou', 'canin',
             'promenade', 'balade', 'parc', 'veto', 'vétérinaire'}
# Also try common whippet names (we don't know the actual name)
# Let's just search broadly

print(f"\n  TINDER — Recherche de mentions 'chien/whippet' dans tes {len(tinder_messages)} convos:")
dog_convos = []
no_dog_convos = []
dog_mentions_detail = []

for convo in tinder_messages:
    msgs = convo.get('messages', [])
    if not msgs:
        continue

    all_text = ' '.join(m.get('message', '') for m in msgs).lower()
    total = len(msgs)

    has_dog = any(w in all_text for w in dog_words)

    if has_dog:
        dog_convos.append({'total': total, 'text_sample': all_text[:100]})
        # Find which specific words matched
        found = [w for w in dog_words if w in all_text]
        dog_mentions_detail.append((total, found))
    else:
        no_dog_convos.append({'total': total})

print(f"  Convos avec mention chien: {len(dog_convos)}")
print(f"  Convos sans mention chien: {len(no_dog_convos)}")

if dog_convos and no_dog_convos:
    dog_avg = sum(x['total'] for x in dog_convos) / len(dog_convos)
    no_dog_avg = sum(x['total'] for x in no_dog_convos) / len(no_dog_convos)
    diff = ((dog_avg - no_dog_avg) / max(0.01, no_dog_avg)) * 100
    dog_ghost = sum(1 for x in dog_convos if x['total'] <= 2) / len(dog_convos) * 100
    no_dog_ghost = sum(1 for x in no_dog_convos if x['total'] <= 2) / len(no_dog_convos) * 100
    dog_long = sum(1 for x in dog_convos if x['total'] >= 11) / len(dog_convos) * 100
    no_dog_long = sum(1 for x in no_dog_convos if x['total'] >= 11) / len(no_dog_convos) * 100

    print(f"\n  {'Métrique':<25} {'Avec chien':>12} {'Sans chien':>12} {'Δ':>8}")
    print(f"  {'Msgs moy (tes msgs)':<25} {dog_avg:>12.1f} {no_dog_avg:>12.1f} {diff:>+7.0f}%")
    print(f"  {'Ghost ≤2 msgs':<25} {dog_ghost:>11.0f}% {no_dog_ghost:>11.0f}%")
    print(f"  {'Long ≥11 msgs':<25} {dog_long:>11.0f}% {no_dog_long:>11.0f}%")

    print(f"\n  Détail des mentions:")
    for total, words in sorted(dog_mentions_detail, key=lambda x: -x[0]):
        print(f"    {total:>3} msgs — mots trouvés: {', '.join(words)}")

# HINGE: search in all chat bodies
print(f"\n  HINGE — Recherche de mentions chien dans les chats des matchs:")
h_dog_convos = []
h_no_dog_convos = []
h_dog_detail = []

for m in hinge_matches:
    chats = m.get('chats', [])
    total = len(chats)
    all_text = ' '.join(c.get('body', '') for c in chats).lower()

    has_dog = any(w in all_text for w in dog_words)
    if has_dog:
        h_dog_convos.append({'total': total})
        found = [w for w in dog_words if w in all_text]
        h_dog_detail.append((total, found))
    else:
        h_no_dog_convos.append({'total': total})

print(f"  Convos avec mention chien: {len(h_dog_convos)}")
print(f"  Convos sans mention chien: {len(h_no_dog_convos)}")

if h_dog_convos and h_no_dog_convos:
    hd_avg = sum(x['total'] for x in h_dog_convos) / len(h_dog_convos)
    hnd_avg = sum(x['total'] for x in h_no_dog_convos) / len(h_no_dog_convos)
    diff = ((hd_avg - hnd_avg) / max(0.01, hnd_avg)) * 100
    print(f"\n  Msgs moy avec chien: {hd_avg:.0f}, sans: {hnd_avg:.0f} ({diff:+.0f}%)")

    if h_dog_detail:
        print(f"\n  Détail Hinge:")
        for total, words in sorted(h_dog_detail, key=lambda x: -x[0]):
            print(f"    {total:>3} msgs — mots: {', '.join(words)}")


# ============================================================
# SYNTHÈSE
# ============================================================

print("\n" + "=" * 70)
print("  SYNTHÈSE H13-H19")
print("=" * 70)

print(f"""
  H13: CONTENU OPENER
  ────────────────────
  {len(opener_data)} openers Tinder analysés.
  Features testées: question, longueur, emoji, langue, générique, ref spécifique.

  H14: OPEN SANS SWIPE
  ─────────────────────
  {len(open_only_days)} jours "open only" vs {len(active_days)} jours actifs vs {len(inactive_days)} inactifs.
  → Conversion J+1 comparée entre les 3 catégories.

  H15: POST-BOOST HANGOVER
  ─────────────────────────
  Purchases structure explorée.
  → Proxy: détection de jours de boost via spikes d'activité.

  H16: CROSS-APP
  ──────────────
  {len(both_app)} jours Tinder+Hinge, {len(tinder_only)} Tinder only, {len(hinge_only_dates)} Hinge only.
  → Performance Tinder comparée selon co-activité Hinge.

  H17: COURBE DE SURVIE
  ──────────────────────
  Tinder: {len(t_msg_counts)} convos, max {max(t_msg_counts) if t_msg_counts else 0} msgs.
  Hinge: {len(h_msg_counts)} convos, max {max(h_msg_counts) if h_msg_counts else 0} msgs.
  → Points de chute identifiés.

  H18: DÉLAI MATCH→MSG
  ─────────────────────
  Tinder: {len(t_delay_data)} paires match-message.
  Hinge: {len(h_delay_data)} paires (timestamps précis).

  H19: EFFET WHIPPET
  ──────────────────
  Tinder: {len(dog_convos)} convos avec chien, {len(no_dog_convos)} sans.
  Hinge: {len(h_dog_convos)} avec, {len(h_no_dog_convos)} sans.
""")
