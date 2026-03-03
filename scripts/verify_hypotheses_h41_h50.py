#!/usr/bin/env python3
"""
H41-H50: Final hypothesis batch
H41: Shadowban after subscription cancellation
H42: Hinge geolocation Paris vs Roissy-en-Brie (data availability check)
H43: Universal opener (best performing opener pattern)
H44: Weekend vs weekday match quality
H45: Daily sent/received ratio as predictor
H46: Message alternation speed as engagement proxy
H47: Seasonal quality by calendar month
H48: High-activity day → worse convo quality?
H49: Social sharing timing (at which message #)
H50: Trigger words that predict long convos
"""
import json, sys, re, os
from datetime import datetime, timedelta
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(BASE, 'Personal', 'Tinder', 'data.json'), 'r', encoding='utf-8') as f:
    tinder = json.load(f)

with open(os.path.join(BASE, 'Personal', 'Hinge', 'matches.json'), 'r', encoding='utf-8') as f:
    hinge_matches = json.load(f)

with open(os.path.join(BASE, 'Personal', 'Hinge', 'subscriptions.json'), 'r', encoding='utf-8') as f:
    hinge_subs = json.load(f)

# --- Helpers ---
def parse_ts(ts_str):
    for fmt in ['%Y-%m-%d %H:%M:%S', '%a, %d %b %Y %H:%M:%S GMT',
                '%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S%z',
                '%Y-%m-%d %H:%M:%S%z']:
        try:
            return datetime.strptime(ts_str.strip().replace('+00', '+0000'), fmt)
        except (ValueError, TypeError):
            pass
    # Try fromisoformat as fallback
    try:
        return datetime.fromisoformat(ts_str.replace('Z', '+00:00').replace('+00 ', '+00:00 '))
    except:
        pass
    return None

usage = tinder.get('Usage', {})

# Parse Tinder convos
tinder_convos = []
for convo_block in tinder.get('Messages', []):
    msgs = convo_block.get('messages', [])
    if not msgs:
        continue
    parsed = []
    for m in msgs:
        ts = parse_ts(m.get('sent_date', ''))
        if ts:
            parsed.append({'body': m.get('message', ''), 'ts': ts})
    if parsed:
        parsed.sort(key=lambda x: x['ts'])
        tinder_convos.append({
            'msgs': parsed,
            'n': len(parsed),
            'opener': parsed[0]['body'],
            'first_ts': parsed[0]['ts'],
            'last_ts': parsed[-1]['ts'],
        })

# Parse Hinge convos
hinge_convos = []
for entry in hinge_matches:
    chats = entry.get('chats', [])
    is_match = entry.get('match', [])
    block = entry.get('block', [])
    parsed = []
    for c in chats:
        ts = parse_ts(c.get('timestamp', ''))
        if ts:
            parsed.append({'body': c.get('body', ''), 'ts': ts})
    if parsed:
        parsed.sort(key=lambda x: x['ts'])
        hinge_convos.append({
            'msgs': parsed,
            'n': len(parsed),
            'opener': parsed[0]['body'],
            'first_ts': parsed[0]['ts'],
            'last_ts': parsed[-1]['ts'],
            'block': block,
            'match': is_match,
        })

print(f"Tinder: {len(tinder_convos)} convos, Hinge: {len(hinge_convos)} convos")

# =====================================================================
# H41: SHADOWBAN AFTER SUBSCRIPTION CANCELLATION
# =====================================================================
print("\n" + "=" * 70)
print("  H41: SHADOWBAN APRES RESILIATION D'ABONNEMENT")
print("=" * 70)

