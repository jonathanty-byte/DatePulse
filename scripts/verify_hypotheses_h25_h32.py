"""
Hypotheses H25-H32: Advanced conversation analysis
"""

import json
import os
import re
from datetime import datetime, timedelta
from collections import defaultdict, Counter

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

def parse_ts(ts_str):
    for fmt in ['%Y-%m-%d %H:%M:%S', '%a, %d %b %Y %H:%M:%S GMT',
                '%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S%z']:
        try:
            return datetime.strptime(ts_str, fmt)
        except (ValueError, TypeError):
            pass
    return None

# Build Tinder convos (your messages only)
tinder_convos = []
for convo in tinder_messages:
    msgs = convo.get('messages', [])
    if not msgs:
        continue
    parsed = []
    for m in msgs:
        ts = parse_ts(m.get('sent_date', ''))
        if ts:
            parsed.append({
                'text': m.get('message', ''),
                'ts': ts
            })
    if parsed:
        parsed.sort(key=lambda x: x['ts'])
        tinder_convos.append(parsed)

# Build Hinge convos
hinge_convos = []
for entry in hinge_data:
    if entry.get('match'):
        chats = entry.get('chats', [])
        if chats:
            parsed = []
            for c in chats:
                ts = parse_ts(c.get('timestamp', ''))
                if ts:
                    parsed.append({
                        'text': c.get('body', ''),
                        'ts': ts
                    })
            if parsed:
                parsed.sort(key=lambda x: x['ts'])
                hinge_convos.append(parsed)

# Hinge match dates
hinge_match_dates = []
for entry in hinge_data:
    if entry.get('match'):
        chats = entry.get('chats', [])
        if chats:
            ts = parse_ts(chats[0].get('timestamp', ''))
            if ts:
                hinge_match_dates.append(ts.strftime('%Y-%m-%d'))
        else:
            blocks = entry.get('block', [])
            if blocks:
                ts = parse_ts(blocks[0].get('timestamp', ''))
                if ts:
                    hinge_match_dates.append(ts.strftime('%Y-%m-%d'))

print(f"Tinder: {len(tinder_convos)} convos, Hinge: {len(hinge_convos)} convos")
print()

# ============================================================
print("=" * 70)
print("  H25: SUJETS DE CONVERSATION -> DUREE")
print("=" * 70)

topics = {
    "voyage": ["voyage", "voyager", "trip", "travel", "avion", "pays", "ile",
               "plage", "montagne", "nepal", "maurice", "italie", "espagne",
               "japon", "bali", "maroc", "portugal", "londres", "rome"],
    "bouffe": ["resto", "restaurant", "cuisine", "cuisiner", "manger", "bouffe",
               "brunch", "diner", "dejeuner", "recette", "plat", "sushi", "pizza",
               "burger", "cocktail", "vin", "bar", "apero", "terrasse", "chef"],
    "musique": ["musique", "music", "concert", "festival", "spotify", "chanson",
                "chanter", "guitare", "piano", "dj", "rap", "jazz", "rock"],
    "film_serie": ["film", "serie", "netflix", "cinema", "movie", "saison",
                   "episode", "regarder", "disney", "anime", "manga", "hbo"],
    "sport": ["sport", "gym", "yoga", "course", "courir", "running", "football",
              "tennis", "surf", "ski", "rando", "randonnee", "escalade", "velo"],
    "travail": ["travail", "boulot", "job", "bureau", "entreprise", "startup",
                "consultant", "dev", "freelance", "projet", "reunion", "carriere"],
    "humour": ["haha", "mdr", "lol", "ptdr", "drole", "blague", "humour", "marrant"],
    "animal": ["chien", "chienne", "whippet", "dog", "puppy", "chat", "cat",
               "animal", "balade", "parc", "promenade"],
    "soiree": ["soiree", "fete", "party", "sortir", "boite", "club", "danse"],
    "culture": ["livre", "lire", "lecture", "musee", "exposition", "expo",
                "theatre", "art", "peinture", "photo", "podcast"],
}

def normalize(text):
    """Remove accents roughly for matching"""
    return text.lower().replace("e'", "e").replace("e`", "e")

