"""
Analyse complémentaire:
1. Quels sujets/thèmes provoquent le ghosting ?
2. Impact du séjour à l'île Maurice (1-18 jan 2026) sur les données
   - Tinder: géolocalisé à Maurice → pool différent
   - Hinge: PAS géolocalisé → toujours pool Paris
"""

import json
import os
import re
import sys
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

# Parse usage
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


# ============================================================
# BUILD CONVOS
# ============================================================

# Tinder convos
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

# Hinge convos
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

print(f"Tinder: {len(tinder_convos)} convos, Hinge: {len(hinge_convos)} convos")

# ============================================================
# MAURITIUS DATES
# ============================================================
MAURITIUS_START = datetime(2026, 1, 1)
MAURITIUS_END = datetime(2026, 1, 18)

def is_mauritius(ts):
    return MAURITIUS_START <= ts.replace(tzinfo=None) <= MAURITIUS_END

def is_mauritius_date(date_str):
    """Check if a date string falls in Mauritius period"""
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d')
        return MAURITIUS_START <= d <= MAURITIUS_END
    except:
        return False

# ============================================================
# PART 1: GHOST TOPIC ANALYSIS
# ============================================================
print("\n" + "=" * 70)
print("  ANALYSE 1: SUJETS QUI PROVOQUENT LE GHOST")
print("=" * 70)

TOPICS = {
    'voyage': ['voyage', 'voyager', 'trip', 'avion', 'valise', 'pays', 'visiter',
               'bali', 'japon', 'italie', 'espagne', 'thailande', 'mexique',
               'nepal', 'maurice', 'reunion', 'ile', 'plage', 'backpack'],
    'bouffe': ['manger', 'resto', 'restaurant', 'cuisine', 'recette', 'chef',
               'brunch', 'pizza', 'sushi', 'ramen', 'gastronomie', 'cook',
               'bouffe', 'plat', 'dessert', 'fromage', 'vin', 'boire', 'cafe',
               'croissant', 'patisserie', 'chocolat'],
    'musique': ['musique', 'concert', 'festival', 'chanson', 'spotify', 'album',
                'artiste', 'guitare', 'piano', 'jazz', 'rap', 'techno', 'rock',
                'electro', 'dj', 'playlist', 'chanter'],
    'film_serie': ['film', 'serie', 'netflix', 'cinema', 'acteur', 'saison',
                   'episode', 'regarder', 'documentaire', 'anime', 'marvel',
                   'horreur', 'comedie', 'thriller', 'disney'],
    'sport': ['sport', 'foot', 'tennis', 'running', 'courir', 'gym', 'yoga',
              'nager', 'surf', 'ski', 'velo', 'musculation', 'match', 'equipe',
              'marathon', 'boxe', 'escalade', 'crossfit', 'basket', 'rugby'],
    'travail': ['travail', 'boulot', 'job', 'bureau', 'boss', 'collegue',
                'entreprise', 'startup', 'consultant', 'ingenieur', 'dev',
                'projet', 'reunion', 'client', 'carriere', 'etude', 'stage',
                'master', 'ecole', 'formation'],
    'humour': ['haha', 'mdr', 'lol', 'ptdr', 'blague', 'drole', 'marrant',
               'rigoler', 'humour', 'mort de rire', 'trop bien', 'excellent',
               'genie', 'hilarant', 'comique'],
    'animal': ['chien', 'chat', 'whippet', 'animal', 'animaux', 'mignon',
               'adoption', 'balade', 'parc', 'promener', 'calin', 'poil',
               'race', 'chiot', 'chaton', 'levrier', 'niche'],
    'soiree': ['soiree', 'bar', 'sortir', 'apero', 'cocktail', 'biere',
               'boite', 'club', 'fete', 'samedi soir', 'terrasse', 'rooftop',
               'afterwork', 'happy hour'],
    'culture': ['livre', 'lire', 'expo', 'musee', 'galerie', 'art', 'photo',
                'peinture', 'theatre', 'spectacle', 'poesie', 'philo',
                'histoire', 'podcast', 'documentaire', 'roman'],
    'compliment': ['belle', 'beau', 'magnifique', 'jolie', 'mignon', 'mignonne',
                   'canon', 'sourire', 'yeux', 'regard', 'style', 'classe',
                   'sexy', 'charmant', 'charmante', 'craquant', 'craquante',
                   'sublime', 'superbe', 'adorable', 'pretty', 'beautiful',
                   'cute', 'gorgeous', 'stunning', 'handsome'],
    'perso_intime': ['famille', 'parents', 'frere', 'soeur', 'enfant', 'relation',
                     'ex', 'celibataire', 'couple', 'mariage', 'amour', 'coeur',
                     'sentiment', 'emotion', 'peur', 'triste', 'manquer',
                     'confiance', 'seul', 'solitude'],
    'logistique': ['adresse', 'metro', 'quartier', 'arrondissement', 'habiter',
                   'habites', 'coin', 'pres de', 'loin', 'quand', 'dispo',
                   'disponible', 'horaire', 'semaine', 'weekend', 'demain',
                   'ce soir', 'samedi', 'dimanche', 'vendredi'],
    'sexuel': ['sexe', 'sex', 'lit', 'nuit', 'corps', 'embrasser', 'bisou',
               'calin', 'hot', 'coquin', 'coquine', 'plan', 'aventure',
               'sensuel', 'desir', 'envie de toi', 'chez moi', 'chez toi',
               'netflix and chill', 'hookup'],
}


