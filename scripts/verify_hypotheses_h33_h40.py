"""
Hypotheses H33-H40: Advanced conversation pattern analysis
H33: Emoji density throughout convo → outcome
H34: Your response speed (gap between consecutive msgs) → outcome
H35: First 3 messages as early-warning predictor
H36: Hinge unmatch/block timing analysis
H37: Message length mirroring (Hinge — has all messages)
H38: Social sharing (Instagram/URL detection) → outcome
H39: Night owl convos (23h-5h messages) → different outcomes
H40: Opener reuse/template detection → ghost rate
"""

import json
import os
import re
import sys
import math
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from difflib import SequenceMatcher

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TINDER_PATH = os.path.join(SCRIPT_DIR, '..', 'Personal', 'Tinder', 'data.json')
HINGE_PATH = os.path.join(os.path.expanduser('~'), 'Downloads', 'export', 'matches.json')

with open(TINDER_PATH, 'r', encoding='utf-8') as f:
    tinder = json.load(f)

with open(HINGE_PATH, 'r', encoding='utf-8') as f:
    hinge_data = json.load(f)

tinder_messages = tinder['Messages']


def parse_ts(ts_str):
    for fmt in ['%Y-%m-%d %H:%M:%S', '%a, %d %b %Y %H:%M:%S GMT',
                '%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S%z']:
        try:
            return datetime.strptime(ts_str, fmt)
        except (ValueError, TypeError):
            pass
    return None


EMOJI_PATTERN = re.compile(
    r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF'
    r'\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0000FE00-\U0000FE0F'
    r'\U0001F900-\U0001F9FF\U0001FA00-\U0001FA6F\U0001FA70-\U0001FAFF'
    r'\U00002600-\U000026FF\U00002700-\U000027BF]'
)


def count_emojis(text):
    return len(EMOJI_PATTERN.findall(text))


def decode_html(text):
    text = text.replace('&rsquo;', "'").replace('&amp;', '&')
    text = text.replace('&eacute;', 'e').replace('&egrave;', 'e')
    text = text.replace('&agrave;', 'a').replace('&ccedil;', 'c')
    text = text.replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>')
    return text


# ============================================================
# BUILD CONVOS
# ============================================================

# Tinder convos (your messages only)
tinder_convos = []
for convo in tinder_messages:
    msgs = convo.get('messages', [])
    if not msgs:
        continue
    parsed = []
    for m in msgs:
        ts = parse_ts(m.get('sent_date', ''))
        if ts:
            text = decode_html(m.get('message', ''))
            parsed.append({'text': text, 'ts': ts})
    if parsed:
        parsed.sort(key=lambda x: x['ts'])
        tinder_convos.append(parsed)

# Hinge convos (all messages, no sender info)
hinge_convos = []
hinge_raw = []  # Keep raw entries for block analysis
for entry in hinge_data:
    if entry.get('match'):
        chats = entry.get('chats', [])
        if chats:
            parsed = []
            for c in chats:
                ts = parse_ts(c.get('timestamp', ''))
                if ts:
                    parsed.append({'text': c.get('body', ''), 'ts': ts})
            if parsed:
                parsed.sort(key=lambda x: x['ts'])
                hinge_convos.append(parsed)
                hinge_raw.append(entry)

print(f"Tinder: {len(tinder_convos)} convos, Hinge: {len(hinge_convos)} convos")

# ============================================================
# H33: EMOJI DENSITY
# ============================================================
print("\n" + "=" * 70)
print("  H33: EMOJI DENSITY -> OUTCOME")
print("=" * 70)