print("\n  TINDER -- Sujets dans tes messages -> longueur convo:")
print()
topic_stats = {}
for topic, keywords in topics.items():
    with_t = []
    without_t = []
    for convo in tinder_convos:
        all_text = " ".join(m['text'].lower() for m in convo)
        if any(kw in all_text for kw in keywords):
            with_t.append(len(convo))
        else:
            without_t.append(len(convo))
    if with_t and without_t:
        avg_w = sum(with_t) / len(with_t)
        avg_wo = sum(without_t) / len(without_t)
        delta = ((avg_w / avg_wo) - 1) * 100 if avg_wo > 0 else 0
        topic_stats[topic] = (len(with_t), avg_w, len(without_t), avg_wo, delta)

sorted_ts = sorted(topic_stats.items(), key=lambda x: -x[1][4])
print(f"  {'Sujet':<15} {'N avec':>7} {'Msgs moy':>10} {'N sans':>7} {'Msgs moy':>10} {'Delta':>8}")
for topic, (nw, aw, nwo, awo, d) in sorted_ts:
    print(f"  {topic:<15} {nw:>7} {aw:>10.1f} {nwo:>7} {awo:>10.1f} {d:>+7.0f}%")

print("\n  HINGE -- Sujets -> longueur convo:")
print()
topic_stats_h = {}
for topic, keywords in topics.items():
    with_t = []
    without_t = []
    for convo in hinge_convos:
        all_text = " ".join(m['text'].lower() for m in convo)
        if any(kw in all_text for kw in keywords):
            with_t.append(len(convo))
        else:
            without_t.append(len(convo))
    if with_t and without_t:
        avg_w = sum(with_t) / len(with_t)
        avg_wo = sum(without_t) / len(without_t)
        delta = ((avg_w / avg_wo) - 1) * 100 if avg_wo > 0 else 0
        topic_stats_h[topic] = (len(with_t), avg_w, len(without_t), avg_wo, delta)

sorted_th = sorted(topic_stats_h.items(), key=lambda x: -x[1][4])
print(f"  {'Sujet':<15} {'N avec':>7} {'Msgs moy':>10} {'N sans':>7} {'Msgs moy':>10} {'Delta':>8}")
for topic, (nw, aw, nwo, awo, d) in sorted_th:
    print(f"  {topic:<15} {nw:>7} {aw:>10.1f} {nwo:>7} {awo:>10.1f} {d:>+7.0f}%")


# ============================================================
print()
print("=" * 70)
print("  H26: LONGUEUR DE L'OPENER -> RESULTAT")
print("=" * 70)

opener_buckets = [
    ("Tres court (<20c)", 0, 20),
    ("Court (20-50c)", 20, 50),
    ("Moyen (50-100c)", 50, 100),
    ("Long (100-150c)", 100, 150),
    ("Tres long (150+c)", 150, 9999),
]

print("\n  TINDER -- Longueur du 1er message -> convo:")
print()
print(f"  {'Bucket':<22} {'N':>5} {'Msgs moy':>10} {'Ghost<=2':>10} {'Long>=11':>10}")
for label, lo, hi in opener_buckets:
    matching = []
    for convo in tinder_convos:
        first_msg = convo[0]['text']
        if lo <= len(first_msg) < hi:
            matching.append(len(convo))
    if matching:
        avg = sum(matching) / len(matching)
        ghost = sum(1 for m in matching if m <= 2) / len(matching) * 100
        long_pct = sum(1 for m in matching if m >= 11) / len(matching) * 100
        print(f"  {label:<22} {len(matching):>5} {avg:>10.1f} {ghost:>9.0f}% {long_pct:>9.0f}%")