def detect_topics_in_convo(msgs_list):
    """Detect all topics mentioned across all messages in a convo"""
    all_text = ' '.join(m['text'].lower() for m in msgs_list)
    # Decode HTML entities
    all_text = all_text.replace('&rsquo;', "'").replace('&amp;', '&')
    all_text = all_text.replace('&eacute;', 'e').replace('&egrave;', 'e')
    all_text = all_text.replace('&agrave;', 'a').replace('&ccedil;', 'c')

    found = set()
    for topic, keywords in TOPICS.items():
        for kw in keywords:
            if kw in all_text:
                found.add(topic)
                break
    return found


def detect_opener_topics(first_msg_text):
    """Detect topics in the opener only"""
    text = first_msg_text.lower()
    text = text.replace('&rsquo;', "'").replace('&amp;', '&')

    found = set()
    for topic, keywords in TOPICS.items():
        for kw in keywords:
            if kw in text:
                found.add(topic)
                break
    return found


# Classify convos as ghost or not
TINDER_GHOST_THRESHOLD = 2
HINGE_GHOST_THRESHOLD = 3

def analyze_topics_ghost(convos, ghost_threshold, app_name):
    """Analyze which topics appear more in ghost vs successful convos"""
    topic_stats = defaultdict(lambda: {'ghost': 0, 'alive': 0, 'ghost_msgs': [], 'alive_msgs': []})
    opener_topic_stats = defaultdict(lambda: {'ghost': 0, 'alive': 0})

    total_ghost = 0
    total_alive = 0

    for msgs in convos:
        n_msgs = len(msgs)
        is_ghost = n_msgs <= ghost_threshold

        if is_ghost:
            total_ghost += 1
        else:
            total_alive += 1

        # Full convo topics
        topics = detect_topics_in_convo(msgs)
        for t in topics:
            if is_ghost:
                topic_stats[t]['ghost'] += 1
                topic_stats[t]['ghost_msgs'].append(n_msgs)
            else:
                topic_stats[t]['alive'] += 1
                topic_stats[t]['alive_msgs'].append(n_msgs)

        # Track "no topic" convos
        if not topics:
            if is_ghost:
                topic_stats['_AUCUN_SUJET_']['ghost'] += 1
                topic_stats['_AUCUN_SUJET_']['ghost_msgs'].append(n_msgs)
            else:
                topic_stats['_AUCUN_SUJET_']['alive'] += 1
                topic_stats['_AUCUN_SUJET_']['alive_msgs'].append(n_msgs)

        # Opener topics
        opener_topics = detect_opener_topics(msgs[0]['text'])
        for t in opener_topics:
            if is_ghost:
                opener_topic_stats[t]['ghost'] += 1
            else:
                opener_topic_stats[t]['alive'] += 1

        if not opener_topics:
            if is_ghost:
                opener_topic_stats['_AUCUN_SUJET_']['ghost'] += 1
            else:
                opener_topic_stats['_AUCUN_SUJET_']['alive'] += 1

    print(f"\n  {app_name} -- Ghost = {ghost_threshold} msgs ou moins")
    print(f"  Total: {total_ghost} ghosts ({total_ghost*100//(total_ghost+total_alive)}%), {total_alive} vivantes\n")

    # Sort by ghost rate
    print(f"  {'Sujet':<20} {'N total':>8} {'Ghost':>8} {'Vivant':>8} {'Ghost%':>8} {'Surrepr':>10}")
    print(f"  {'-'*20} {'-'*8} {'-'*8} {'-'*8} {'-'*8} {'-'*10}")

    base_ghost_rate = total_ghost / (total_ghost + total_alive) if (total_ghost + total_alive) > 0 else 0

    items = []
    for topic, stats in topic_stats.items():
        total = stats['ghost'] + stats['alive']
        if total >= 2:  # min 2 convos
            ghost_rate = stats['ghost'] / total
            over_repr = ghost_rate / base_ghost_rate if base_ghost_rate > 0 else 0
            items.append((topic, total, stats['ghost'], stats['alive'], ghost_rate, over_repr))

    items.sort(key=lambda x: -x[4])  # Sort by ghost rate desc

    for topic, total, ghost, alive, ghost_rate, over_repr in items:
        marker = " !!!" if over_repr > 1.3 and ghost >= 2 else ""
        marker = " ***" if ghost_rate > 0.7 and total >= 3 else marker
        safe = " (safe)" if over_repr < 0.7 and alive >= 2 else ""
        print(f"  {topic:<20} {total:>8} {ghost:>8} {alive:>8} {ghost_rate:>7.0%} {over_repr:>9.2f}x{marker}{safe}")

    # Opener-specific analysis
    print(f"\n  {app_name} -- Sujets dans L'OPENER uniquement:")
    print(f"  {'Sujet opener':<20} {'Ghost':>8} {'Vivant':>8} {'Ghost%':>8}")
    print(f"  {'-'*20} {'-'*8} {'-'*8} {'-'*8}")

    opener_items = []
    for topic, stats in opener_topic_stats.items():
        total = stats['ghost'] + stats['alive']
        if total >= 2:
            ghost_rate = stats['ghost'] / total
            opener_items.append((topic, stats['ghost'], stats['alive'], ghost_rate))

    opener_items.sort(key=lambda x: -x[3])

    for topic, ghost, alive, ghost_rate in opener_items:
        marker = " !!!" if ghost_rate > 0.7 and (ghost + alive) >= 3 else ""
        print(f"  {topic:<20} {ghost:>8} {alive:>8} {ghost_rate:>7.0%}{marker}")

    return topic_stats


