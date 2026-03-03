#!/usr/bin/env python3
"""
verify_hypotheses_h20_h24.py
Tests hypotheses H20-H24 against Tinder + Hinge RGPD data.

H20: Double-text / Relance — sending follow-up without reply → helps or kills?
H21: Conversation revival — does a convo survive after a 24h+ silence gap?
H22: First message time of day → conversation outcome
H23: Simultaneous active conversations → quality dilution?
H24: Message length evolution — do your messages get shorter = losing interest signal?
"""

import json
import os
import sys
import math
from datetime import datetime, timedelta
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TINDER_PATH = os.path.join(SCRIPT_DIR, '..', 'Personal', 'Tinder', 'data.json')
HINGE_PATH = os.path.join(os.path.expanduser('~'), 'Downloads', 'export', 'matches.json')

with open(TINDER_PATH, 'r', encoding='utf-8') as f:
    tinder = json.load(f)
with open(HINGE_PATH, 'r', encoding='utf-8') as f:
    hinge_data = json.load(f)

usage = tinder['Usage']
tinder_messages = tinder['Messages']
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

hinge_matches = [d for d in hinge_data if d.get('match')]


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


# ============================================================
# H20: DOUBLE-TEXT / RELANCE
# ============================================================

print("=" * 70)
print("  H20: DOUBLE-TEXT / RELANCE — RELANCER AIDE OU TUE?")
print("=" * 70)

# Strategy: since ALL Tinder messages are from you, analyze gaps between
# your consecutive messages. Short gaps = possible double-text.
# But we need to be smart: if gap is 1-6h, she probably replied in between.
# If gap is < 30min, it's likely a double-text (you sent another msg without reply).
# If gap is > 24h with a message right before and after, it could be a "relance"
# after she went silent.

print(f"\n  TINDER — Analyse des gaps entre tes messages consécutifs:")
print(f"  (Rappel: export = UNIQUEMENT tes msgs. On infère les double-texts par le timing.)\n")

convo_analysis = []
for convo in tinder_messages:
    msgs = convo.get('messages', [])
    if len(msgs) < 2:
        convo_analysis.append({
            'total': len(msgs),
            'has_double_text': False,
            'has_relance': False,
            'double_text_count': 0,
            'relance_count': 0,
            'max_gap_h': 0,
            'gaps': [],
        })
        continue

    timestamps = [parse_rfc(m.get('sent_date', '')) for m in msgs]
    timestamps = [t for t in timestamps if t]

    gaps_h = []
    for i in range(1, len(timestamps)):
        gap = (timestamps[i] - timestamps[i-1]).total_seconds() / 3600
        gaps_h.append(gap)

    # Double-text: gap < 30 min between YOUR messages = you sent another without reply
    double_texts = sum(1 for g in gaps_h if g < 0.5)

    # Quick follow-up: 30min - 2h = borderline (could be double-text or she replied quickly)
    quick_followups = sum(1 for g in gaps_h if 0.5 <= g < 2)

    # Relance: gap > 24h then you send another message = you came back after silence
    relances = sum(1 for g in gaps_h if g >= 24)

    # Long relance: gap > 48h
    long_relances = sum(1 for g in gaps_h if g >= 48)

    convo_analysis.append({
        'total': len(msgs),
        'has_double_text': double_texts > 0,
        'has_relance': relances > 0,
        'has_long_relance': long_relances > 0,
        'double_text_count': double_texts,
        'relance_count': relances,
        'quick_followup_count': quick_followups,
        'max_gap_h': max(gaps_h) if gaps_h else 0,
        'gaps': gaps_h,
    })

# Compare outcomes
print(f"  Detection dans {len(convo_analysis)} convos:")
dt_yes = [c for c in convo_analysis if c['has_double_text']]
dt_no = [c for c in convo_analysis if not c['has_double_text'] and c['total'] >= 2]
print(f"  Double-text (<30min gap): {len(dt_yes)} convos vs {len(dt_no)} sans")