print("\n  HINGE -- Longueur du 1er message -> convo:")
print()
print(f"  {'Bucket':<22} {'N':>5} {'Msgs moy':>10} {'Ghost<=3':>10} {'Long>=16':>10}")
for label, lo, hi in opener_buckets:
    matching = []
    for convo in hinge_convos:
        first_msg = convo[0]['text']
        if lo <= len(first_msg) < hi:
            matching.append(len(convo))
    if matching:
        avg = sum(matching) / len(matching)
        ghost = sum(1 for m in matching if m <= 3) / len(matching) * 100
        long_pct = sum(1 for m in matching if m >= 16) / len(matching) * 100
        print(f"  {label:<22} {len(matching):>5} {avg:>10.1f} {ghost:>9.0f}% {long_pct:>9.0f}%")


# ============================================================
print()
print("=" * 70)
print("  H27: NOMBRE DE QUESTIONS POSEES -> ENGAGEMENT")
print("=" * 70)

print("\n  TINDER -- Questions (?) dans tes msgs -> longueur convo:")
print()

q_data = []
for convo in tinder_convos:
    q_count = sum(1 for m in convo if '?' in m['text'])
    q_data.append((q_count, len(convo)))

q_buckets = [("0 questions", 0, 1), ("1-2 questions", 1, 3),
             ("3-5 questions", 3, 6), ("6-10 questions", 6, 11),
             ("11+ questions", 11, 999)]

print(f"  {'Bucket':<20} {'N':>5} {'Msgs moy':>10} {'Ghost<=2':>10}")
for label, lo, hi in q_buckets:
    matching = [n for q, n in q_data if lo <= q < hi]
    if matching:
        avg = sum(matching) / len(matching)
        ghost = sum(1 for m in matching if m <= 2) / len(matching) * 100
        print(f"  {label:<20} {len(matching):>5} {avg:>10.1f} {ghost:>9.0f}%")

# Question density
print("\n  Densite de questions (Q / total msgs, convos >=3 msgs):")
print()
density_data = []
for convo in tinder_convos:
    if len(convo) < 3:
        continue
    q_count = sum(1 for m in convo if '?' in m['text'])
    density = q_count / len(convo)
    density_data.append((density, len(convo)))

d_buckets = [("<10%", 0, 0.10), ("10-20%", 0.10, 0.20),
             ("20-40%", 0.20, 0.40), (">40%", 0.40, 1.01)]
print(f"  {'Densite':<15} {'N':>5} {'Msgs moy':>10}")
for label, lo, hi in d_buckets:
    matching = [n for d, n in density_data if lo <= d < hi]
    if matching:
        avg = sum(matching) / len(matching)
        print(f"  {label:<15} {len(matching):>5} {avg:>10.1f}")

# Hinge
print("\n  HINGE -- Questions -> longueur:")
print()
q_data_h = []
for convo in hinge_convos:
    q_count = sum(1 for m in convo if '?' in m.get('text', ''))
    q_data_h.append((q_count, len(convo)))

q_buckets_h = [("0-5", 0, 6), ("6-15", 6, 16), ("16-30", 16, 31), ("31+", 31, 999)]
print(f"  {'Bucket':<15} {'N':>5} {'Msgs moy':>10}")
for label, lo, hi in q_buckets_h:
    matching = [n for q, n in q_data_h if lo <= q < hi]
    if matching:
        avg = sum(matching) / len(matching)
        print(f"  {label:<15} {len(matching):>5} {avg:>10.1f}")


# ============================================================
print()
print("=" * 70)
print("  H28: JOUR DU 1ER MESSAGE -> RESULTAT")
print("=" * 70)

day_names = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

print("\n  TINDER -- Jour du 1er message -> longueur convo:")
print()
day_stats = defaultdict(list)
for convo in tinder_convos:
    dow = convo[0]['ts'].weekday()
    day_stats[dow].append(len(convo))

print(f"  {'Jour':<12} {'N':>5} {'Msgs moy':>10} {'Ghost<=2':>10} {'Long>=11':>10}")
for dow in range(7):
    msgs = day_stats.get(dow, [])
    if msgs:
        avg = sum(msgs) / len(msgs)
        ghost = sum(1 for m in msgs if m <= 2) / len(msgs) * 100
        long_pct = sum(1 for m in msgs if m >= 11) / len(msgs) * 100
        print(f"  {day_names[dow]:<12} {len(msgs):>5} {avg:>10.1f} {ghost:>9.0f}% {long_pct:>9.0f}%")