print("\n--- TINDER ---")
tinder_topic_stats = analyze_topics_ghost(tinder_convos, TINDER_GHOST_THRESHOLD, "TINDER")

print("\n--- HINGE ---")
hinge_topic_stats = analyze_topics_ghost(hinge_convos, HINGE_GHOST_THRESHOLD, "HINGE")


# ============================================================
# PART 2: FIRST MESSAGE CONTENT OF GHOSTED CONVOS
# ============================================================
print("\n" + "=" * 70)
print("  ANALYSE 2: CONTENU DES OPENERS QUI SE FONT GHOST")
print("=" * 70)

print("\n  TINDER -- Openers des convos ghost (<=2 msgs):")
print(f"  {'#':<4} {'Msgs':>5} {'Chars':>6} {'Opener (truncated)':<60}")
print(f"  {'-'*4} {'-'*5} {'-'*6} {'-'*60}")

ghost_openers_t = []
alive_openers_t = []
for msgs in tinder_convos:
    opener = msgs[0]['text'].replace('&rsquo;', "'").replace('&amp;', '&')
    if len(msgs) <= 2:
        ghost_openers_t.append((len(msgs), opener))
    else:
        alive_openers_t.append((len(msgs), opener))

for i, (n, text) in enumerate(sorted(ghost_openers_t, key=lambda x: x[0])):
    truncated = text[:57] + "..." if len(text) > 60 else text
    print(f"  {i+1:<4} {n:>5} {len(text):>6} {truncated:<60}")

print(f"\n  TINDER -- Openers des convos VIVANTES (>2 msgs) pour comparaison:")
print(f"  {'#':<4} {'Msgs':>5} {'Chars':>6} {'Opener (truncated)':<60}")
print(f"  {'-'*4} {'-'*5} {'-'*6} {'-'*60}")

for i, (n, text) in enumerate(sorted(alive_openers_t, key=lambda x: -x[0])[:10]):
    truncated = text[:57] + "..." if len(text) > 60 else text
    print(f"  {i+1:<4} {n:>5} {len(text):>6} {truncated:<60}")


print("\n  HINGE -- Openers des convos ghost (<=3 msgs):")
print(f"  {'#':<4} {'Msgs':>5} {'Chars':>6} {'Opener (truncated)':<60}")
print(f"  {'-'*4} {'-'*5} {'-'*6} {'-'*60}")