for app_name, convos, ghost_th in [("TINDER", tinder_convos, 2), ("HINGE", hinge_convos, 3)]:
    print(f"\n  {app_name} -- Emojis dans tes messages -> resultat:")

    emoji_data = []
    for msgs in convos:
        total_emojis = sum(count_emojis(m['text']) for m in msgs)
        n_msgs = len(msgs)
        density = total_emojis / n_msgs if n_msgs > 0 else 0
        is_ghost = n_msgs <= ghost_th
        emoji_data.append({
            'total': total_emojis,
            'density': density,
            'n_msgs': n_msgs,
            'ghost': is_ghost,
            'has_emoji_opener': count_emojis(msgs[0]['text']) > 0
        })

    # By opener emoji
    with_emoji_opener = [d for d in emoji_data if d['has_emoji_opener']]
    without_emoji_opener = [d for d in emoji_data if not d['has_emoji_opener']]

    if with_emoji_opener and without_emoji_opener:
        avg_with = sum(d['n_msgs'] for d in with_emoji_opener) / len(with_emoji_opener)
        ghost_with = sum(1 for d in with_emoji_opener if d['ghost']) / len(with_emoji_opener)
        avg_without = sum(d['n_msgs'] for d in without_emoji_opener) / len(without_emoji_opener)
        ghost_without = sum(1 for d in without_emoji_opener if d['ghost']) / len(without_emoji_opener)
        print(f"  Emoji dans opener:  N={len(with_emoji_opener):>3}, Msgs moy={avg_with:>6.1f}, Ghost={ghost_with:>5.0%}")
        print(f"  Sans emoji opener:  N={len(without_emoji_opener):>3}, Msgs moy={avg_without:>6.1f}, Ghost={ghost_without:>5.0%}")

    # By density bucket (convos >= 3 msgs only)
    long_convos = [d for d in emoji_data if d['n_msgs'] >= 3]
    if long_convos:
        buckets = [("0 emoji", 0, 0.001), ("Faible (<0.3/msg)", 0.001, 0.3),
                   ("Moyen (0.3-0.7)", 0.3, 0.7), ("Fort (>0.7/msg)", 0.7, 99)]
        print(f"\n  Densite emojis (convos >=3 msgs):")
        print(f"  {'Bucket':<25} {'N':>4} {'Msgs moy':>10}")
        for label, lo, hi in buckets:
            bucket = [d for d in long_convos if lo <= d['density'] < hi]
            if bucket:
                avg = sum(d['n_msgs'] for d in bucket) / len(bucket)
                print(f"  {label:<25} {len(bucket):>4} {avg:>10.1f}")


# ============================================================
# H34: RESPONSE SPEED (YOUR GAPS)
# ============================================================
print("\n" + "=" * 70)
print("  H34: VITESSE DE REPONSE (GAPS ENTRE TES MSGS)")
print("=" * 70)