print("\n  HINGE -- Jour du 1er message -> longueur convo:")
print()
day_stats_h = defaultdict(list)
for convo in hinge_convos:
    dow = convo[0]['ts'].weekday()
    day_stats_h[dow].append(len(convo))

print(f"  {'Jour':<12} {'N':>5} {'Msgs moy':>10} {'Ghost<=3':>10} {'Long>=16':>10}")
for dow in range(7):
    msgs = day_stats_h.get(dow, [])
    if msgs:
        avg = sum(msgs) / len(msgs)
        ghost = sum(1 for m in msgs if m <= 3) / len(msgs) * 100
        long_pct = sum(1 for m in msgs if m >= 16) / len(msgs) * 100
        print(f"  {day_names[dow]:<12} {len(msgs):>5} {avg:>10.1f} {ghost:>9.0f}% {long_pct:>9.0f}%")


# ============================================================
print()
print("=" * 70)
print("  H29: VITESSE D'ESCALADE -- QUAND PROPOSES-TU LE DATE?")
print("=" * 70)

date_keywords = [
    "verre", "drink", "cafe", "coffee", "resto", "restaurant",
    "rencontrer", "voir", "rencontre", "rendez-vous", "rdv",
    "numero", "tel", "telephone", "phone",
    "insta", "instagram", "snap", "snapchat", "whatsapp",
    "on se voit", "on se retrouve", "on se rejoint",
    "dispo", "disponible", "libre",
]

print("\n  TINDER -- A quel message proposes-tu le date/echange?")
print()

escalation_data = []
for convo in tinder_convos:
    if len(convo) < 3:
        continue
    esc_msg = None
    for i, m in enumerate(convo):
        text_lower = m['text'].lower()
        if any(kw in text_lower for kw in date_keywords):
            esc_msg = i + 1
            break
    escalation_data.append({
        'total': len(convo), 'at': esc_msg, 'found': esc_msg is not None
    })

esc_yes = [e for e in escalation_data if e['found']]
esc_no = [e for e in escalation_data if not e['found']]

print(f"  Convos avec escalade detectee: {len(esc_yes)}/{len(escalation_data)}")
print(f"  Convos sans escalade: {len(esc_no)}")
if esc_yes:
    avg_at = sum(e['at'] for e in esc_yes) / len(esc_yes)
    print(f"  Message moyen de l'escalade: #{avg_at:.1f}")

    esc_buckets = [("Tot (msg 1-3)", 1, 4), ("Normal (msg 4-6)", 4, 7),
                   ("Tard (msg 7-10)", 7, 11), ("Tres tard (msg 11+)", 11, 999)]
    print()
    print(f"  {'Timing':<22} {'N':>5} {'Total msgs moy':>15}")
    for label, lo, hi in esc_buckets:
        matching = [e for e in esc_yes if lo <= e['at'] < hi]
        if matching:
            avg_total = sum(e['total'] for e in matching) / len(matching)
            print(f"  {label:<22} {len(matching):>5} {avg_total:>15.1f}")

if esc_no:
    avg_ne = sum(e['total'] for e in esc_no) / len(esc_no)
    print(f"  {'Sans escalade':<22} {len(esc_no):>5} {avg_ne:>15.1f}")

# Hinge
print("\n  HINGE -- Escalade:")
print()
esc_data_h = []
for convo in hinge_convos:
    if len(convo) < 3:
        continue
    esc_msg = None
    for i, m in enumerate(convo):
        text_lower = m.get('text', '').lower()
        if any(kw in text_lower for kw in date_keywords):
            esc_msg = i + 1
            break
    esc_data_h.append({'total': len(convo), 'at': esc_msg, 'found': esc_msg is not None})