# Tinder subscription
tinder_sub = tinder.get('Purchases', {}).get('subscription', [])
if tinder_sub:
    sub = tinder_sub[0]
    expire_str = sub.get('expire_date', '')
    expire_dt = parse_ts(expire_str)
    create_str = sub.get('create_date', '')
    create_dt = parse_ts(create_str)
    print(f"\n  Tinder Platinum: {create_str[:10]} -> {expire_str[:10]}")
    print(f"  Status: {sub.get('status')}")

    if expire_dt:
        expire_date = expire_dt.replace(tzinfo=None)
        # Compare 14 days before vs 14 days after expiry
        for window_label, window_days in [("7j", 7), ("14j", 14), ("21j", 21)]:
            before_likes = 0
            before_matches = 0
            before_days = 0
            after_likes = 0
            after_matches = 0
            after_days = 0

            for i in range(1, window_days + 1):
                d_before = (expire_date - timedelta(days=i)).strftime('%Y-%m-%d')
                d_after = (expire_date + timedelta(days=i)).strftime('%Y-%m-%d')

                bl = usage.get('swipes_likes', {}).get(d_before, 0)
                bm = usage.get('matches', {}).get(d_before, 0)
                al = usage.get('swipes_likes', {}).get(d_after, 0)
                am = usage.get('matches', {}).get(d_after, 0)

                if bl > 0 or usage.get('app_opens', {}).get(d_before, 0) > 0:
                    before_likes += bl
                    before_matches += bm
                    before_days += 1
                if al > 0 or usage.get('app_opens', {}).get(d_after, 0) > 0:
                    after_likes += al
                    after_matches += am
                    after_days += 1

            before_conv = (before_matches / before_likes * 100) if before_likes > 0 else 0
            after_conv = (after_matches / after_likes * 100) if after_likes > 0 else 0

            print(f"\n  Fenetre {window_label} autour expiration ({expire_str[:10]}):")
            print(f"    AVANT: {before_likes} likes, {before_matches} matchs, conv={before_conv:.2f}%, {before_days}j actifs")
            print(f"    APRES: {after_likes} likes, {after_matches} matchs, conv={after_conv:.2f}%, {after_days}j actifs")
            if before_conv > 0:
                print(f"    Delta: {((after_conv - before_conv) / before_conv * 100):+.1f}%")

    # Day-by-day around expiry
    print(f"\n  Detail jour par jour autour de l'expiration:")
    if expire_dt:
        expire_date = expire_dt.replace(tzinfo=None)
        for i in range(-10, 11):
            d = (expire_date + timedelta(days=i)).strftime('%Y-%m-%d')
            likes = usage.get('swipes_likes', {}).get(d, 0)
            matches = usage.get('matches', {}).get(d, 0)
            opens = usage.get('app_opens', {}).get(d, 0)
            conv = f"{matches/likes*100:.1f}%" if likes > 0 else "n/a"
            marker = " <-- EXPIRATION" if i == 0 else ""
            if likes > 0 or opens > 0:
                print(f"    {d}: {opens:3d} opens, {likes:3d} likes, {matches} matchs, conv={conv}{marker}")

# Hinge subscriptions
print(f"\n  HINGE — Impact post-resiliation:")
hinge_sub_dates = []
for s in hinge_subs:
    end = parse_ts(s.get('end_date', ''))
    start = parse_ts(s.get('start_date', ''))
    if end:
        hinge_sub_dates.append({
            'start': start,
            'end': end,
            'type': s.get('subscription_type', ''),
            'duration': s.get('subscription_duration', '')
        })
        print(f"  Sub: {s.get('start_date', '')[:10]} -> {s.get('end_date', '')[:10]} ({s.get('subscription_type')})")

# Check Hinge match rate around each subscription end
for sub_info in hinge_sub_dates:
    end_date = sub_info['end'].replace(tzinfo=None)
    before_matches = 0
    after_matches = 0
    for hc in hinge_convos:
        dt = hc['first_ts'].replace(tzinfo=None) if hc['first_ts'].tzinfo else hc['first_ts']
        days_from_end = (dt - end_date).days
        if -14 <= days_from_end < 0:
            before_matches += 1
        elif 0 <= days_from_end <= 14:
            after_matches += 1
    print(f"  Autour de {sub_info['end'].strftime('%Y-%m-%d')}: {before_matches} convos 14j avant, {after_matches} convos 14j apres")


# =====================================================================
# H42: GEOLOCATION PARIS vs ROISSY-EN-BRIE
# =====================================================================
print("\n" + "=" * 70)
print("  H42: GEOLOCATION PARIS vs ROISSY-EN-BRIE")
print("=" * 70)

# Check Hinge user location
try:
    with open(os.path.join(BASE, 'Personal', 'Hinge', 'user.json'), 'r', encoding='utf-8') as f:
        hinge_user = json.load(f)
    loc = hinge_user.get('location', {})
    print(f"\n  Hinge location statique:")
    print(f"    Lat: {loc.get('latitude')}, Lon: {loc.get('longitude')}")
    print(f"    Zone: {loc.get('neighborhood')}, {loc.get('admin_area_2')}, {loc.get('postal_code')}")
    print(f"    Distance max: {hinge_user.get('preferences', {}).get('distance_miles_max', 'N/A')} miles")