if dt_yes and dt_no:
    print(f"\n  {'Métrique':<30} {'Avec DT':>12} {'Sans DT':>12} {'Δ':>8}")
    y_avg = sum(c['total'] for c in dt_yes) / len(dt_yes)
    n_avg = sum(c['total'] for c in dt_no) / len(dt_no)
    diff = ((y_avg - n_avg) / max(0.01, n_avg)) * 100
    print(f"  {'Tes msgs moy':<30} {y_avg:>12.1f} {n_avg:>12.1f} {diff:>+7.0f}%")

    y_ghost = sum(1 for c in dt_yes if c['total'] <= 2) / len(dt_yes) * 100
    n_ghost = sum(1 for c in dt_no if c['total'] <= 2) / len(dt_no) * 100
    print(f"  {'Ghost ≤2 msgs':<30} {y_ghost:>11.0f}% {n_ghost:>11.0f}%")

    y_long = sum(1 for c in dt_yes if c['total'] >= 11) / len(dt_yes) * 100
    n_long = sum(1 for c in dt_no if c['total'] >= 11) / len(dt_no) * 100
    print(f"  {'Long ≥11 msgs':<30} {y_long:>11.0f}% {n_long:>11.0f}%")

# Relance analysis (24h+ gap)
rl_yes = [c for c in convo_analysis if c['has_relance']]
rl_no = [c for c in convo_analysis if not c['has_relance'] and c['total'] >= 2]
print(f"\n  Relance (gap >24h): {len(rl_yes)} convos vs {len(rl_no)} sans")

if rl_yes and rl_no:
    print(f"\n  {'Métrique':<30} {'Avec relance':>12} {'Sans relance':>12} {'Δ':>8}")
    y_avg = sum(c['total'] for c in rl_yes) / len(rl_yes)
    n_avg = sum(c['total'] for c in rl_no) / len(rl_no)
    diff = ((y_avg - n_avg) / max(0.01, n_avg)) * 100
    print(f"  {'Tes msgs moy':<30} {y_avg:>12.1f} {n_avg:>12.1f} {diff:>+7.0f}%")

    y_ghost = sum(1 for c in rl_yes if c['total'] <= 2) / len(rl_yes) * 100
    n_ghost = sum(1 for c in rl_no if c['total'] <= 2) / len(rl_no) * 100
    print(f"  {'Ghost ≤2 msgs':<30} {y_ghost:>11.0f}% {n_ghost:>11.0f}%")

    y_long = sum(1 for c in rl_yes if c['total'] >= 11) / len(rl_yes) * 100
    n_long = sum(1 for c in rl_no if c['total'] >= 11) / len(rl_no) * 100
    print(f"  {'Long ≥11 msgs':<30} {y_long:>11.0f}% {n_long:>11.0f}%")

# Detailed: what happens AFTER the double-text or relance?
print(f"\n  Que se passe-t-il APRÈS un double-text?")
print(f"  (On regarde si tu envoies encore des msgs après le DT)")
dt_outcomes = {'continued': 0, 'died': 0}
for c in convo_analysis:
    gaps = c['gaps']
    for i, g in enumerate(gaps):
        if g < 0.5:  # double-text
            remaining_msgs = len(gaps) - i
            if remaining_msgs > 2:
                dt_outcomes['continued'] += 1
            else:
                dt_outcomes['died'] += 1

total_dt = dt_outcomes['continued'] + dt_outcomes['died']
if total_dt > 0:
    print(f"  Double-texts détectés: {total_dt}")
    print(f"  → Convo continue après: {dt_outcomes['continued']} ({100*dt_outcomes['continued']/total_dt:.0f}%)")
    print(f"  → Convo meurt après:    {dt_outcomes['died']} ({100*dt_outcomes['died']/total_dt:.0f}%)")

# Same for relance
print(f"\n  Que se passe-t-il APRÈS une relance (gap >24h)?")
rl_outcomes = {'continued': 0, 'died': 0}
for c in convo_analysis:
    gaps = c['gaps']
    for i, g in enumerate(gaps):
        if g >= 24:  # relance
            remaining_msgs = len(gaps) - i
            if remaining_msgs > 1:
                rl_outcomes['continued'] += 1
            else:
                rl_outcomes['died'] += 1