esc_h_yes = [e for e in esc_data_h if e['found']]
esc_h_no = [e for e in esc_data_h if not e['found']]
print(f"  Convos avec escalade: {len(esc_h_yes)}/{len(esc_data_h)}")
if esc_h_yes:
    avg_at_h = sum(e['at'] for e in esc_h_yes) / len(esc_h_yes)
    print(f"  Message moyen: #{avg_at_h:.1f}")
    print()
    for label, lo, hi in [("Tot (1-5)", 1, 6), ("Normal (6-10)", 6, 11),
                            ("Tard (11-20)", 11, 21), ("Tres tard (21+)", 21, 999)]:
        matching = [e for e in esc_h_yes if lo <= e['at'] < hi]
        if matching:
            avg_t = sum(e['total'] for e in matching) / len(matching)
            print(f"  {label:<22} {len(matching):>5} {avg_t:>10.1f} msgs moy")
if esc_h_no:
    avg_ne_h = sum(e['total'] for e in esc_h_no) / len(esc_h_no)
    print(f"  {'Sans escalade':<22} {len(esc_h_no):>5} {avg_ne_h:>10.1f} msgs moy")


# ============================================================
print()
print("=" * 70)
print("  H30: RYTHME DE REPONSE -- EVOLUTION DES GAPS")
print("=" * 70)

print("\n  TINDER -- Evolution des gaps entre tes messages (convos >=5 msgs):")
print()
gap_evo = {"accelerate": [], "decelerate": [], "stable": []}
for convo in tinder_convos:
    if len(convo) < 5:
        continue
    gaps = []
    for i in range(1, len(convo)):
        gap = (convo[i]['ts'] - convo[i-1]['ts']).total_seconds() / 3600
        gaps.append(gap)
    mid = len(gaps) // 2
    first_avg = sum(gaps[:mid]) / mid if mid > 0 else 0
    second_avg = sum(gaps[mid:]) / (len(gaps) - mid) if (len(gaps) - mid) > 0 else 0
    if first_avg > 0:
        change = (second_avg - first_avg) / first_avg
    else:
        change = 0
    n = len(convo)
    if change > 0.20:
        gap_evo["decelerate"].append(n)
    elif change < -0.20:
        gap_evo["accelerate"].append(n)
    else:
        gap_evo["stable"].append(n)

print(f"  {'Rythme':<30} {'N':>5} {'Msgs moy':>10} {'% Long>=11':>12}")
for label, msgs in [("Accelere (gaps raccourcissent)", gap_evo["accelerate"]),
                     ("Stable (+/-20%)", gap_evo["stable"]),
                     ("Decelere (gaps allongent)", gap_evo["decelerate"])]:
    if msgs:
        avg = sum(msgs) / len(msgs)
        long_pct = sum(1 for m in msgs if m >= 11) / len(msgs) * 100
        print(f"  {label:<30} {len(msgs):>5} {avg:>10.1f} {long_pct:>11.0f}%")

# Hinge
print("\n  HINGE -- Evolution des gaps (convos >=10 msgs):")
print()
gap_evo_h = {"accelerate": [], "decelerate": [], "stable": []}
for convo in hinge_convos:
    if len(convo) < 10:
        continue
    gaps = []
    for i in range(1, len(convo)):
        gap = (convo[i]['ts'] - convo[i-1]['ts']).total_seconds() / 3600
        gaps.append(gap)
    mid = len(gaps) // 2
    f_avg = sum(gaps[:mid]) / mid if mid > 0 else 0
    s_avg = sum(gaps[mid:]) / (len(gaps) - mid) if (len(gaps) - mid) > 0 else 0
    change = (s_avg - f_avg) / f_avg if f_avg > 0 else 0
    n = len(convo)
    if change > 0.20:
        gap_evo_h["decelerate"].append(n)
    elif change < -0.20:
        gap_evo_h["accelerate"].append(n)
    else:
        gap_evo_h["stable"].append(n)

print(f"  {'Rythme':<30} {'N':>5} {'Msgs moy':>10}")
for label, msgs in [("Accelere", gap_evo_h["accelerate"]),
                     ("Stable", gap_evo_h["stable"]),
                     ("Decelere", gap_evo_h["decelerate"])]:
    if msgs:
        avg = sum(msgs) / len(msgs)
        print(f"  {label:<30} {len(msgs):>5} {avg:>10.1f}")