for app_name, convos, ghost_th, min_msgs in [("TINDER", tinder_convos, 2, 3), ("HINGE", hinge_convos, 3, 5)]:
    print(f"\n  {app_name} -- Gap median entre tes messages -> resultat:")

    gap_data = []
    for msgs in convos:
        if len(msgs) < min_msgs:
            continue
        gaps = []
        for i in range(1, len(msgs)):
            delta = (msgs[i]['ts'] - msgs[i-1]['ts']).total_seconds() / 3600  # hours
            if delta > 0:
                gaps.append(delta)
        if gaps:
            median_gap = sorted(gaps)[len(gaps)//2]
            gap_data.append({
                'median_gap_h': median_gap,
                'n_msgs': len(msgs),
                'ghost': len(msgs) <= ghost_th
            })

    if gap_data:
        buckets = [("Rapide (<1h)", 0, 1), ("Normal (1-6h)", 1, 6),
                   ("Lent (6-24h)", 6, 24), ("Tres lent (24h+)", 24, 99999)]
        print(f"  {'Bucket':<25} {'N':>4} {'Msgs moy':>10} {'Gap median':>12}")
        for label, lo, hi in buckets:
            bucket = [d for d in gap_data if lo <= d['median_gap_h'] < hi]
            if bucket:
                avg_msgs = sum(d['n_msgs'] for d in bucket) / len(bucket)
                avg_gap = sum(d['median_gap_h'] for d in bucket) / len(bucket)
                print(f"  {label:<25} {len(bucket):>4} {avg_msgs:>10.1f} {avg_gap:>11.1f}h")


# ============================================================
# H35: EARLY WARNING PREDICTOR (FIRST 3 MSGS)
# ============================================================
print("\n" + "=" * 70)
print("  H35: PREDICTEUR EARLY-WARNING (3 PREMIERS MSGS)")
print("=" * 70)

for app_name, convos, ghost_th, long_th in [("TINDER", tinder_convos, 2, 11), ("HINGE", hinge_convos, 3, 16)]:
    print(f"\n  {app_name} -- Features des 3 premiers msgs -> prediction:")

    convos_3plus = [c for c in convos if len(c) >= 3]
    if not convos_3plus:
        print(f"  Pas assez de convos avec 3+ msgs")
        continue

    # Features from first 3 messages
    features = []
    for msgs in convos_3plus:
        first3 = msgs[:3]
        avg_len = sum(len(m['text']) for m in first3) / 3
        total_questions = sum(1 for m in first3 if '?' in m['text'])
        total_emojis = sum(count_emojis(m['text']) for m in first3)
        # Time spread of first 3 messages
        time_spread = (first3[2]['ts'] - first3[0]['ts']).total_seconds() / 3600

        # Is French?
        fr_words = {'salut', 'bonjour', 'coucou', 'comment', 'tu', 'toi', 'je', 'un', 'une',
                    'le', 'la', 'les', 'des', 'du', 'et', 'est', 'pas', 'pour', 'avec', 'ça'}
        words = set(' '.join(m['text'].lower() for m in first3).split())
        is_fr = len(words & fr_words) >= 2

        is_long = len(msgs) >= long_th
        is_ghost = len(msgs) <= ghost_th

        features.append({
            'avg_len': avg_len,
            'questions': total_questions,
            'emojis': total_emojis,
            'time_spread_h': time_spread,
            'is_fr': is_fr,
            'total_msgs': len(msgs),
            'is_long': is_long,
            'is_ghost': is_ghost
        })

    # Analyze each feature
    print(f"\n  Feature: Longueur moy des 3 premiers msgs")
    for label, lo, hi in [("<30c", 0, 30), ("30-60c", 30, 60), ("60-100c", 60, 100), ("100c+", 100, 9999)]:
        bucket = [f for f in features if lo <= f['avg_len'] < hi]
        if bucket:
            avg = sum(f['total_msgs'] for f in bucket) / len(bucket)
            long_pct = sum(1 for f in bucket if f['is_long']) / len(bucket)
            print(f"    {label:<12} N={len(bucket):>3}, Msgs moy={avg:>6.1f}, Long={long_pct:>5.0%}")

    print(f"\n  Feature: Questions dans les 3 premiers msgs")
    for q_count in range(4):
        label = f"{q_count} questions" if q_count < 3 else "3+ questions"
        if q_count < 3:
            bucket = [f for f in features if f['questions'] == q_count]
        else:
            bucket = [f for f in features if f['questions'] >= q_count]
        if bucket:
            avg = sum(f['total_msgs'] for f in bucket) / len(bucket)
            long_pct = sum(1 for f in bucket if f['is_long']) / len(bucket)
            print(f"    {label:<15} N={len(bucket):>3}, Msgs moy={avg:>6.1f}, Long={long_pct:>5.0%}")

    print(f"\n  Feature: Langue (FR vs non-FR)")
    for is_fr, label in [(True, "Francais"), (False, "Non-FR")]:
        bucket = [f for f in features if f['is_fr'] == is_fr]
        if bucket:
            avg = sum(f['total_msgs'] for f in bucket) / len(bucket)
            long_pct = sum(1 for f in bucket if f['is_long']) / len(bucket)
            print(f"    {label:<15} N={len(bucket):>3}, Msgs moy={avg:>6.1f}, Long={long_pct:>5.0%}")

    print(f"\n  Feature: Time spread des 3 premiers msgs")
    for label, lo, hi in [("<1h", 0, 1), ("1-12h", 1, 12), ("12-48h", 12, 48), ("48h+", 48, 99999)]:
        bucket = [f for f in features if lo <= f['time_spread_h'] < hi]
        if bucket:
            avg = sum(f['total_msgs'] for f in bucket) / len(bucket)
            long_pct = sum(1 for f in bucket if f['is_long']) / len(bucket)
            print(f"    {label:<12} N={len(bucket):>3}, Msgs moy={avg:>6.1f}, Long={long_pct:>5.0%}")

    # Combined predictor: FR + question + medium length
    print(f"\n  Predicteur combine (FR + >=1 question + >=50c avg):")
    good = [f for f in features if f['is_fr'] and f['questions'] >= 1 and f['avg_len'] >= 50]
    bad = [f for f in features if not (f['is_fr'] and f['questions'] >= 1 and f['avg_len'] >= 50)]
    if good:
        avg_g = sum(f['total_msgs'] for f in good) / len(good)
        long_g = sum(1 for f in good if f['is_long']) / len(good)
        print(f"    MATCH (FR+Q+50c): N={len(good):>3}, Msgs moy={avg_g:>6.1f}, Long={long_g:>5.0%}")
    if bad:
        avg_b = sum(f['total_msgs'] for f in bad) / len(bad)
        long_b = sum(1 for f in bad if f['is_long']) / len(bad)
        print(f"    NO MATCH:         N={len(bad):>3}, Msgs moy={avg_b:>6.1f}, Long={long_b:>5.0%}")


# ============================================================
# H36: HINGE UNMATCH/BLOCK TIMING
# ============================================================
print("\n" + "=" * 70)
print("  H36: HINGE UNMATCH/BLOCK TIMING")
print("=" * 70)

blocks = []
no_blocks = []
for entry in hinge_data:
    if entry.get('match'):
        block_list = entry.get('block', [])
        chats = entry.get('chats', [])
        n_msgs = len(chats)

        if block_list:
            # Parse block timestamp
            block_ts = None
            for b in block_list:
                ts = parse_ts(b.get('timestamp', ''))
                if ts:
                    block_ts = ts
                    break

            # Parse first and last chat timestamps
            first_chat_ts = None
            last_chat_ts = None
            if chats:
                first_chat_ts = parse_ts(chats[0].get('timestamp', ''))
                last_chat_ts = parse_ts(chats[-1].get('timestamp', ''))

            blocks.append({
                'n_msgs': n_msgs,
                'block_ts': block_ts,
                'first_chat_ts': first_chat_ts,
                'last_chat_ts': last_chat_ts,
                'block_type': block_list[0].get('type', 'unknown') if block_list else 'unknown'
            })
        else:
            no_blocks.append({'n_msgs': n_msgs})

print(f"\n  Hinge matchs avec block: {len(blocks)}/{len(blocks)+len(no_blocks)}")
print(f"  Hinge matchs sans block: {len(no_blocks)}")

if blocks:
    # Block types
    type_counts = Counter(b['block_type'] for b in blocks)
    print(f"\n  Types de block:")
    for t, c in type_counts.most_common():
        print(f"    {t}: {c}")

    # Block timing
    print(f"\n  Timing du block (jours apres 1er message):")
    timed_blocks = []
    for b in blocks:
        if b['block_ts'] and b['last_chat_ts']:
            days = (b['block_ts'] - b['last_chat_ts']).total_seconds() / 86400
            timed_blocks.append((days, b['n_msgs']))

    if timed_blocks:
        for label, lo, hi in [("<1 jour", -999, 1), ("1-7 jours", 1, 7),
                               ("1-4 semaines", 7, 28), ("1+ mois", 28, 9999)]:
            bucket = [(d, n) for d, n in timed_blocks if lo <= d < hi]
            if bucket:
                avg_msgs = sum(n for _, n in bucket) / len(bucket)
                print(f"    {label:<20} N={len(bucket):>3}, Msgs moy avant block={avg_msgs:>6.1f}")

    # Block by convo length
    print(f"\n  Block par longueur de convo:")
    for label, lo, hi in [("0-3 msgs", 0, 4), ("4-15 msgs", 4, 16),
                           ("16-50 msgs", 16, 51), ("50+ msgs", 51, 9999)]:
        all_in_range = [b for b in blocks if lo <= b['n_msgs'] < hi]
        no_block_range = [b for b in no_blocks if lo <= b['n_msgs'] < hi]
        total = len(all_in_range) + len(no_block_range)
        if total > 0:
            pct = len(all_in_range) / total * 100
            print(f"    {label:<15} Block={len(all_in_range):>3}, Pas block={len(no_block_range):>3}, Block%={pct:>5.1f}%")


# ============================================================
# H37: MESSAGE LENGTH MIRRORING (HINGE)
# ============================================================
print("\n" + "=" * 70)
print("  H37: MESSAGE MIRRORING (HINGE — longueur msgs consecutifs)")
print("=" * 70)

# On Hinge we have all messages but no sender info
# We can measure similarity in consecutive message lengths
mirror_data = []
for msgs in hinge_convos:
    if len(msgs) < 6:
        continue

    ratios = []
    for i in range(1, len(msgs)):
        len1 = max(len(msgs[i-1]['text']), 1)
        len2 = max(len(msgs[i]['text']), 1)
        ratio = min(len1, len2) / max(len1, len2)  # 0-1, 1 = perfect mirror
        ratios.append(ratio)

    avg_mirror = sum(ratios) / len(ratios)
    mirror_data.append({
        'mirror_score': avg_mirror,
        'n_msgs': len(msgs)
    })

if mirror_data:
    print(f"\n  Hinge -- Score de mirroring (0=divergent, 1=identique) -> longueur convo:")
    buckets = [("Faible (<0.3)", 0, 0.3), ("Moyen (0.3-0.5)", 0.3, 0.5),
               ("Fort (0.5-0.7)", 0.5, 0.7), ("Tres fort (>0.7)", 0.7, 1.1)]
    print(f"  {'Bucket':<25} {'N':>4} {'Msgs moy':>10} {'Mirror moy':>12}")
    for label, lo, hi in buckets:
        bucket = [d for d in mirror_data if lo <= d['mirror_score'] < hi]
        if bucket:
            avg_msgs = sum(d['n_msgs'] for d in bucket) / len(bucket)
            avg_mirror = sum(d['mirror_score'] for d in bucket) / len(bucket)
            print(f"  {label:<25} {len(bucket):>4} {avg_msgs:>10.1f} {avg_mirror:>12.2f}")


# ============================================================
# H38: SOCIAL SHARING (INSTAGRAM/URL)
# ============================================================
print("\n" + "=" * 70)
print("  H38: PARTAGE SOCIAL (INSTAGRAM, URL, NUMERO)")
print("=" * 70)

SOCIAL_PATTERNS = {
    'instagram': re.compile(r'(instagram|insta|@\w{3,}|ig\b)', re.I),
    'url': re.compile(r'https?://|www\.', re.I),
    'numero': re.compile(r'(\b0[67]\d{8}\b|\+33|\b\d{10}\b)'),
    'snapchat': re.compile(r'(snapchat|snap\b|sc\b)', re.I),
    'whatsapp': re.compile(r'(whatsapp|whats\s*app)', re.I),
}

for app_name, convos, ghost_th in [("TINDER", tinder_convos, 2), ("HINGE", hinge_convos, 3)]:
    print(f"\n  {app_name} -- Partage social detecte -> resultat:")

    social_data = defaultdict(lambda: {'with': [], 'without': []})

    for msgs in convos:
        all_text = ' '.join(m['text'].lower() for m in msgs)
        n_msgs = len(msgs)

        for social, pattern in SOCIAL_PATTERNS.items():
            if pattern.search(all_text):
                social_data[social]['with'].append(n_msgs)
            else:
                social_data[social]['without'].append(n_msgs)

    any_social = any(len(social_data[s]['with']) > 0 for s in social_data)
    if any_social:
        print(f"  {'Type':<15} {'N avec':>8} {'Msgs moy':>10} {'N sans':>8} {'Msgs moy':>10}")
        for social in ['instagram', 'numero', 'snapchat', 'whatsapp', 'url']:
            w = social_data[social]['with']
            wo = social_data[social]['without']
            if w:
                avg_w = sum(w) / len(w)
                avg_wo = sum(wo) / len(wo) if wo else 0
                print(f"  {social:<15} {len(w):>8} {avg_w:>10.1f} {len(wo):>8} {avg_wo:>10.1f}")
    else:
        print(f"  Aucun partage social detecte")


# ============================================================
# H39: NIGHT OWL CONVOS
# ============================================================
print("\n" + "=" * 70)
print("  H39: NIGHT OWL — MESSAGES 23h-5h vs RESTE")
print("=" * 70)

for app_name, convos, ghost_th in [("TINDER", tinder_convos, 2), ("HINGE", hinge_convos, 3)]:
    print(f"\n  {app_name} -- Convos avec messages nocturnes (23h-5h):")

    night_convos = []
    day_convos = []

    for msgs in convos:
        has_night = any(m['ts'].hour >= 23 or m['ts'].hour < 5 for m in msgs)
        n_msgs = len(msgs)
        if has_night:
            night_convos.append(n_msgs)
        else:
            day_convos.append(n_msgs)

    if night_convos:
        avg_n = sum(night_convos) / len(night_convos)
        ghost_n = sum(1 for n in night_convos if n <= ghost_th) / len(night_convos)
        print(f"  Avec msgs nocturnes:  N={len(night_convos):>3}, Msgs moy={avg_n:>6.1f}, Ghost={ghost_n:>5.0%}")
    if day_convos:
        avg_d = sum(day_convos) / len(day_convos)
        ghost_d = sum(1 for n in day_convos if n <= ghost_th) / len(day_convos)
        print(f"  Sans msgs nocturnes:  N={len(day_convos):>3}, Msgs moy={avg_d:>6.1f}, Ghost={ghost_d:>5.0%}")

    # Proportion of night messages in long vs short convos
    long_convos = [c for c in convos if len(c) >= ghost_th + 1]
    short_convos = [c for c in convos if len(c) <= ghost_th]

    if long_convos:
        night_pct_long = sum(1 for m in [msg for c in long_convos for msg in c] if m['ts'].hour >= 23 or m['ts'].hour < 5) / sum(len(c) for c in long_convos) * 100
        night_pct_short = sum(1 for m in [msg for c in short_convos for msg in c] if m['ts'].hour >= 23 or m['ts'].hour < 5) / max(sum(len(c) for c in short_convos), 1) * 100
        print(f"  % msgs nocturnes dans convos longues: {night_pct_long:.1f}%")
        print(f"  % msgs nocturnes dans convos ghost:   {night_pct_short:.1f}%")


# ============================================================
# H40: OPENER REUSE / TEMPLATE DETECTION
# ============================================================
print("\n" + "=" * 70)
print("  H40: REUTILISATION D'OPENER / TEMPLATES")
print("=" * 70)

# Tinder only (we know all openers are from "You")
openers = []
for msgs in tinder_convos:
    text = decode_html(msgs[0]['text']).strip().lower()
    openers.append({
        'text': text,
        'raw': decode_html(msgs[0]['text']).strip(),
        'n_msgs': len(msgs),
        'ghost': len(msgs) <= 2
    })

# Find similar openers using SequenceMatcher
print(f"\n  TINDER -- Detection de templates d'opener ({len(openers)} openers):")

# Group by similarity
templates = []
used = set()
for i in range(len(openers)):
    if i in used:
        continue
    group = [i]
    for j in range(i+1, len(openers)):
        if j in used:
            continue
        sim = SequenceMatcher(None, openers[i]['text'], openers[j]['text']).ratio()
        if sim > 0.5:  # >50% similar
            group.append(j)
            used.add(j)
    used.add(i)
    if len(group) > 1:
        templates.append(group)

if templates:
    print(f"\n  Templates detectes (>50% similarite):")
    for idx, group in enumerate(templates):
        msgs_list = [openers[i]['n_msgs'] for i in group]
        ghosts = sum(1 for i in group if openers[i]['ghost'])
        avg = sum(msgs_list) / len(msgs_list)
        examples = [openers[group[0]]['raw'][:50], openers[group[1]]['raw'][:50]]
        print(f"  Template #{idx+1} ({len(group)} uses): Ghost={ghosts}/{len(group)}, Msgs moy={avg:.1f}")
        for ex in examples:
            print(f"    - \"{ex}...\"" if len(ex) == 50 else f"    - \"{ex}\"")
else:
    print(f"  Aucun template detecte (tous les openers sont uniques)")

# Unique vs template
template_indices = set()
for group in templates:
    template_indices.update(group)
unique_openers = [o for i, o in enumerate(openers) if i not in template_indices]
template_openers = [o for i, o in enumerate(openers) if i in template_indices]

if template_openers:
    avg_t = sum(o['n_msgs'] for o in template_openers) / len(template_openers)
    ghost_t = sum(1 for o in template_openers if o['ghost']) / len(template_openers)
    print(f"\n  Openers template:  N={len(template_openers):>3}, Msgs moy={avg_t:>6.1f}, Ghost={ghost_t:>5.0%}")
if unique_openers:
    avg_u = sum(o['n_msgs'] for o in unique_openers) / len(unique_openers)
    ghost_u = sum(1 for o in unique_openers if o['ghost']) / len(unique_openers)
    print(f"  Openers uniques:   N={len(unique_openers):>3}, Msgs moy={avg_u:>6.1f}, Ghost={ghost_u:>5.0%}")

# Also check: "Hey/Hello [name]" pattern
greeting_pattern = re.compile(r'^(hey|hello|salut|bonjour|coucou)\s+\w+', re.I)
greeting_openers = [o for o in openers if greeting_pattern.match(o['text'])]
non_greeting = [o for o in openers if not greeting_pattern.match(o['text'])]

if greeting_openers and non_greeting:
    avg_g = sum(o['n_msgs'] for o in greeting_openers) / len(greeting_openers)
    ghost_g = sum(1 for o in greeting_openers if o['ghost']) / len(greeting_openers)
    avg_ng = sum(o['n_msgs'] for o in non_greeting) / len(non_greeting)
    ghost_ng = sum(1 for o in non_greeting if o['ghost']) / len(non_greeting)
    print(f"\n  Pattern 'Hey/Hello [prenom]...':")
    print(f"    Avec greeting:  N={len(greeting_openers):>3}, Msgs moy={avg_g:>6.1f}, Ghost={ghost_g:>5.0%}")
    print(f"    Sans greeting:  N={len(non_greeting):>3}, Msgs moy={avg_ng:>6.1f}, Ghost={ghost_ng:>5.0%}")


# ============================================================
# SYNTHESE
# ============================================================
print("\n" + "=" * 70)
print("  SYNTHESE H33-H40")
print("=" * 70)
print("\n  Resultats complets ci-dessus.")