total_rl = rl_outcomes['continued'] + rl_outcomes['died']
if total_rl > 0:
    print(f"  Relances détectées: {total_rl}")
    print(f"  → Convo continue après: {rl_outcomes['continued']} ({100*rl_outcomes['continued']/total_rl:.0f}%)")
    print(f"  → Convo meurt après:    {rl_outcomes['died']} ({100*rl_outcomes['died']/total_rl:.0f}%)")

# Usage-level: days where you send more than you receive
print(f"\n  TINDER Usage — Ratio sent/received par jour (jours avec msgs):")
chasing_days = []  # sent > received
balanced_days = []  # received >= sent
for d in sorted_days:
    s = daily[d]['msgs_sent']
    r = daily[d]['msgs_rcvd']
    if s > 0 and r > 0:
        if s > r:
            chasing_days.append(d)
        else:
            balanced_days.append(d)

print(f"  Jours 'chasing' (sent > received): {len(chasing_days)}")
print(f"  Jours 'balanced' (received ≥ sent): {len(balanced_days)}")

# Next day match rate after chasing vs balanced
chase_next_m = sum(1 for d in chasing_days
                   if sorted_days.index(d) + 1 < len(sorted_days)
                   and daily[sorted_days[sorted_days.index(d)+1]]['matches'] > 0)
bal_next_m = sum(1 for d in balanced_days
                 if sorted_days.index(d) + 1 < len(sorted_days)
                 and daily[sorted_days[sorted_days.index(d)+1]]['matches'] > 0)
print(f"  P(match J+1 | chasing): {chase_next_m}/{len(chasing_days)} = {100*chase_next_m/max(1,len(chasing_days)):.1f}%")
print(f"  P(match J+1 | balanced): {bal_next_m}/{len(balanced_days)} = {100*bal_next_m/max(1,len(balanced_days)):.1f}%")

# HINGE: analyze chat gaps (can't tell sender, but can detect gap patterns)
print(f"\n  HINGE — Gaps dans les chats (tous msgs, pas de sender info):")
hinge_gap_data = []
for m in hinge_matches:
    chats = m.get('chats', [])
    if len(chats) < 2:
        hinge_gap_data.append({'total': len(chats), 'max_gap_h': 0, 'gaps_24h': 0, 'has_revival': False})
        continue

    timestamps = [parse_ts(c['timestamp']) for c in chats]
    timestamps = [t for t in timestamps if t]

    gaps_h = [(timestamps[i] - timestamps[i-1]).total_seconds() / 3600
              for i in range(1, len(timestamps))]

    gaps_24h = sum(1 for g in gaps_h if g >= 24)
    has_revival = any(g >= 24 for g in gaps_h)

    hinge_gap_data.append({
        'total': len(chats),
        'max_gap_h': max(gaps_h) if gaps_h else 0,
        'gaps_24h': gaps_24h,
        'has_revival': has_revival,
        'gaps': gaps_h,
    })

revival = [c for c in hinge_gap_data if c['has_revival']]
no_revival = [c for c in hinge_gap_data if not c['has_revival'] and c['total'] >= 2]
print(f"  Convos avec gap >24h (revival): {len(revival)}")
print(f"  Convos sans gap >24h: {len(no_revival)}")
if revival and no_revival:
    r_avg = sum(c['total'] for c in revival) / len(revival)
    n_avg = sum(c['total'] for c in no_revival) / len(no_revival)
    print(f"  Msgs moy avec revival: {r_avg:.0f}, sans: {n_avg:.0f}")


# ============================================================
# H21: CONVERSATION REVIVAL AFTER SILENCE
# ============================================================

print("\n" + "=" * 70)
print("  H21: REVIVAL — UNE CONVO PEUT-ELLE SURVIVRE APRÈS UN SILENCE?")
print("=" * 70)