except:
    print("  Pas de fichier user.json")

# Check Tinder location data in subscription
if tinder_sub:
    pos = tinder_sub[0].get('pos', {})
    print(f"\n  Tinder sub location: lat={pos.get('lat')}, lon={pos.get('lon')}")
    # Roissy-en-Brie: ~48.795, 2.662
    # Paris center: ~48.856, 2.352
    # If lat ~48.8 and lon ~2.3 = Paris, lon ~2.6 = Roissy
    print(f"  (Paris centre: 48.856, 2.352 / Roissy-en-Brie: 48.795, 2.662)")

# Proxy analysis: weekday vs weekend match patterns as proxy for location
# Assumption: weekdays = more likely in Paris (work), weekends = more likely at home (Roissy)
print(f"\n  Proxy analyse (semaine=Paris probable, weekend=domicile probable):")
weekday_convos_h = [c for c in hinge_convos if c['first_ts'].weekday() < 5]
weekend_convos_h = [c for c in hinge_convos if c['first_ts'].weekday() >= 5]

if weekday_convos_h:
    avg_wd = sum(c['n'] for c in weekday_convos_h) / len(weekday_convos_h)
    ghost_wd = sum(1 for c in weekday_convos_h if c['n'] <= 3) / len(weekday_convos_h) * 100
else:
    avg_wd, ghost_wd = 0, 0

if weekend_convos_h:
    avg_we = sum(c['n'] for c in weekend_convos_h) / len(weekend_convos_h)
    ghost_we = sum(1 for c in weekend_convos_h if c['n'] <= 3) / len(weekend_convos_h) * 100
else:
    avg_we, ghost_we = 0, 0

print(f"    Hinge semaine: N={len(weekday_convos_h)}, Msgs moy={avg_wd:.1f}, Ghost={ghost_wd:.0f}%")
print(f"    Hinge weekend: N={len(weekend_convos_h)}, Msgs moy={avg_we:.1f}, Ghost={ghost_we:.0f}%")
print(f"    NOTE: pas de tracking geoloc par match dans l'export RGPD Hinge")
print(f"    La location est STATIQUE (definie une fois). On ne peut pas comparer Paris vs Roissy directement.")


# =====================================================================
# H43: OPENER UNIVERSEL — existe-t-il un pattern qui marche toujours ?
# =====================================================================
print("\n" + "=" * 70)
print("  H43: OPENER UNIVERSEL — quel pattern marche le mieux ?")
print("=" * 70)

# Classify openers by pattern
def classify_opener(text):
    text_lower = text.lower().strip()
    patterns = []

    # Language
    fr_words = ['salut', 'bonjour', 'comment', 'ça va', 'tu', 'ton', 'ta', 'c\'est', 'quoi', 'quel', 'est-ce']
    en_words = ['hey', 'how are', 'what', 'nice', 'your', 'you', 'hi ']
    is_fr = any(w in text_lower for w in fr_words)
    is_en = any(w in text_lower for w in en_words)
    if is_fr:
        patterns.append('FR')
    elif is_en:
        patterns.append('EN')
    else:
        patterns.append('AUTRE')

    # Question
    if '?' in text:
        patterns.append('QUESTION')
    else:
        patterns.append('PAS_QUESTION')

    # Reference to profile (bio/photo keywords)
    ref_words = ['photo', 'profil', 'bio', 'prompt', 'voyage', 'trip', 'chien', 'whippet', 'chat',
                 'musique', 'film', 'série', 'sport', 'nepal', 'ile maurice', 'paris']
    if any(w in text_lower for w in ref_words):
        patterns.append('REF_PROFIL')

    # Humor indicators
    humor_words = ['haha', 'mdr', 'lol', '😂', '😄', 'drôle', 'marrant']
    if any(w in text_lower for w in humor_words):
        patterns.append('HUMOUR')

    # Length category
    l = len(text)
    if l < 20:
        patterns.append('TRES_COURT')
    elif l < 50:
        patterns.append('COURT')
    elif l < 100:
        patterns.append('MOYEN')
    else:
        patterns.append('LONG')

    # Compliment
    compliment_words = ['belle', 'jolie', 'magnifique', 'beautiful', 'cute', 'pretty', 'sympa', 'canon']
    if any(w in text_lower for w in compliment_words):
        patterns.append('COMPLIMENT')

    # Personal anecdote (contains "je", "moi", "perso")
    if any(w in text_lower for w in ['je ', 'moi ', 'perso', 'j\'ai', 'j\'aime']):
        patterns.append('PERSO')

    return patterns