ghost_openers_h = []
alive_openers_h = []
for msgs in hinge_convos:
    opener = msgs[0]['text']
    if len(msgs) <= 3:
        ghost_openers_h.append((len(msgs), opener))
    else:
        alive_openers_h.append((len(msgs), opener))

for i, (n, text) in enumerate(sorted(ghost_openers_h, key=lambda x: x[0])):
    truncated = text[:57] + "..." if len(text) > 60 else text
    print(f"  {i+1:<4} {n:>5} {len(text):>6} {truncated:<60}")


# ============================================================
# PART 3: MAURITIUS IMPACT
# ============================================================
print("\n" + "=" * 70)
print("  ANALYSE 3: IMPACT ILE MAURICE (1-18 janvier 2026)")
print("=" * 70)

# Tinder activity during Mauritius
print("\n  TINDER -- Activite pendant Maurice vs avant/apres:")

mauritius_days = {d: daily[d] for d in daily if is_mauritius_date(d)}
pre_maurice = {}
post_maurice = {}

for d, v in daily.items():
    try:
        dt = datetime.strptime(d, '%Y-%m-%d')
    except:
        continue
    # 2 weeks before
    if datetime(2025, 12, 18) <= dt < datetime(2026, 1, 1):
        pre_maurice[d] = v
    # 2 weeks after
    elif datetime(2026, 1, 19) <= dt <= datetime(2026, 2, 1):
        post_maurice[d] = v

def period_stats(period_days, label):
    if not period_days:
        print(f"  {label}: Aucune donnee")
        return
    n = len(period_days)
    likes = sum(v['likes'] for v in period_days.values())
    passes = sum(v['passes'] for v in period_days.values())
    matches = sum(v['matches'] for v in period_days.values())
    opens = sum(v['opens'] for v in period_days.values())
    msgs_s = sum(v['msgs_sent'] for v in period_days.values())
    msgs_r = sum(v['msgs_rcvd'] for v in period_days.values())
    ratio = likes / (likes + passes) * 100 if (likes + passes) > 0 else 0
    conv = matches / likes * 100 if likes > 0 else 0
    print(f"  {label} ({n}j):")
    print(f"    Likes: {likes} ({likes/n:.1f}/j), Passes: {passes}, Ratio: {ratio:.0f}%")
    print(f"    Matchs: {matches} ({matches/n:.2f}/j), Conv: {conv:.2f}%")
    print(f"    Opens: {opens} ({opens/n:.1f}/j)")
    print(f"    Msgs sent: {msgs_s} ({msgs_s/n:.1f}/j), Msgs rcvd: {msgs_r} ({msgs_r/n:.1f}/j)")
    return {'likes': likes, 'matches': matches, 'conv': conv, 'likes_per_day': likes/n, 'matches_per_day': matches/n}

print()
period_stats(pre_maurice, "Pre-Maurice (18 dec - 31 dec)")
print()
stats_maurice = period_stats(mauritius_days, "MAURICE (1-18 jan)")
print()
period_stats(post_maurice, "Post-Maurice (19 jan - 1 fev)")

# Detail day by day during Mauritius
print("\n  Detail jour par jour (Maurice):")
print(f"  {'Date':<12} {'Opens':>6} {'Likes':>6} {'Passes':>7} {'Ratio':>6} {'Match':>6} {'Msg_S':>6} {'Msg_R':>6}")
print(f"  {'-'*12} {'-'*6} {'-'*6} {'-'*7} {'-'*6} {'-'*6} {'-'*6} {'-'*6}")

for d in sorted(mauritius_days.keys()):
    v = mauritius_days[d]
    total = v['likes'] + v['passes']
    ratio = v['likes'] / total * 100 if total > 0 else 0
    print(f"  {d:<12} {v['opens']:>6} {v['likes']:>6} {v['passes']:>7} {ratio:>5.0f}% {v['matches']:>6} {v['msgs_sent']:>6} {v['msgs_rcvd']:>6}")

# Tinder convos started during Mauritius
print("\n  TINDER -- Convos commencees pendant Maurice:")
maurice_convos = []
non_maurice_convos = []
for msgs in tinder_convos:
    first_ts = msgs[0]['ts']
    if is_mauritius(first_ts):
        maurice_convos.append(msgs)
    else:
        non_maurice_convos.append(msgs)