# Tinder: analyze conversations that have a gap > 24h between your messages
print(f"\n  TINDER — Convos avec au moins un gap >24h entre tes messages:")

revival_convos = []
for c in convo_analysis:
    if not c['has_relance']:
        continue
    gaps = c['gaps']
    # Find the biggest gap and what happens after
    max_gap_idx = max(range(len(gaps)), key=lambda i: gaps[i]) if gaps else -1
    if max_gap_idx >= 0:
        msgs_before = max_gap_idx + 1
        msgs_after = len(gaps) - max_gap_idx
        revival_convos.append({
            'total': c['total'],
            'max_gap_h': c['max_gap_h'],
            'msgs_before': msgs_before,
            'msgs_after': msgs_after,
            'continued': msgs_after >= 2,
        })

if revival_convos:
    print(f"\n  {len(revival_convos)} convos avec gap >24h:")
    print(f"  {'Total msgs':>10} {'Max gap':>8} {'Msgs avant':>12} {'Msgs après':>12} {'Survit?':>8}")
    for rc in sorted(revival_convos, key=lambda x: -x['total']):
        surv = '✅' if rc['continued'] else '❌'
        print(f"  {rc['total']:>10} {rc['max_gap_h']:>6.0f}h {rc['msgs_before']:>12} {rc['msgs_after']:>12} {surv:>8}")

    survived = sum(1 for rc in revival_convos if rc['continued'])
    print(f"\n  Taux de survie après silence >24h: {survived}/{len(revival_convos)} = {100*survived/len(revival_convos):.0f}%")

# Gap duration vs survival
print(f"\n  Durée du silence → survie:")
gap_bkts = [
    ('24-48h', 24, 48),
    ('48h-1 semaine', 48, 168),
    ('1 semaine+', 168, 99999),
]
for label, lo, hi in gap_bkts:
    bucket = [rc for rc in revival_convos if lo <= rc['max_gap_h'] < hi]
    if bucket:
        surv = sum(1 for rc in bucket if rc['continued'])
        print(f"  {label:<20}: {surv}/{len(bucket)} survivent ({100*surv/len(bucket):.0f}%)")

# HINGE: same analysis
print(f"\n  HINGE — Revival après gap >24h:")
hinge_revivals = []
for c in hinge_gap_data:
    if not c['has_revival'] or c['total'] < 2:
        continue
    gaps = c.get('gaps', [])
    if not gaps:
        continue
    max_gap_idx = max(range(len(gaps)), key=lambda i: gaps[i])
    msgs_before = max_gap_idx + 1
    msgs_after = len(gaps) - max_gap_idx
    hinge_revivals.append({
        'total': c['total'],
        'max_gap_h': c['max_gap_h'],
        'msgs_before': msgs_before,
        'msgs_after': msgs_after,
        'continued': msgs_after >= 3,
    })

if hinge_revivals:
    survived = sum(1 for rc in hinge_revivals if rc['continued'])
    print(f"  {len(hinge_revivals)} convos avec gap >24h")
    print(f"  Taux de survie: {survived}/{len(hinge_revivals)} = {100*survived/len(hinge_revivals):.0f}%")

    for label, lo, hi in gap_bkts:
        bucket = [rc for rc in hinge_revivals if lo <= rc['max_gap_h'] < hi]
        if bucket:
            surv = sum(1 for rc in bucket if rc['continued'])
            print(f"  {label:<20}: {surv}/{len(bucket)} survivent ({100*surv/len(bucket):.0f}%)")


# ============================================================
# H22: FIRST MESSAGE TIME OF DAY → OUTCOME
# ============================================================

print("\n" + "=" * 70)
print("  H22: HEURE DU 1ER MESSAGE → RÉSULTAT DE LA CONVO")
print("=" * 70)

# Tinder
print(f"\n  TINDER — Heure de ton 1er message → longueur de convo:")
t_hour_data = []
for convo in tinder_messages:
    msgs = convo.get('messages', [])
    if not msgs:
        continue
    first_ts = parse_rfc(msgs[0].get('sent_date', ''))
    if first_ts:
        t_hour_data.append({
            'hour': first_ts.hour,
            'total': len(msgs),
        })