# Analyze all openers across both apps
all_openers = []
for c in tinder_convos:
    pats = classify_opener(c['opener'])
    all_openers.append({
        'app': 'Tinder',
        'opener': c['opener'][:80],
        'patterns': pats,
        'n_msgs': c['n'],
        'is_long': c['n'] >= 11,
        'is_ghost': c['n'] <= 2,
    })

for c in hinge_convos:
    pats = classify_opener(c['opener'])
    all_openers.append({
        'app': 'Hinge',
        'opener': c['opener'][:80],
        'patterns': pats,
        'n_msgs': c['n'],
        'is_long': c['n'] >= 16,
        'is_ghost': c['n'] <= 3,
    })

# Find best pattern combinations
print(f"\n  Analyse de {len(all_openers)} openers (Tinder + Hinge):")

# Pattern frequency and performance
pattern_stats = defaultdict(lambda: {'n': 0, 'msgs': 0, 'long': 0, 'ghost': 0})
for op in all_openers:
    for p in op['patterns']:
        pattern_stats[p]['n'] += 1
        pattern_stats[p]['msgs'] += op['n_msgs']
        pattern_stats[p]['long'] += 1 if op['is_long'] else 0
        pattern_stats[p]['ghost'] += 1 if op['is_ghost'] else 0

print(f"\n  Performance par pattern:")
print(f"  {'Pattern':<20} {'N':>4}  {'Msgs moy':>10}  {'Long%':>6}  {'Ghost%':>7}")
for p, s in sorted(pattern_stats.items(), key=lambda x: -x[1]['msgs']/max(x[1]['n'],1)):
    if s['n'] >= 3:
        avg = s['msgs'] / s['n']
        long_pct = s['long'] / s['n'] * 100
        ghost_pct = s['ghost'] / s['n'] * 100
        print(f"  {p:<20} {s['n']:4d}  {avg:10.1f}  {long_pct:5.0f}%  {ghost_pct:6.0f}%")

# Best combo: FR + QUESTION + MOYEN + PERSO
print(f"\n  Combos gagnantes (multi-pattern):")
combos = [
    ('FR+QUESTION+MOYEN', ['FR', 'QUESTION', 'MOYEN']),
    ('FR+QUESTION+PERSO', ['FR', 'QUESTION', 'PERSO']),
    ('FR+QUESTION', ['FR', 'QUESTION']),
    ('FR+REF_PROFIL', ['FR', 'REF_PROFIL']),
    ('EN+PAS_QUESTION', ['EN', 'PAS_QUESTION']),
    ('FR+COMPLIMENT', ['FR', 'COMPLIMENT']),
]

for label, required in combos:
    matching = [op for op in all_openers if all(r in op['patterns'] for r in required)]
    if matching:
        avg = sum(op['n_msgs'] for op in matching) / len(matching)
        ghost = sum(1 for op in matching if op['is_ghost']) / len(matching) * 100
        long_pct = sum(1 for op in matching if op['is_long']) / len(matching) * 100
        print(f"  {label:<25} N={len(matching):2d}, Msgs={avg:6.1f}, Ghost={ghost:4.0f}%, Long={long_pct:4.0f}%")

# Top 10 individual openers by convo length
print(f"\n  TOP 10 openers (par longueur de convo):")
sorted_openers = sorted(all_openers, key=lambda x: -x['n_msgs'])
for i, op in enumerate(sorted_openers[:10]):
    print(f"  #{i+1} [{op['app']}] {op['n_msgs']:4d} msgs | {op['opener'][:60]}...")


# =====================================================================
# H44: WEEKEND vs WEEKDAY MATCH QUALITY
# =====================================================================
print("\n" + "=" * 70)
print("  H44: QUALITE DES CONVOS WEEKEND vs SEMAINE")
print("=" * 70)

