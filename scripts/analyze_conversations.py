"""
Analyse croisée des conversations Hinge + Tinder pour Jonathan.
Extrait les patterns de discussion, timing, longueur, et qualité.
"""

import json
import sys
import os
from datetime import datetime, timedelta
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ============================================================
# HINGE
# ============================================================

def analyze_hinge(matches_path):
    with open(matches_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    conversations = []

    for entry in data:
        match_info = entry.get('match', [])
        chats = entry.get('chats', [])

        if not chats:
            continue

        # Parse timestamps
        messages = []
        for chat in chats:
            body = chat.get('body', '')
            ts_str = chat.get('timestamp', '')
            try:
                ts = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S')
            except:
                continue
            messages.append({
                'body': body,
                'timestamp': ts,
                'length': len(body)
            })

        if not messages:
            continue

        # Sort by timestamp
        messages.sort(key=lambda x: x['timestamp'])

        # Match timestamp
        match_ts = None
        if match_info:
            try:
                match_ts = datetime.strptime(match_info[0].get('timestamp', ''), '%Y-%m-%d %H:%M:%S')
            except:
                pass

        # Hinge doesn't identify sender in export, but we can analyze patterns
        first_msg = messages[0]
        last_msg = messages[-1]
        duration = (last_msg['timestamp'] - first_msg['timestamp']).total_seconds() / 3600  # hours

        # Detect message patterns
        avg_msg_length = sum(m['length'] for m in messages) / len(messages)

        # Response time analysis (time between consecutive messages)
        response_times = []
        for i in range(1, len(messages)):
            gap = (messages[i]['timestamp'] - messages[i-1]['timestamp']).total_seconds() / 3600
            response_times.append(gap)

        avg_response_time = sum(response_times) / len(response_times) if response_times else 0

        # Detect date mentions
        date_keywords = ['boire un verre', 'on se voit', 'se retrouver', 'rdv', 'rendez-vous',
                         'rencontrer', 'dispo', 'disponible', 'ce soir', 'ce week', 'samedi',
                         'dimanche', 'vendredi', 'bar', 'restaurant', 'café', 'numéro', 'whatsapp',
                         'insta', 'instagram', 'tel', 'téléphone', 'appel', 'visio']

        date_mentioned = False
        date_msg_index = None
        for i, m in enumerate(messages):
            body_lower = m['body'].lower()
            if any(kw in body_lower for kw in date_keywords):
                date_mentioned = True
                date_msg_index = i
                break

        # Detect conversation themes
        themes = {
            'voyage': ['voyage', 'pays', 'japon', 'népal', 'île', 'maurice', 'avion', 'road trip', 'kyoto', 'himalaya', 'calanques'],
            'travail': ['travail', 'boulot', 'bureau', 'consultant', 'conseil', 'défense', 'réunion', 'boss', 'job'],
            'food': ['restaurant', 'restau', 'cuisine', 'manger', 'plat', 'brunch', 'croissant', 'sushi', 'café', 'vin', 'verre'],
            'chien': ['chien', 'whippet', 'toutou', 'animal', 'promener'],
            'culture': ['film', 'série', 'musique', 'livre', 'expo', 'musée', 'concert', 'spectacle'],
            'perso': ['famille', 'frère', 'soeur', 'parent', 'origine', 'mauricien', 'sri lank', 'communauté'],
            'relation': ['relation', 'couple', 'ex', 'célibataire', 'cherche', 'sérieux', 'casual', 'match', 'date'],
            'humour': ['😂', '😅', '🤣', '😜', '😏', 'haha', 'lol', 'mdr', 'ptdr', 'mort de rire', 'drôle'],
            'compliment': ['belle', 'beau', 'jolie', 'mignon', 'craquant', 'sourire', 'yeux', 'charme'],
            'paris': ['paris', 'quartier', 'arrondissement', 'marais', 'châtelet', 'bastille', 'montmartre', 'métro']
        }

        convo_themes = []
        all_text = ' '.join(m['body'].lower() for m in messages)
        for theme, keywords in themes.items():
            if any(kw in all_text for kw in keywords):
                convo_themes.append(theme)

        # Message hour distribution
        hours = [m['timestamp'].hour for m in messages]

        # Day of week
        days = [m['timestamp'].strftime('%A') for m in messages]

        conversations.append({
            'msg_count': len(messages),
            'duration_hours': round(duration, 1),
            'avg_msg_length': round(avg_msg_length, 1),
            'avg_response_time_hours': round(avg_response_time, 1),
            'date_mentioned': date_mentioned,
            'date_msg_index': date_msg_index,
            'themes': convo_themes,
            'hours': hours,
            'days': days,
            'first_msg': first_msg['body'][:80],
            'first_msg_timestamp': first_msg['timestamp'].isoformat(),
            'all_messages': [{'body': m['body'], 'ts': m['timestamp'].isoformat(), 'len': m['length']} for m in messages]
        })

    return conversations


# ============================================================
# TINDER
# ============================================================

def analyze_tinder(data_path):
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tinder_messages = data.get('Messages', [])
    conversations = []

    for convo in tinder_messages:
        messages_raw = convo.get('messages', [])
        if not messages_raw:
            continue

        messages = []
        for msg in messages_raw:
            body = msg.get('message', '')
            ts_str = msg.get('sent_date', '')
            sender = msg.get('from', 'unknown')

            # Try parsing Tinder date format
            ts = None
            for fmt in ['%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d %H:%M:%S']:
                try:
                    ts = datetime.strptime(ts_str, fmt)
                    break
                except:
                    continue

            if ts is None:
                continue

            messages.append({
                'body': body,
                'timestamp': ts,
                'length': len(body),
                'sender': sender
            })

        if not messages:
            continue

        messages.sort(key=lambda x: x['timestamp'])

        first_msg = messages[0]
        last_msg = messages[-1]
        duration = (last_msg['timestamp'] - first_msg['timestamp']).total_seconds() / 3600

        avg_msg_length = sum(m['length'] for m in messages) / len(messages)

        # Identify Jonathan vs match messages
        # On Tinder, "from" field contains the sender name
        senders = set(m['sender'] for m in messages)

        # Find who sends first
        first_sender = first_msg['sender']

        # Response times
        response_times = []
        for i in range(1, len(messages)):
            if messages[i]['sender'] != messages[i-1]['sender']:
                gap = (messages[i]['timestamp'] - messages[i-1]['timestamp']).total_seconds() / 3600
                response_times.append(gap)

        avg_response_time = sum(response_times) / len(response_times) if response_times else 0

        # Date mentions
        date_keywords = ['boire un verre', 'on se voit', 'se retrouver', 'rdv', 'rendez-vous',
                         'rencontrer', 'dispo', 'disponible', 'ce soir', 'ce week', 'samedi',
                         'dimanche', 'vendredi', 'bar', 'restaurant', 'café', 'numéro', 'whatsapp',
                         'insta', 'instagram', 'tel', 'téléphone', 'appel', 'visio', 'drink']

        date_mentioned = False
        date_msg_index = None
        for i, m in enumerate(messages):
            body_lower = m['body'].lower()
            if any(kw in body_lower for kw in date_keywords):
                date_mentioned = True
                date_msg_index = i
                break

        # Themes
        themes = {
            'voyage': ['voyage', 'pays', 'japon', 'népal', 'île', 'maurice', 'avion', 'road trip', 'kyoto', 'himalaya', 'calanques'],
            'travail': ['travail', 'boulot', 'bureau', 'consultant', 'conseil', 'défense', 'réunion', 'boss', 'job'],
            'food': ['restaurant', 'restau', 'cuisine', 'manger', 'plat', 'brunch', 'croissant', 'sushi', 'café', 'vin', 'verre'],
            'chien': ['chien', 'whippet', 'toutou', 'animal', 'promener'],
            'culture': ['film', 'série', 'musique', 'livre', 'expo', 'musée', 'concert', 'spectacle'],
            'perso': ['famille', 'frère', 'soeur', 'parent', 'origine', 'mauricien', 'sri lank', 'communauté'],
            'relation': ['relation', 'couple', 'ex', 'célibataire', 'cherche', 'sérieux', 'casual', 'match', 'date'],
            'humour': ['😂', '😅', '🤣', '😜', '😏', 'haha', 'lol', 'mdr', 'ptdr', 'mort de rire', 'drôle'],
            'compliment': ['belle', 'beau', 'jolie', 'mignon', 'craquant', 'sourire', 'yeux', 'charme'],
            'paris': ['paris', 'quartier', 'arrondissement', 'marais', 'châtelet', 'bastille', 'montmartre', 'métro']
        }

        convo_themes = []
        all_text = ' '.join(m['body'].lower() for m in messages)
        for theme, keywords in themes.items():
            if any(kw in all_text for kw in keywords):
                convo_themes.append(theme)

        hours = [m['timestamp'].hour for m in messages]
        days = [m['timestamp'].strftime('%A') for m in messages]

        # Per-sender stats
        sender_stats = {}
        for sender in senders:
            sender_msgs = [m for m in messages if m['sender'] == sender]
            sender_stats[sender] = {
                'count': len(sender_msgs),
                'avg_length': round(sum(m['length'] for m in sender_msgs) / len(sender_msgs), 1) if sender_msgs else 0,
                'total_chars': sum(m['length'] for m in sender_msgs)
            }

        conversations.append({
            'msg_count': len(messages),
            'duration_hours': round(duration, 1),
            'avg_msg_length': round(avg_msg_length, 1),
            'avg_response_time_hours': round(avg_response_time, 1),
            'date_mentioned': date_mentioned,
            'date_msg_index': date_msg_index,
            'themes': convo_themes,
            'hours': hours,
            'days': days,
            'first_sender': first_sender,
            'senders': sender_stats,
            'first_msg': first_msg['body'][:80],
            'first_msg_timestamp': first_msg['timestamp'].isoformat(),
            'all_messages': [{'body': m['body'], 'ts': m['timestamp'].isoformat(), 'len': m['length'], 'sender': m['sender']} for m in messages]
        })

    return conversations


# ============================================================
# AGGREGATE ANALYSIS
# ============================================================

def aggregate_analysis(convos, app_name):
    print(f"\n{'='*60}")
    print(f"  {app_name} — ANALYSE DES CONVERSATIONS")
    print(f"{'='*60}\n")

    if not convos:
        print("Aucune conversation trouvée.")
        return

    total = len(convos)
    total_messages = sum(c['msg_count'] for c in convos)

    # Basic stats
    msg_counts = [c['msg_count'] for c in convos]
    durations = [c['duration_hours'] for c in convos]
    avg_lengths = [c['avg_msg_length'] for c in convos]

    print(f"📊 STATISTIQUES GLOBALES")
    print(f"  Conversations totales : {total}")
    print(f"  Messages totaux : {total_messages}")
    print(f"  Messages/convo : moy={sum(msg_counts)/total:.1f}, med={sorted(msg_counts)[total//2]}, min={min(msg_counts)}, max={max(msg_counts)}")
    print(f"  Durée convo (h) : moy={sum(durations)/total:.1f}, med={sorted(durations)[total//2]:.1f}, max={max(durations):.1f}")
    print(f"  Long. msg (chars) : moy={sum(avg_lengths)/total:.1f}")

    # Conversation length buckets
    print(f"\n📏 DISTRIBUTION LONGUEUR CONVERSATIONS")
    buckets = {'1-2 msgs (ghost)': 0, '3-5 msgs (court)': 0, '6-15 msgs (moyen)': 0, '16-30 msgs (long)': 0, '30+ msgs (très long)': 0}
    for c in convos:
        n = c['msg_count']
        if n <= 2: buckets['1-2 msgs (ghost)'] += 1
        elif n <= 5: buckets['3-5 msgs (court)'] += 1
        elif n <= 15: buckets['6-15 msgs (moyen)'] += 1
        elif n <= 30: buckets['16-30 msgs (long)'] += 1
        else: buckets['30+ msgs (très long)'] += 1

    for bucket, count in buckets.items():
        pct = count / total * 100
        bar = '█' * int(pct / 2)
        print(f"  {bucket:30s} {count:3d} ({pct:5.1f}%) {bar}")

    # Date mention analysis
    date_convos = [c for c in convos if c['date_mentioned']]
    print(f"\n📅 PROPOSITION DE DATE")
    print(f"  Convos avec mention date : {len(date_convos)}/{total} ({len(date_convos)/total*100:.1f}%)")
    if date_convos:
        date_positions = [c['date_msg_index'] for c in date_convos if c['date_msg_index'] is not None]
        if date_positions:
            print(f"  Position moyenne de la mention : message #{sum(date_positions)/len(date_positions):.1f}")
            print(f"  Position médiane : message #{sorted(date_positions)[len(date_positions)//2]}")

    # Theme analysis
    print(f"\n🎯 THÈMES ABORDÉS")
    theme_counts = Counter()
    for c in convos:
        for t in c['themes']:
            theme_counts[t] += 1

    for theme, count in theme_counts.most_common():
        pct = count / total * 100
        bar = '█' * int(pct / 2)
        print(f"  {theme:15s} {count:3d} ({pct:5.1f}%) {bar}")

    # Hour analysis
    print(f"\n🕐 HEURES D'ACTIVITÉ")
    all_hours = []
    for c in convos:
        all_hours.extend(c['hours'])

    hour_counts = Counter(all_hours)
    peak_hours = hour_counts.most_common(5)
    print(f"  Top 5 heures : {', '.join(f'{h}h ({c} msgs)' for h, c in peak_hours)}")

    # Hour buckets
    morning = sum(1 for h in all_hours if 6 <= h < 12)
    afternoon = sum(1 for h in all_hours if 12 <= h < 18)
    evening = sum(1 for h in all_hours if 18 <= h < 23)
    night = sum(1 for h in all_hours if h >= 23 or h < 6)
    total_h = len(all_hours)
    print(f"  Matin (6-12h)   : {morning:4d} ({morning/total_h*100:.1f}%)")
    print(f"  Après-midi (12-18h): {afternoon:4d} ({afternoon/total_h*100:.1f}%)")
    print(f"  Soirée (18-23h) : {evening:4d} ({evening/total_h*100:.1f}%)")
    print(f"  Nuit (23-6h)    : {night:4d} ({night/total_h*100:.1f}%)")

    # Day analysis
    print(f"\n📅 JOURS D'ACTIVITÉ")
    all_days = []
    for c in convos:
        all_days.extend(c['days'])

    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    day_counts = Counter(all_days)
    for day in day_order:
        count = day_counts.get(day, 0)
        pct = count / len(all_days) * 100 if all_days else 0
        bar = '█' * int(pct / 2)
        print(f"  {day:12s} {count:4d} ({pct:5.1f}%) {bar}")

    # First messages analysis
    print(f"\n💬 PREMIERS MESSAGES (échantillon)")
    for i, c in enumerate(convos[:15]):
        print(f"  {i+1}. [{c['first_msg_timestamp'][:10]}] ({c['msg_count']} msgs, {c['duration_hours']}h) {c['first_msg']}")

    # Ghost analysis (conversations that died quickly)
    ghosts = [c for c in convos if c['msg_count'] <= 3]
    long_convos = [c for c in convos if c['msg_count'] >= 15]

    print(f"\n👻 ANALYSE GHOST vs LONGUES")
    print(f"  Conversations ghost (≤3 msgs) : {len(ghosts)} ({len(ghosts)/total*100:.1f}%)")
    print(f"  Conversations longues (≥15 msgs) : {len(long_convos)} ({len(long_convos)/total*100:.1f}%)")

    if ghosts:
        ghost_themes = Counter()
        for c in ghosts:
            for t in c['themes']:
                ghost_themes[t] += 1
        if ghost_themes:
            print(f"  Thèmes ghost : {dict(ghost_themes.most_common(5))}")

    if long_convos:
        long_themes = Counter()
        for c in long_convos:
            for t in c['themes']:
                long_themes[t] += 1
        if long_themes:
            print(f"  Thèmes longues : {dict(long_themes.most_common(5))}")

        # Did long convos lead to dates?
        long_with_date = [c for c in long_convos if c['date_mentioned']]
        print(f"  Longues → date mentionné : {len(long_with_date)}/{len(long_convos)} ({len(long_with_date)/len(long_convos)*100:.1f}%)")

    # Response time
    print(f"\n⏱️ TEMPS DE RÉPONSE MOYEN")
    resp_times = [c['avg_response_time_hours'] for c in convos if c['avg_response_time_hours'] > 0]
    if resp_times:
        print(f"  Moyenne : {sum(resp_times)/len(resp_times):.1f}h")
        print(f"  Médiane : {sorted(resp_times)[len(resp_times)//2]:.1f}h")

    # Detailed conversation dump for the longest ones
    print(f"\n📝 CONVERSATIONS LES PLUS LONGUES (top 5)")
    sorted_convos = sorted(convos, key=lambda c: c['msg_count'], reverse=True)
    for i, c in enumerate(sorted_convos[:5]):
        print(f"\n  --- Convo #{i+1} ({c['msg_count']} msgs, {c['duration_hours']}h, thèmes: {c['themes']}) ---")
        for j, m in enumerate(c['all_messages']):
            sender_tag = f"[{m.get('sender', '?')[:15]}]" if 'sender' in m else ""
            body_preview = m['body'][:120].replace('\n', ' ')
            print(f"    {j+1:2d}. {m['ts'][5:16]} {sender_tag} {body_preview}")

    return {
        'total_convos': total,
        'total_messages': total_messages,
        'ghost_rate': len(ghosts) / total * 100,
        'long_rate': len(long_convos) / total * 100,
        'date_mention_rate': len(date_convos) / total * 100,
        'top_themes': dict(theme_counts.most_common()),
        'peak_hours': dict(peak_hours)
    }


# ============================================================
# TINDER-SPECIFIC: Sender analysis
# ============================================================

def tinder_sender_analysis(convos):
    print(f"\n{'='*60}")
    print(f"  TINDER — ANALYSE PAR SENDER")
    print(f"{'='*60}\n")

    # Find Jonathan's sender name (most frequent sender across all convos)
    all_senders = Counter()
    for c in convos:
        for sender, stats in c.get('senders', {}).items():
            all_senders[sender] += stats['count']

    if not all_senders:
        print("Pas de données sender.")
        return

    # The most frequent sender is likely Jonathan
    jonathan_name = all_senders.most_common(1)[0][0]
    print(f"  Sender principal (toi) : '{jonathan_name}' ({all_senders[jonathan_name]} msgs)")
    print(f"  Nombre de partenaires uniques : {len(all_senders) - 1}")

    # Who sends first?
    jonathan_first = sum(1 for c in convos if c.get('first_sender') == jonathan_name)
    match_first = len(convos) - jonathan_first
    print(f"\n  📨 QUI ENVOIE LE PREMIER MESSAGE ?")
    print(f"    Toi : {jonathan_first} ({jonathan_first/len(convos)*100:.1f}%)")
    print(f"    Elle : {match_first} ({match_first/len(convos)*100:.1f}%)")

    # Message length comparison
    jonathan_lengths = []
    match_lengths = []
    jonathan_total_msgs = 0
    match_total_msgs = 0

    for c in convos:
        for m in c.get('all_messages', []):
            if m.get('sender') == jonathan_name:
                jonathan_lengths.append(m['len'])
                jonathan_total_msgs += 1
            else:
                match_lengths.append(m['len'])
                match_total_msgs += 1

    print(f"\n  📊 COMPARAISON MESSAGES")
    print(f"    Tes messages : {jonathan_total_msgs} (moy. {sum(jonathan_lengths)/len(jonathan_lengths):.0f} chars)" if jonathan_lengths else "    Tes messages : 0")
    print(f"    Ses messages : {match_total_msgs} (moy. {sum(match_lengths)/len(match_lengths):.0f} chars)" if match_lengths else "    Ses messages : 0")

    if jonathan_lengths and match_lengths:
        ratio = sum(jonathan_lengths) / sum(match_lengths) if sum(match_lengths) > 0 else 999
        print(f"    Ratio investissement (toi/elle en chars) : {ratio:.2f}x")
        if ratio > 1.5:
            print(f"    ⚠️ Tu écris {ratio:.1f}x plus qu'elles — over-investing")
        elif ratio < 0.7:
            print(f"    ✅ Elles écrivent plus que toi — bon signe d'engagement")
        else:
            print(f"    ✅ Équilibré")

    # Partner engagement analysis
    print(f"\n  👥 ENGAGEMENT PAR PARTENAIRE")
    partner_engagement = []
    for c in convos:
        senders = c.get('senders', {})
        jonathan_msgs = senders.get(jonathan_name, {}).get('count', 0)
        for sender, stats in senders.items():
            if sender != jonathan_name:
                ratio = stats['count'] / jonathan_msgs if jonathan_msgs > 0 else 0
                partner_engagement.append({
                    'name': sender[:20],
                    'her_msgs': stats['count'],
                    'his_msgs': jonathan_msgs,
                    'total': c['msg_count'],
                    'ratio': ratio,
                    'date_mentioned': c['date_mentioned'],
                    'themes': c['themes'],
                    'duration_hours': c['duration_hours']
                })

    # Sort by engagement
    partner_engagement.sort(key=lambda x: x['total'], reverse=True)

    print(f"  {'Partenaire':<22s} {'Elle':>5s} {'Toi':>5s} {'Ratio':>6s} {'Date?':>6s} {'Durée':>7s}")
    print(f"  {'-'*60}")
    for p in partner_engagement[:20]:
        date_flag = '✅' if p['date_mentioned'] else '  '
        print(f"  {p['name']:<22s} {p['her_msgs']:>5d} {p['his_msgs']:>5d} {p['ratio']:>5.2f}x {date_flag:>6s} {p['duration_hours']:>6.1f}h")

    # Investment vs outcome
    print(f"\n  📈 INVESTISSEMENT vs RÉSULTAT")
    over_invest = [p for p in partner_engagement if p['ratio'] < 0.5 and p['total'] > 5]
    mutual = [p for p in partner_engagement if 0.7 <= p['ratio'] <= 1.5 and p['total'] > 5]
    she_chases = [p for p in partner_engagement if p['ratio'] > 1.5 and p['total'] > 5]

    print(f"    Over-investing (ratio < 0.5) : {len(over_invest)} convos")
    print(f"    Équilibré (0.7-1.5)          : {len(mutual)} convos")
    print(f"    Elle s'investit + (ratio > 1.5) : {len(she_chases)} convos")


# ============================================================
# MAIN
# ============================================================

if __name__ == '__main__':
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Hinge
    hinge_path = os.path.join(base, 'Personal', 'Hinge', 'matches.json')
    if os.path.exists(hinge_path):
        hinge_convos = analyze_hinge(hinge_path)
        hinge_stats = aggregate_analysis(hinge_convos, "HINGE")
    else:
        print(f"Fichier Hinge non trouvé : {hinge_path}")

    # Tinder
    tinder_path = os.path.join(base, 'Personal', 'Tinder', 'data.json')
    if os.path.exists(tinder_path):
        tinder_convos = analyze_tinder(tinder_path)
        tinder_stats = aggregate_analysis(tinder_convos, "TINDER")
        tinder_sender_analysis(tinder_convos)
    else:
        print(f"Fichier Tinder non trouvé : {tinder_path}")

    # Cross-app comparison
    if 'hinge_stats' in dir() and 'tinder_stats' in dir():
        print(f"\n{'='*60}")
        print(f"  COMPARAISON CROISÉE HINGE vs TINDER")
        print(f"{'='*60}\n")

        metrics = [
            ('Conversations', hinge_stats['total_convos'], tinder_stats['total_convos']),
            ('Messages totaux', hinge_stats['total_messages'], tinder_stats['total_messages']),
            ('Taux ghost (≤3 msgs)', f"{hinge_stats['ghost_rate']:.1f}%", f"{tinder_stats['ghost_rate']:.1f}%"),
            ('Taux longues (≥15 msgs)', f"{hinge_stats['long_rate']:.1f}%", f"{tinder_stats['long_rate']:.1f}%"),
            ('Mention date', f"{hinge_stats['date_mention_rate']:.1f}%", f"{tinder_stats['date_mention_rate']:.1f}%"),
        ]

        print(f"  {'Métrique':<30s} {'Hinge':>12s} {'Tinder':>12s}")
        print(f"  {'-'*55}")
        for name, h, t in metrics:
            print(f"  {name:<30s} {str(h):>12s} {str(t):>12s}")