print(f"  Convos debutees a Maurice: {len(maurice_convos)}")
print(f"  Convos hors Maurice: {len(non_maurice_convos)}")

if maurice_convos:
    avg_m = sum(len(c) for c in maurice_convos) / len(maurice_convos)
    ghost_m = sum(1 for c in maurice_convos if len(c) <= 2)
    print(f"  Maurice: {avg_m:.1f} msgs moy, {ghost_m}/{len(maurice_convos)} ghosts ({ghost_m*100//len(maurice_convos)}%)")

if non_maurice_convos:
    avg_nm = sum(len(c) for c in non_maurice_convos) / len(non_maurice_convos)
    ghost_nm = sum(1 for c in non_maurice_convos if len(c) <= 2)
    print(f"  Hors Maurice: {avg_nm:.1f} msgs moy, {ghost_nm}/{len(non_maurice_convos)} ghosts ({ghost_nm*100//len(non_maurice_convos)}%)")

    for msgs in maurice_convos:
        opener = msgs[0]['text'].replace('&rsquo;', "'").replace('&amp;', '&')
        truncated = opener[:57] + "..." if len(opener) > 60 else opener
        print(f"    - [{len(msgs)} msgs] {msgs[0]['ts'].strftime('%d/%m')} : {truncated}")


# ============================================================
# PART 4: FATIGUE RE-ANALYSIS WITHOUT MAURITIUS
# ============================================================
print("\n" + "=" * 70)
print("  ANALYSE 4: FATIGUE Q4 CORRIGEE (sans convos Maurice)")
print("=" * 70)

# Separate Q4 convos into Maurice vs non-Maurice
q4_start = datetime(2025, 12, 1)
q4_end = datetime(2026, 3, 1)

q4_convos_maurice = []
q4_convos_paris = []
q4_convos_all = []

for msgs in tinder_convos:
    first_ts = msgs[0]['ts']
    ts_naive = first_ts.replace(tzinfo=None) if first_ts.tzinfo else first_ts
    if q4_start <= ts_naive < q4_end:
        q4_convos_all.append(msgs)
        if is_mauritius(first_ts):
            q4_convos_maurice.append(msgs)
        else:
            q4_convos_paris.append(msgs)

def convo_stats(convos_list, label):
    if not convos_list:
        print(f"  {label}: Aucune convo")
        return
    n = len(convos_list)
    avg_msgs = sum(len(c) for c in convos_list) / n
    ghost = sum(1 for c in convos_list if len(c) <= 2)
    long_c = sum(1 for c in convos_list if len(c) >= 11)
    avg_opener_len = sum(len(c[0]['text']) for c in convos_list) / n
    print(f"  {label}:")
    print(f"    N={n}, Msgs moy={avg_msgs:.1f}, Ghost<=2={ghost}/{n} ({ghost*100//n}%), Long>=11={long_c}/{n} ({long_c*100//n}%)")
    print(f"    Opener length moy: {avg_opener_len:.0f} chars")

print("\n  TINDER Q4 decompose:")
convo_stats(q4_convos_all, "Q4 TOTAL (dec-fev)")
convo_stats(q4_convos_maurice, "Q4 - Maurice seulement (pool mauricien)")
convo_stats(q4_convos_paris, "Q4 - Paris seulement (hors Maurice)")

# Now redo the full fatigue analysis excluding Mauritius
print("\n  TINDER -- Fatigue CORRIGEE (sans Maurice):")

quarters = [
    ("Q1 (Avr-Jul 25)", datetime(2025, 4, 1), datetime(2025, 7, 1)),
    ("Q2 (Jul-Sep 25)", datetime(2025, 7, 1), datetime(2025, 10, 1)),
    ("Q3 (Sep-Dec 25)", datetime(2025, 10, 1), datetime(2026, 1, 1)),
    ("Q4* (Dec-Fev, SANS Maurice)", datetime(2025, 12, 1), datetime(2026, 3, 1)),
]

print(f"\n  {'Periode':<35} {'N':>4} {'Msgs':>6} {'Ghost%':>8} {'Long%':>8} {'Opener':>8}")
print(f"  {'-'*35} {'-'*4} {'-'*6} {'-'*8} {'-'*8} {'-'*8}")