for label, convos, ghost_th, long_th in [
    ("TINDER", tinder_convos, 2, 11),
    ("HINGE", hinge_convos, 3, 16)
]:
    weekday = [c for c in convos if c['first_ts'].weekday() < 5]
    weekend = [c for c in convos if c['first_ts'].weekday() >= 5]

    for cat_label, cat_convos in [("Semaine (Lun-Ven)", weekday), ("Weekend (Sam-Dim)", weekend)]:
        if cat_convos:
            avg = sum(c['n'] for c in cat_convos) / len(cat_convos)
            ghost = sum(1 for c in cat_convos if c['n'] <= ghost_th) / len(cat_convos) * 100
            long_pct = sum(1 for c in cat_convos if c['n'] >= long_th) / len(cat_convos) * 100
            print(f"  {label} {cat_label}: N={len(cat_convos):2d}, Msgs={avg:6.1f}, Ghost={ghost:4.0f}%, Long={long_pct:4.0f}%")
    print()


# =====================================================================
# H45: RATIO ENVOYE/RECU (DAILY) COMME PREDICTEUR
# =====================================================================
print("=" * 70)
print("  H45: RATIO QUOTIDIEN ENVOYE/RECU → QUALITE DES CONVOS")
print("=" * 70)

# Daily sent/received ratio from Tinder Usage
sent_daily = usage.get('messages_sent', {})
recv_daily = usage.get('messages_received', {})

# For each convo, get the daily ratio on the day it started
print(f"\n  TINDER — Ratio sent/received le jour du 1er message:")
ratio_buckets = defaultdict(list)
for c in tinder_convos:
    d = c['first_ts'].strftime('%Y-%m-%d')
    s = sent_daily.get(d, 0)
    r = recv_daily.get(d, 0)
    if s > 0 and r > 0:
        ratio = s / r
        if ratio < 0.8:
            bucket = "Recoit plus (ratio<0.8)"
        elif ratio < 1.2:
            bucket = "Equilibre (0.8-1.2)"
        elif ratio < 2.0:
            bucket = "Envoie plus (1.2-2.0)"
        else:
            bucket = "Beaucoup plus envoye (2.0+)"
        ratio_buckets[bucket].append(c)

for bucket in ["Recoit plus (ratio<0.8)", "Equilibre (0.8-1.2)", "Envoie plus (1.2-2.0)", "Beaucoup plus envoye (2.0+)"]:
    if bucket in ratio_buckets:
        convos_list = ratio_buckets[bucket]
        avg = sum(c['n'] for c in convos_list) / len(convos_list)
        ghost = sum(1 for c in convos_list if c['n'] <= 2) / len(convos_list) * 100
        print(f"  {bucket:<35} N={len(convos_list):2d}, Msgs={avg:5.1f}, Ghost={ghost:4.0f}%")


# =====================================================================
# H46: ALTERNATION SPEED (proxy for engagement — Hinge)
# =====================================================================
print("\n" + "=" * 70)
print("  H46: VITESSE D'ALTERNATION DES MESSAGES (HINGE)")
print("=" * 70)