# ============================================================
print()
print("=" * 70)
print("  H31: FATIGUE CUMULATIVE -- DEBUT vs FIN DU COMPTE")
print("=" * 70)

print("\n  TINDER -- Qualite des convos par periode:")
print()
if tinder_convos:
    all_starts = [c[0]['ts'] for c in tinder_convos]
    min_d = min(all_starts)
    max_d = max(all_starts)
    total_days = (max_d - min_d).days
    q_len = total_days // 4

    print(f"  {'Periode':<30} {'N':>5} {'Msgs moy':>10} {'Ghost<=2':>10} {'Long>=11':>10}")
    for i in range(4):
        start = min_d + timedelta(days=i * q_len)
        end = min_d + timedelta(days=(i + 1) * q_len) if i < 3 else max_d + timedelta(days=1)
        convos_in = [len(c) for c in tinder_convos if start <= c[0]['ts'] < end]
        if convos_in:
            avg = sum(convos_in) / len(convos_in)
            ghost = sum(1 for m in convos_in if m <= 2) / len(convos_in) * 100
            long_pct = sum(1 for m in convos_in if m >= 11) / len(convos_in) * 100
            label = f"Q{i+1} ({start.strftime('%b %y')}->{end.strftime('%b %y')})"
            print(f"  {label:<30} {len(convos_in):>5} {avg:>10.1f} {ghost:>9.0f}% {long_pct:>9.0f}%")

    # Opener quality over time
    print("\n  Longueur moy de ton opener par periode:")
    for i in range(4):
        start = min_d + timedelta(days=i * q_len)
        end = min_d + timedelta(days=(i + 1) * q_len) if i < 3 else max_d + timedelta(days=1)
        openers = [len(c[0]['text']) for c in tinder_convos if start <= c[0]['ts'] < end]
        if openers:
            avg_len = sum(openers) / len(openers)
            print(f"  Q{i+1}: {avg_len:.0f} chars (N={len(openers)})")

# Hinge
print("\n  HINGE -- Qualite par periode:")
print()
if hinge_convos:
    all_starts_h = [c[0]['ts'] for c in hinge_convos]
    min_h = min(all_starts_h)
    max_h = max(all_starts_h)
    total_h = (max_h - min_h).days
    half = total_h // 2

    for i, label in enumerate(["1ere moitie", "2eme moitie"]):
        start = min_h + timedelta(days=i * half)
        end = min_h + timedelta(days=(i + 1) * half) if i == 0 else max_h + timedelta(days=1)
        convos_in = [len(c) for c in hinge_convos if start <= c[0]['ts'] < end]
        if convos_in:
            avg = sum(convos_in) / len(convos_in)
            ghost = sum(1 for m in convos_in if m <= 3) / len(convos_in) * 100
            long_pct = sum(1 for m in convos_in if m >= 16) / len(convos_in) * 100
            print(f"  {label:<20} N={len(convos_in):>3}, Msgs moy={avg:.1f}, Ghost<=3={ghost:.0f}%, Long>=16={long_pct:.0f}%")


# ============================================================
print()
print("=" * 70)
print("  H32: CORRELATION TINDER <-> HINGE -- MATCHS LIES?")
print("=" * 70)

tinder_match_days = set()
for d, data in daily.items():
    if data['matches'] > 0:
        tinder_match_days.add(d)

hinge_match_days_set = set(hinge_match_dates)