for label, start, end in quarters:
    if "SANS" in label:
        # Exclude Mauritius convos
        q_convos = [c for c in tinder_convos
                    if start <= c[0]['ts'].replace(tzinfo=None) < end
                    and not is_mauritius(c[0]['ts'])]
    else:
        q_convos = [c for c in tinder_convos
                    if start <= c[0]['ts'].replace(tzinfo=None) < end]

    if not q_convos:
        print(f"  {label:<35} {'N/A':>4}")
        continue

    n = len(q_convos)
    avg = sum(len(c) for c in q_convos) / n
    ghost = sum(1 for c in q_convos if len(c) <= 2) * 100 / n
    long_c = sum(1 for c in q_convos if len(c) >= 11) * 100 / n
    opener = sum(len(c[0]['text']) for c in q_convos) / n
    print(f"  {label:<35} {n:>4} {avg:>6.1f} {ghost:>7.0f}% {long_c:>7.0f}% {opener:>7.0f}c")


# ============================================================
# PART 5: HINGE DURING MAURITIUS (not geolocated)
# ============================================================
print("\n" + "=" * 70)
print("  ANALYSE 5: HINGE PENDANT MAURICE (pas geolocalisee)")
print("=" * 70)

hinge_maurice_convos = []
hinge_non_maurice_convos = []
for msgs in hinge_convos:
    first_ts = msgs[0]['ts']
    if is_mauritius(first_ts):
        hinge_maurice_convos.append(msgs)
    else:
        hinge_non_maurice_convos.append(msgs)

print(f"\n  Hinge convos pendant Maurice: {len(hinge_maurice_convos)}")
print(f"  Hinge convos hors Maurice: {len(hinge_non_maurice_convos)}")

if hinge_maurice_convos:
    print(f"\n  Convos Hinge demarrees pendant Maurice (toujours pool Paris):")
    for msgs in hinge_maurice_convos:
        opener = msgs[0]['text']
        truncated = opener[:57] + "..." if len(opener) > 60 else opener
        print(f"    - [{len(msgs)} msgs] {msgs[0]['ts'].strftime('%d/%m/%Y')} : {truncated}")


# ============================================================
# PART 6: Q4 TINDER USAGE AT MAURITIUS - Was there less effort?
# ============================================================
print("\n" + "=" * 70)
print("  ANALYSE 6: EFFORT TINDER A MAURICE vs PARIS")
print("=" * 70)

# Compare usage patterns
maurice_usage_dates = [d for d in daily if is_mauritius_date(d)]
pre_m_dates = [d for d in daily if datetime(2025, 12, 18) <= datetime.strptime(d, '%Y-%m-%d') < datetime(2026, 1, 1)]
post_m_dates = [d for d in daily if datetime(2026, 1, 19) <= datetime.strptime(d, '%Y-%m-%d') <= datetime(2026, 2, 1)]

def avg_metric(dates, metric):
    if not dates:
        return 0
    return sum(daily[d][metric] for d in dates) / len(dates)

print(f"\n  {'Periode':<30} {'Opens/j':>8} {'Likes/j':>8} {'Pass/j':>8} {'Ratio':>8} {'Match/j':>8}")
print(f"  {'-'*30} {'-'*8} {'-'*8} {'-'*8} {'-'*8} {'-'*8}")

for label, dates in [("Pre-Maurice (18-31 dec)", pre_m_dates),
                     ("MAURICE (1-18 jan)", maurice_usage_dates),
                     ("Post-Maurice (19 jan-1 fev)", post_m_dates)]:
    if dates:
        opens = avg_metric(dates, 'opens')
        likes = avg_metric(dates, 'likes')
        passes = avg_metric(dates, 'passes')
        ratio = likes / (likes + passes) * 100 if (likes + passes) > 0 else 0
        matches = avg_metric(dates, 'matches')
        print(f"  {label:<30} {opens:>8.1f} {likes:>8.1f} {passes:>8.1f} {ratio:>7.0f}% {matches:>8.2f}")


# ============================================================
# SYNTHESE
# ============================================================
print("\n" + "=" * 70)
print("  SYNTHESE")
print("=" * 70)
print("""
  1. SUJETS GHOST: voir les tableaux ci-dessus pour les sujets
     surrepresentes dans les convos ghost vs vivantes.

  2. MAURICE: Le sejour a Maurice (1-18 jan) = pool DIFFERENT
     sur Tinder (geolocalisee). Les convos demarrees a Maurice
     sont avec des profils mauriciens, pas parisiens.
     Sur Hinge, pas de changement de pool (pas geoloc).

  3. FATIGUE CORRIGEE: En retirant les convos Maurice du Q4,
     est-ce que l'effondrement persiste ou etait-il cause par
     le changement de pool?
""")