if t_hour_data:
    slots = [
        ('Matin (6-11h)', range(6, 12)),
        ('Midi (12-14h)', range(12, 15)),
        ('Après-midi (15-18h)', range(15, 19)),
        ('Soirée (19-22h)', range(19, 23)),
        ('Nuit (23-5h)', list(range(23, 24)) + list(range(0, 6))),
    ]
    print(f"\n  {'Créneau':<25} {'N':>4} {'Msgs moy':>10} {'Ghost≤2':>8} {'Long≥11':>8}")
    for label, hours in slots:
        bucket = [x for x in t_hour_data if x['hour'] in hours]
        if bucket:
            avg = sum(x['total'] for x in bucket) / len(bucket)
            ghost = sum(1 for x in bucket if x['total'] <= 2) / len(bucket) * 100
            long_pct = sum(1 for x in bucket if x['total'] >= 11) / len(bucket) * 100
            print(f"  {label:<25} {len(bucket):>4} {avg:>10.1f} {ghost:>7.0f}% {long_pct:>7.0f}%")

# Hinge
print(f"\n  HINGE — Heure du 1er chat → longueur:")
h_hour_data = []
for m in hinge_matches:
    chats = m.get('chats', [])
    if chats:
        ts = parse_ts(chats[0]['timestamp'])
        if ts:
            h_hour_data.append({
                'hour': ts.hour,
                'total': len(chats),
            })

if h_hour_data:
    print(f"\n  {'Créneau':<25} {'N':>4} {'Msgs moy':>10} {'Ghost≤3':>8} {'Long≥16':>8}")
    for label, hours in slots:
        bucket = [x for x in h_hour_data if x['hour'] in hours]
        if bucket:
            avg = sum(x['total'] for x in bucket) / len(bucket)
            ghost = sum(1 for x in bucket if x['total'] <= 3) / len(bucket) * 100
            long_pct = sum(1 for x in bucket if x['total'] >= 16) / len(bucket) * 100
            print(f"  {label:<25} {len(bucket):>4} {avg:>10.1f} {ghost:>7.0f}% {long_pct:>7.0f}%")


# ============================================================
# H23: SIMULTANEOUS ACTIVE CONVERSATIONS
# ============================================================

print("\n" + "=" * 70)
print("  H23: CONVOS SIMULTANÉES — LA QUALITÉ BAISSE QUAND TU JONGLE?")
print("=" * 70)

# Tinder: count how many different conversations you're messaging on each day
print(f"\n  TINDER — Nombre de convos actives par jour vs qualité:")

# Build day → list of convos active that day
day_convos = defaultdict(list)
convo_details = {}
for idx, convo in enumerate(tinder_messages):
    msgs = convo.get('messages', [])
    total = len(msgs)
    convo_details[idx] = total
    for msg in msgs:
        ts = parse_rfc(msg.get('sent_date', ''))
        if ts:
            day = ts.strftime('%Y-%m-%d')
            if idx not in [c_idx for c_idx, _ in day_convos[day]]:
                day_convos[day].append((idx, total))

# Days with 1 active convo vs 2+ active convos
print(f"  Jours avec messages: {len(day_convos)}")
single_convo_days = {d: v for d, v in day_convos.items() if len(v) == 1}
multi_convo_days = {d: v for d, v in day_convos.items() if len(v) >= 2}
print(f"  1 convo active: {len(single_convo_days)} jours")
print(f"  2+ convos actives: {len(multi_convo_days)} jours")

# Average convo length for conversations that are part of multi-convo days vs single
multi_convo_ids = set()
single_convo_ids = set()
for d, convos in multi_convo_days.items():
    for c_idx, _ in convos:
        multi_convo_ids.add(c_idx)
for d, convos in single_convo_days.items():
    for c_idx, _ in convos:
        if c_idx not in multi_convo_ids:
            single_convo_ids.add(c_idx)