# On Hinge we don't know who sent what, but we can look at inter-message gaps
# Fast alternation = both engaged, slow = one-sided or dying
print(f"\n  HINGE — Gap median entre messages consecutifs -> engagement:")
for c in hinge_convos:
    if len(c['msgs']) >= 4:
        gaps = []
        for i in range(1, len(c['msgs'])):
            t1 = c['msgs'][i-1]['ts']
            t2 = c['msgs'][i]['ts']
            # handle timezone
            if t1.tzinfo: t1 = t1.replace(tzinfo=None)
            if t2.tzinfo: t2 = t2.replace(tzinfo=None)
            gap_h = (t2 - t1).total_seconds() / 3600
            if gap_h >= 0:
                gaps.append(gap_h)
        if gaps:
            c['median_gap'] = sorted(gaps)[len(gaps)//2]
            # Proportion of "fast" gaps (<30min)
            c['fast_ratio'] = sum(1 for g in gaps if g < 0.5) / len(gaps)
        else:
            c['median_gap'] = None
            c['fast_ratio'] = None
    else:
        c['median_gap'] = None
        c['fast_ratio'] = None

hinge_with_gaps = [c for c in hinge_convos if c.get('fast_ratio') is not None]

# Bucket by fast_ratio
print(f"  {'Fast ratio':<25} {'N':>3}  {'Msgs moy':>10}  {'Ghost%':>7}")
for label, lo, hi in [("Lent (<20% rapides)", 0, 0.2), ("Mixte (20-50%)", 0.2, 0.5), ("Rapide (50%+ rapides)", 0.5, 1.01)]:
    bucket = [c for c in hinge_with_gaps if lo <= c['fast_ratio'] < hi]
    if bucket:
        avg = sum(c['n'] for c in bucket) / len(bucket)
        ghost = sum(1 for c in bucket if c['n'] <= 3) / len(bucket) * 100
        print(f"  {label:<25} {len(bucket):3d}  {avg:10.1f}  {ghost:6.0f}%")


# =====================================================================
# H47: SEASONAL QUALITY BY CALENDAR MONTH
# =====================================================================
print("\n" + "=" * 70)
print("  H47: QUALITE DES CONVOS PAR MOIS CALENDAIRE")
print("=" * 70)

for label, convos, ghost_th, long_th in [
    ("TINDER", tinder_convos, 2, 11),
    ("HINGE", hinge_convos, 3, 16)
]:
    monthly = defaultdict(list)
    for c in convos:
        m = c['first_ts'].strftime('%Y-%m')
        monthly[m].append(c)

    print(f"\n  {label}:")
    print(f"  {'Mois':<10} {'N':>3}  {'Msgs moy':>10}  {'Ghost%':>7}  {'Long%':>6}")
    for month in sorted(monthly.keys()):
        mc = monthly[month]
        avg = sum(c['n'] for c in mc) / len(mc)
        ghost = sum(1 for c in mc if c['n'] <= ghost_th) / len(mc) * 100
        long_pct = sum(1 for c in mc if c['n'] >= long_th) / len(mc) * 100
        print(f"  {month:<10} {len(mc):3d}  {avg:10.1f}  {ghost:6.0f}%  {long_pct:5.0f}%")


# =====================================================================
# H48: HIGH-ACTIVITY DAY → WORSE CONVOS?
# =====================================================================
print("\n" + "=" * 70)
print("  H48: JOUR HAUTE ACTIVITE → CONVOS PIRES ?")
print("=" * 70)

print(f"\n  TINDER — Likes le jour du 1er message → qualite de la convo:")
activity_buckets = defaultdict(list)
for c in tinder_convos:
    d = c['first_ts'].strftime('%Y-%m-%d')
    likes = usage.get('swipes_likes', {}).get(d, 0)
    if likes <= 10:
        bucket = "Faible (0-10 likes)"
    elif likes <= 30:
        bucket = "Normal (11-30)"
    elif likes <= 60:
        bucket = "Eleve (31-60)"
    else:
        bucket = "Burst (60+)"
    activity_buckets[bucket].append(c)

for bucket in ["Faible (0-10 likes)", "Normal (11-30)", "Eleve (31-60)", "Burst (60+)"]:
    if bucket in activity_buckets:
        bc = activity_buckets[bucket]
        avg = sum(c['n'] for c in bc) / len(bc)
        ghost = sum(1 for c in bc if c['n'] <= 2) / len(bc) * 100
        print(f"  {bucket:<25} N={len(bc):2d}, Msgs={avg:5.1f}, Ghost={ghost:4.0f}%")


# =====================================================================
# H49: SOCIAL SHARING TIMING — a quel message #
# =====================================================================
print("\n" + "=" * 70)
print("  H49: MOMENT DU PARTAGE SOCIAL (message #)")
print("=" * 70)

SOCIAL_PATTERNS = {
    'instagram': re.compile(r'insta(?:gram)?|@\w+', re.I),
    'whatsapp': re.compile(r'whatsapp|whats\s*app', re.I),
    'numero': re.compile(r'(?:0[67]\d{8}|\+33\s*[67])', re.I),
    'snapchat': re.compile(r'snap(?:chat)?', re.I),
}

for label, convos in [("TINDER", tinder_convos), ("HINGE", hinge_convos)]:
    print(f"\n  {label} — Message # du 1er partage social:")
    share_positions = []
    for c in convos:
        for i, m in enumerate(c['msgs']):
            for stype, pattern in SOCIAL_PATTERNS.items():
                if pattern.search(m['body']):
                    pct_through = (i + 1) / c['n'] * 100
                    share_positions.append({
                        'type': stype,
                        'msg_num': i + 1,
                        'total_msgs': c['n'],
                        'pct': pct_through,
                    })
                    break
            else:
                continue
            break  # Only first social share per convo

    if share_positions:
        for sp in share_positions:
            print(f"    {sp['type']:<12} au msg #{sp['msg_num']:3d} / {sp['total_msgs']:3d} ({sp['pct']:.0f}% de la convo)")

        avg_msg = sum(s['msg_num'] for s in share_positions) / len(share_positions)
        avg_pct = sum(s['pct'] for s in share_positions) / len(share_positions)
        print(f"  Moyenne: msg #{avg_msg:.0f} ({avg_pct:.0f}% de la convo)")
    else:
        print(f"  Aucun partage social detecte")


# =====================================================================
# H50: MOT-CLE DECLENCHEUR — mots qui predisent les longues convos
# =====================================================================
print("\n" + "=" * 70)
print("  H50: MOTS DECLENCHEURS — frequence dans convos longues vs courtes")
print("=" * 70)

# Combine all messages per convo into text, then compare word frequency
import html

def clean_text(text):
    text = html.unescape(text)
    text = re.sub(r'http\S+', '', text)
    text = text.lower()
    text = re.sub(r'[^\w\sàâäéèêëïîôùûüÿçœæ]', ' ', text)
    return text

for label, convos, long_th in [("TINDER", tinder_convos, 11), ("HINGE", hinge_convos, 16)]:
    long_words = Counter()
    short_words = Counter()
    long_n = 0
    short_n = 0

    for c in convos:
        full_text = ' '.join(clean_text(m['body']) for m in c['msgs'])
        words = [w for w in full_text.split() if len(w) >= 4]  # min 4 chars
        word_set = set(words)  # unique per convo

        if c['n'] >= long_th:
            for w in word_set:
                long_words[w] += 1
            long_n += 1
        elif c['n'] <= 3:  # ghost
            for w in word_set:
                short_words[w] += 1
            short_n += 1

    print(f"\n  {label} — Mots surrepresentes dans convos longues (>={long_th} msgs) vs ghost (<=3):")
    print(f"  {long_n} convos longues, {short_n} convos ghost")
    print(f"\n  {'Mot':<20} {'Long':>5} {'Ghost':>5}  {'Ratio':>6}  Signal")

    # Find words that appear in long convos but rarely in ghost convos
    trigger_words = []
    for word, count in long_words.most_common(200):
        if count >= 2:  # Appear in at least 2 long convos
            ghost_count = short_words.get(word, 0)
            long_pct = count / long_n
            ghost_pct = ghost_count / short_n if short_n > 0 else 0
            if ghost_pct == 0 and long_pct > 0.2:
                ratio = 99.0  # infinity proxy
                trigger_words.append((word, count, ghost_count, ratio))
            elif ghost_pct > 0:
                ratio = long_pct / ghost_pct
                if ratio >= 1.5:
                    trigger_words.append((word, count, ghost_count, ratio))

    trigger_words.sort(key=lambda x: -x[3])
    for word, lc, gc, ratio in trigger_words[:20]:
        signal = "⭐ EXCLUSIF" if gc == 0 else "↑ surrepr"
        print(f"  {word:<20} {lc:5d} {gc:5d}  {ratio:5.1f}×  {signal}")

    # Words that appear MORE in ghost than long
    print(f"\n  Mots surrepresentes dans GHOST (danger):")
    danger_words = []
    for word, count in short_words.most_common(200):
        if count >= 2:
            long_count = long_words.get(word, 0)
            ghost_pct = count / short_n
            long_pct = long_count / long_n if long_n > 0 else 0
            if long_pct == 0 and ghost_pct > 0.1:
                danger_words.append((word, long_count, count, 99.0))
            elif long_pct > 0:
                ratio = ghost_pct / long_pct
                if ratio >= 1.5 and count >= 2:
                    danger_words.append((word, long_count, count, ratio))

    danger_words.sort(key=lambda x: -x[3])
    for word, lc, gc, ratio in danger_words[:15]:
        signal = "❌ EXCLUSIF ghost" if lc == 0 else "↓ danger"
        print(f"  {word:<20} Long={lc:2d} Ghost={gc:2d}  {ratio:5.1f}×  {signal}")


# =====================================================================
# SYNTHESE
# =====================================================================
print("\n" + "=" * 70)
print("  SYNTHESE H41-H50")
print("=" * 70)
print(f"\n  Resultats complets ci-dessus.")