all_t_dates = sorted(daily.keys())
if all_t_dates and hinge_match_dates:
    overlap_start = max(min(all_t_dates), min(hinge_match_dates))
    overlap_end = min(max(all_t_dates), max(hinge_match_dates))
    print(f"\n  Periode de chevauchement: {overlap_start} -> {overlap_end}")

    both = 0; t_only = 0; h_only = 0; neither = 0; total = 0
    current = datetime.strptime(overlap_start, "%Y-%m-%d")
    end_dt = datetime.strptime(overlap_end, "%Y-%m-%d")
    while current <= end_dt:
        ds = current.strftime("%Y-%m-%d")
        t_m = ds in tinder_match_days
        h_m = ds in hinge_match_days_set
        if t_m and h_m: both += 1
        elif t_m: t_only += 1
        elif h_m: h_only += 1
        else: neither += 1
        total += 1
        current += timedelta(days=1)

    print(f"  Jours: {total}")
    print()
    print(f"  {'Situation':<30} {'Jours':>6} {'%':>7}")
    print(f"  {'Match les deux':<30} {both:>6} {both/total*100:>6.1f}%")
    print(f"  {'Tinder seul':<30} {t_only:>6} {t_only/total*100:>6.1f}%")
    print(f"  {'Hinge seul':<30} {h_only:>6} {h_only/total*100:>6.1f}%")
    print(f"  {'Aucun match':<30} {neither:>6} {neither/total*100:>6.1f}%")

    # Conditional probabilities
    days_t = t_only + both
    days_no_t = h_only + neither
    print()
    if days_t > 0:
        print(f"  P(match Hinge | match Tinder) = {both}/{days_t} = {both/days_t:.1%}")
    if days_no_t > 0:
        print(f"  P(match Hinge | PAS match Tinder) = {h_only}/{days_no_t} = {h_only/days_no_t:.1%}")
    days_h = h_only + both
    days_no_h = t_only + neither
    if days_h > 0:
        print(f"  P(match Tinder | match Hinge) = {both}/{days_h} = {both/days_h:.1%}")
    if days_no_h > 0:
        print(f"  P(match Tinder | PAS Hinge) = {t_only}/{days_no_h} = {t_only/days_no_h:.1%}")

    # Weekly correlation
    print("\n  Correlation hebdomadaire:")
    weekly_t = Counter()
    weekly_h = Counter()
    current = datetime.strptime(overlap_start, "%Y-%m-%d")
    while current <= end_dt:
        ds = current.strftime("%Y-%m-%d")
        wk = f"{current.year}-W{current.isocalendar()[1]:02d}"
        if ds in tinder_match_days: weekly_t[wk] += 1
        if ds in hinge_match_days_set: weekly_h[wk] += 1
        current += timedelta(days=1)

    all_weeks = sorted(set(list(weekly_t.keys()) + list(weekly_h.keys())))
    t_vals = [weekly_t.get(w, 0) for w in all_weeks]
    h_vals = [weekly_h.get(w, 0) for w in all_weeks]
    n = len(all_weeks)
    if n > 2:
        mt = sum(t_vals) / n
        mh = sum(h_vals) / n
        cov = sum((t - mt) * (h - mh) for t, h in zip(t_vals, h_vals)) / n
        st = (sum((t - mt)**2 for t in t_vals) / n) ** 0.5
        sh = (sum((h - mh)**2 for h in h_vals) / n) ** 0.5
        if st > 0 and sh > 0:
            r = cov / (st * sh)
            print(f"  Pearson r (weekly) = {r:.3f}")
            if abs(r) < 0.2: print(f"  -> Aucune correlation")
            elif abs(r) < 0.5: print(f"  -> Faible correlation {'positive' if r > 0 else 'negative'}")
            else: print(f"  -> {'Forte' if abs(r) > 0.7 else 'Moyenne'} correlation {'positive' if r > 0 else 'negative'}")

    # Good weeks
    print("\n  Bonnes semaines Tinder -> Hinge?")
    good_t = [w for w in all_weeks if weekly_t.get(w, 0) >= 2]
    bad_t = [w for w in all_weeks if weekly_t.get(w, 0) == 0]
    if good_t:
        h_good = [weekly_h.get(w, 0) for w in good_t]
        print(f"  Sem Tinder >=2 matchs ({len(good_t)}): Hinge avg = {sum(h_good)/len(h_good):.2f} matchs/sem")
    if bad_t:
        h_bad = [weekly_h.get(w, 0) for w in bad_t]
        print(f"  Sem Tinder 0 matchs ({len(bad_t)}): Hinge avg = {sum(h_bad)/len(h_bad):.2f} matchs/sem")


print()
print("=" * 70)
print("  SYNTHESE H25-H32")
print("=" * 70)
print()
print("  Resultats complets ci-dessus.")