multi_totals = [convo_details[i] for i in multi_convo_ids if i in convo_details]
single_totals = [convo_details[i] for i in single_convo_ids if i in convo_details]

if multi_totals and single_totals:
    m_avg = sum(multi_totals) / len(multi_totals)
    s_avg = sum(single_totals) / len(single_totals)
    print(f"\n  Convos qui ont eu des jours multi-convo: {len(multi_totals)}, avg {m_avg:.1f} msgs")
    print(f"  Convos exclusivement mono-convo: {len(single_totals)}, avg {s_avg:.1f} msgs")
    diff = ((m_avg - s_avg) / max(0.01, s_avg)) * 100
    print(f"  Δ: {diff:+.0f}%")

# Usage: total msgs sent on days with 0,1,2,3+ active convos
print(f"\n  Usage — Jours par nombre de convos actives:")
convo_count_bkts = [
    ('0 convos actives', lambda d: len(day_convos.get(d, [])) == 0),
    ('1 convo', lambda d: len(day_convos.get(d, [])) == 1),
    ('2 convos', lambda d: len(day_convos.get(d, [])) == 2),
    ('3+ convos', lambda d: len(day_convos.get(d, [])) >= 3),
]
print(f"  {'Catégorie':<20} {'Jours':>6} {'Sent':>6} {'Rcvd':>6} {'Ratio R/S':>10}")
for label, pred in convo_count_bkts:
    days = [d for d in sorted_days if pred(d)]
    s = sum(daily[d]['msgs_sent'] for d in days)
    r = sum(daily[d]['msgs_rcvd'] for d in days)
    ratio = r / max(1, s)
    print(f"  {label:<20} {len(days):>6} {s:>6} {r:>6} {ratio:>9.2f}")


# ============================================================
# H24: MESSAGE LENGTH EVOLUTION
# ============================================================

print("\n" + "=" * 70)
print("  H24: ÉVOLUTION LONGUEUR DES MESSAGES → SIGNAL DE DÉSINTÉRÊT?")
print("=" * 70)

# Tinder: track message length over the course of each conversation
print(f"\n  TINDER — Tes messages deviennent-ils plus courts au fil de la convo?")

# For conversations with 5+ messages, compare first half vs second half avg length
long_enough = []
for convo in tinder_messages:
    msgs = convo.get('messages', [])
    if len(msgs) < 5:
        continue
    lengths = [len(m.get('message', '')) for m in msgs]
    half = len(lengths) // 2
    first_half = sum(lengths[:half]) / half
    second_half = sum(lengths[half:]) / (len(lengths) - half)
    evolution = ((second_half - first_half) / max(1, first_half)) * 100

    long_enough.append({
        'total': len(msgs),
        'first_half_avg': first_half,
        'second_half_avg': second_half,
        'evolution': evolution,
        'grows': evolution > 10,
        'shrinks': evolution < -10,
        'stable': -10 <= evolution <= 10,
    })

if long_enough:
    grows = [c for c in long_enough if c['grows']]
    shrinks = [c for c in long_enough if c['shrinks']]
    stable = [c for c in long_enough if c['stable']]

    print(f"\n  Convos avec ≥5 msgs: {len(long_enough)}")
    print(f"  Messages s'allongent (>+10%): {len(grows)} convos, avg total: {sum(c['total'] for c in grows)/max(1,len(grows)):.0f} msgs")
    print(f"  Messages raccourcissent (<-10%): {len(shrinks)} convos, avg total: {sum(c['total'] for c in shrinks)/max(1,len(shrinks)):.0f} msgs")
    print(f"  Stable (±10%): {len(stable)} convos, avg total: {sum(c['total'] for c in stable)/max(1,len(stable)):.0f} msgs")

    # Does the evolution predict long convos?
    for cat_label, cat_list in [('S\'allongent', grows), ('Raccourcissent', shrinks), ('Stable', stable)]:
        if cat_list:
            long_pct = sum(1 for c in cat_list if c['total'] >= 11) / len(cat_list) * 100
            avg_tot = sum(c['total'] for c in cat_list) / len(cat_list)
            print(f"\n  {cat_label}: {len(cat_list)} convos")
            print(f"    Avg total msgs: {avg_tot:.0f}, % long (≥11): {long_pct:.0f}%")
            print(f"    Avg 1ère moitié: {sum(c['first_half_avg'] for c in cat_list)/len(cat_list):.0f}c → 2ème moitié: {sum(c['second_half_avg'] for c in cat_list)/len(cat_list):.0f}c")

# Hinge: same analysis
print(f"\n  HINGE — Évolution longueur des messages par convo:")
h_long_enough = []
for m in hinge_matches:
    chats = m.get('chats', [])
    if len(chats) < 10:
        continue
    lengths = [len(c.get('body', '')) for c in chats]
    half = len(lengths) // 2
    first_half = sum(lengths[:half]) / half
    second_half = sum(lengths[half:]) / (len(lengths) - half)
    evolution = ((second_half - first_half) / max(1, first_half)) * 100

    h_long_enough.append({
        'total': len(chats),
        'first_half_avg': first_half,
        'second_half_avg': second_half,
        'evolution': evolution,
    })

if h_long_enough:
    h_grows = [c for c in h_long_enough if c['evolution'] > 10]
    h_shrinks = [c for c in h_long_enough if c['evolution'] < -10]
    h_stable = [c for c in h_long_enough if -10 <= c['evolution'] <= 10]

    print(f"  Convos Hinge ≥10 msgs: {len(h_long_enough)}")
    print(f"  S'allongent: {len(h_grows)}, avg {sum(c['total'] for c in h_grows)/max(1,len(h_grows)):.0f} msgs")
    print(f"  Raccourcissent: {len(h_shrinks)}, avg {sum(c['total'] for c in h_shrinks)/max(1,len(h_shrinks)):.0f} msgs")
    print(f"  Stable: {len(h_stable)}, avg {sum(c['total'] for c in h_stable)/max(1,len(h_stable)):.0f} msgs")

    # Show the evolution for each
    print(f"\n  {'Total msgs':>10} {'1ère moitié':>12} {'2ème moitié':>12} {'Évolution':>10}")
    for c in sorted(h_long_enough, key=lambda x: -x['total']):
        arrow = '↗️' if c['evolution'] > 10 else '↘️' if c['evolution'] < -10 else '→'
        print(f"  {c['total']:>10} {c['first_half_avg']:>10.0f}c {c['second_half_avg']:>10.0f}c {c['evolution']:>+9.0f}% {arrow}")


# ============================================================
# SYNTHÈSE
# ============================================================

print("\n" + "=" * 70)
print("  SYNTHÈSE H20-H24")
print("=" * 70)

print(f"""
  H20: DOUBLE-TEXT / RELANCE
  ──────────────────────────
  Double-texts (<30min): {len(dt_yes)} convos avec, {len(dt_no)} sans.
  Relances (>24h gap): {len(rl_yes)} convos avec, {len(rl_no)} sans.
  Post-DT: {dt_outcomes.get('continued',0)} continued, {dt_outcomes.get('died',0)} died.
  Post-relance: {rl_outcomes.get('continued',0)} continued, {rl_outcomes.get('died',0)} died.

  H21: REVIVAL APRÈS SILENCE
  ──────────────────────────
  Tinder: {len(revival_convos)} convos testées.
  Hinge: {len(hinge_revivals)} convos testées.

  H22: HEURE DU 1ER MESSAGE
  ─────────────────────────
  Tinder: {len(t_hour_data)} convos avec timestamp.
  Hinge: {len(h_hour_data)} convos avec timestamp.

  H23: CONVOS SIMULTANÉES
  ───────────────────────
  {len(multi_convo_days)} jours multi-convo, {len(single_convo_days)} jours mono.

  H24: ÉVOLUTION LONGUEUR
  ───────────────────────
  Tinder: {len(long_enough)} convos analysées (≥5 msgs).
  Hinge: {len(h_long_enough)} convos analysées (≥10 msgs).
""")
