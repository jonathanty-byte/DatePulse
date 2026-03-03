"""
Analyze Jonathan's personal Tinder GDPR export (data.json)
Extracts: usage stats, swipes, matches, messages, profile info
"""
import json
import sys
from datetime import datetime
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DATA_PATH = r"C:\Users\jonat\projects\DatePulse\Personal\Tinder\data.json"
OUTPUT_PATH = r"C:\Users\jonat\projects\DatePulse\Personal\tinder_analysis.json"

def parse_date(date_str):
    """Parse various Tinder date formats"""
    for fmt in ["%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"]:
        try:
            return datetime.strptime(date_str, fmt)
        except:
            continue
    return None

def analyze():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    report = {}

    # 1. Top-level keys
    top_keys = list(data.keys())
    report["structure"] = {
        "top_level_keys": top_keys,
        "key_types": {k: type(v).__name__ for k, v in data.items()}
    }
    print(f"=== TOP-LEVEL KEYS ===")
    for k in top_keys:
        v = data[k]
        if isinstance(v, dict):
            print(f"  {k}: dict with {len(v)} keys -> {list(v.keys())[:20]}")
        elif isinstance(v, list):
            print(f"  {k}: list with {len(v)} items")
        else:
            print(f"  {k}: {type(v).__name__}")

    # 2. Usage stats
    if "Usage" in data:
        usage = data["Usage"]
        report["usage"] = usage
        print(f"\n=== USAGE ===")
        for k, v in usage.items():
            if isinstance(v, dict):
                print(f"  {k}: {len(v)} entries")
                # Show first/last few
                items = list(v.items())
                if items:
                    print(f"    First: {items[0]}")
                    print(f"    Last: {items[-1]}")
                    # Sum if numeric
                    try:
                        total = sum(int(x) for x in v.values())
                        print(f"    Total: {total}")
                    except:
                        pass
            else:
                print(f"  {k}: {v}")

    # 3. Profile / User info
    for key in ["User", "Profile", "user", "profile"]:
        if key in data:
            profile = data[key]
            report["profile"] = profile
            print(f"\n=== PROFILE ({key}) ===")
            if isinstance(profile, dict):
                for k, v in profile.items():
                    if isinstance(v, (str, int, float, bool)):
                        print(f"  {k}: {v}")
                    elif isinstance(v, list):
                        print(f"  {k}: list[{len(v)}] -> {v[:3]}")
                    elif isinstance(v, dict):
                        print(f"  {k}: dict[{len(v)}]")

    # 4. Swipes / Likes
    swipe_data = {}
    for key in ["Swipes", "swipes", "SwipeLikes", "swipe_likes", "SwipeNotes"]:
        if key in data:
            swipe_data[key] = data[key]

    if swipe_data:
        print(f"\n=== SWIPES ===")
        for k, v in swipe_data.items():
            if isinstance(v, dict):
                print(f"  {k}: {len(v)} keys -> {list(v.keys())[:10]}")
                for sk, sv in v.items():
                    if isinstance(sv, (int, str)):
                        print(f"    {sk}: {sv}")
                    elif isinstance(sv, list):
                        print(f"    {sk}: list[{len(sv)}]")
            elif isinstance(v, list):
                print(f"  {k}: list[{len(v)}]")
        report["swipes"] = {k: str(v)[:500] for k, v in swipe_data.items()}

    # 5. Matches
    matches_data = None
    for key in ["Matches", "matches"]:
        if key in data:
            matches_data = data[key]
            break

    if matches_data:
        if isinstance(matches_data, list):
            print(f"\n=== MATCHES ===")
            print(f"  Total matches: {len(matches_data)}")
            if matches_data:
                sample = matches_data[0]
                print(f"  Sample match keys: {list(sample.keys()) if isinstance(sample, dict) else 'not a dict'}")
                report["matches_count"] = len(matches_data)
                report["matches_sample"] = str(sample)[:500]
        elif isinstance(matches_data, dict):
            print(f"\n=== MATCHES ===")
            print(f"  Keys: {list(matches_data.keys())[:10]}")
            for k, v in matches_data.items():
                if isinstance(v, (int, str)):
                    print(f"  {k}: {v}")

    # 6. Messages
    messages_data = None
    for key in ["Messages", "messages"]:
        if key in data:
            messages_data = data[key]
            break

    if messages_data:
        print(f"\n=== MESSAGES ===")
        if isinstance(messages_data, list):
            print(f"  Total conversations: {len(messages_data)}")

            total_msgs = 0
            sent_msgs = 0
            received_msgs = 0
            conv_lengths = []
            first_dates = []
            last_dates = []
            hourly = Counter()
            daily = Counter()
            monthly = Counter()
            msg_lengths_sent = []
            msg_lengths_received = []
            conversations_detail = []

            for conv in messages_data:
                if isinstance(conv, dict):
                    msgs = conv.get("messages", conv.get("Messages", []))
                    match_id = conv.get("match_id", "unknown")

                    if isinstance(msgs, list) and len(msgs) > 0:
                        conv_msg_count = len(msgs)
                        total_msgs += conv_msg_count
                        conv_lengths.append(conv_msg_count)

                        sent_in_conv = 0
                        received_in_conv = 0
                        dates_in_conv = []

                        for msg in msgs:
                            if isinstance(msg, dict):
                                # Count sent vs received
                                direction = msg.get("from", msg.get("From", ""))
                                body = msg.get("message", msg.get("Message", msg.get("body", "")))
                                date_str = msg.get("sent_date", msg.get("SentDate", msg.get("timestamp", "")))

                                if "You" in str(direction) or direction == "0":
                                    sent_msgs += 1
                                    sent_in_conv += 1
                                    if body:
                                        msg_lengths_sent.append(len(str(body)))
                                else:
                                    received_msgs += 1
                                    received_in_conv += 1
                                    if body:
                                        msg_lengths_received.append(len(str(body)))

                                dt = parse_date(str(date_str)) if date_str else None
                                if dt:
                                    dates_in_conv.append(dt)
                                    hourly[dt.hour] += 1
                                    daily[dt.strftime("%A")] += 1
                                    monthly[dt.strftime("%Y-%m")] += 1

                        if dates_in_conv:
                            first_dates.append(min(dates_in_conv))
                            last_dates.append(max(dates_in_conv))

                        conversations_detail.append({
                            "match_id": match_id,
                            "total_msgs": conv_msg_count,
                            "sent": sent_in_conv,
                            "received": received_in_conv,
                            "first_msg": min(dates_in_conv).isoformat() if dates_in_conv else None,
                            "last_msg": max(dates_in_conv).isoformat() if dates_in_conv else None,
                            "duration_days": (max(dates_in_conv) - min(dates_in_conv)).days if len(dates_in_conv) > 1 else 0
                        })

            # Sort conversations by message count
            conversations_detail.sort(key=lambda x: x["total_msgs"], reverse=True)

            print(f"  Total messages: {total_msgs}")
            print(f"  Sent by you: {sent_msgs}")
            print(f"  Received: {received_msgs}")
            print(f"  Conversations with messages: {len(conv_lengths)}")

            if conv_lengths:
                print(f"  Avg messages/conv: {sum(conv_lengths)/len(conv_lengths):.1f}")
                print(f"  Max messages in conv: {max(conv_lengths)}")
                print(f"  Convos 15+ msgs: {sum(1 for x in conv_lengths if x >= 15)}")
                print(f"  Convos 5+ msgs: {sum(1 for x in conv_lengths if x >= 5)}")

            if first_dates:
                print(f"  Date range: {min(first_dates).strftime('%Y-%m-%d')} to {max(last_dates).strftime('%Y-%m-%d')}")

            if msg_lengths_sent:
                print(f"  Avg msg length (you): {sum(msg_lengths_sent)/len(msg_lengths_sent):.0f} chars")
            if msg_lengths_received:
                print(f"  Avg msg length (them): {sum(msg_lengths_received)/len(msg_lengths_received):.0f} chars")

            print(f"\n  Top 10 conversations:")
            for c in conversations_detail[:10]:
                print(f"    {c['match_id'][:30]:30s} | {c['total_msgs']:3d} msgs | {c['sent']:3d} sent | {c['duration_days']:3d} days")

            print(f"\n  Hourly distribution:")
            for h in range(24):
                count = hourly.get(h, 0)
                bar = "█" * (count // 5) if count > 0 else ""
                print(f"    {h:02d}h: {count:4d} {bar}")

            print(f"\n  Monthly distribution:")
            for m in sorted(monthly.keys()):
                count = monthly[m]
                print(f"    {m}: {count:4d} messages")

            report["messages"] = {
                "total_conversations": len(messages_data),
                "conversations_with_messages": len(conv_lengths),
                "total_messages": total_msgs,
                "sent_by_you": sent_msgs,
                "received": received_msgs,
                "avg_per_conv": round(sum(conv_lengths)/len(conv_lengths), 1) if conv_lengths else 0,
                "max_in_conv": max(conv_lengths) if conv_lengths else 0,
                "convos_15plus": sum(1 for x in conv_lengths if x >= 15),
                "convos_5plus": sum(1 for x in conv_lengths if x >= 5),
                "hourly_distribution": dict(hourly),
                "monthly_distribution": dict(monthly),
                "top_conversations": conversations_detail[:10],
                "avg_msg_length_sent": round(sum(msg_lengths_sent)/len(msg_lengths_sent)) if msg_lengths_sent else 0,
                "avg_msg_length_received": round(sum(msg_lengths_received)/len(msg_lengths_received)) if msg_lengths_received else 0,
                "date_range": {
                    "first": min(first_dates).isoformat() if first_dates else None,
                    "last": max(last_dates).isoformat() if last_dates else None
                }
            }

    # 7. App Opens / Activity
    for key in ["App Opens", "app_opens", "AppOpens"]:
        if key in data:
            app_opens = data[key]
            print(f"\n=== APP OPENS ===")
            if isinstance(app_opens, dict):
                items = list(app_opens.items())
                print(f"  Total days tracked: {len(items)}")
                if items:
                    total_opens = sum(int(v) for v in app_opens.values())
                    print(f"  Total opens: {total_opens}")
                    print(f"  Avg opens/day: {total_opens/len(items):.1f}")
                    print(f"  First day: {items[0]}")
                    print(f"  Last day: {items[-1]}")
                    # Find peak day
                    peak_day = max(app_opens.items(), key=lambda x: int(x[1]))
                    print(f"  Peak day: {peak_day[0]} ({peak_day[1]} opens)")
                report["app_opens"] = {
                    "total_days": len(items),
                    "total_opens": total_opens,
                    "avg_per_day": round(total_opens/len(items), 1),
                    "daily_data": dict(items)
                }

    # 8. Purchases / Subscriptions
    for key in ["Purchases", "purchases", "Subscriptions", "subscriptions", "Products"]:
        if key in data:
            purchases = data[key]
            print(f"\n=== {key.upper()} ===")
            print(f"  {json.dumps(purchases, indent=2, ensure_ascii=False)[:2000]}")
            report["purchases"] = purchases

    # 9. Photos
    for key in ["Photos", "photos"]:
        if key in data:
            photos = data[key]
            print(f"\n=== PHOTOS ===")
            if isinstance(photos, list):
                print(f"  Total photos: {len(photos)}")
                for p in photos:
                    if isinstance(p, dict):
                        print(f"    {p}")
                    else:
                        print(f"    {str(p)[:200]}")
            report["photos"] = str(photos)[:2000]

    # 10. Spotify / Instagram
    for key in ["Spotify", "spotify", "Instagram", "instagram"]:
        if key in data:
            print(f"\n=== {key.upper()} ===")
            print(f"  {json.dumps(data[key], indent=2, ensure_ascii=False)[:1000]}")
            report[key.lower()] = data[key]

    # 11. SwipeNotes (comments on likes, like Hinge)
    for key in ["SwipeNotes", "swipe_notes"]:
        if key in data:
            notes = data[key]
            print(f"\n=== SWIPE NOTES ===")
            if isinstance(notes, list):
                print(f"  Total notes: {len(notes)}")
                for n in notes[:5]:
                    print(f"    {n}")
            report["swipe_notes"] = str(notes)[:2000]

    # 12. Campaigns
    for key in ["Campaigns", "campaigns"]:
        if key in data:
            campaigns = data[key]
            print(f"\n=== CAMPAIGNS ===")
            print(f"  {json.dumps(campaigns, indent=2, ensure_ascii=False)[:1000]}")

    # 13. RoomsV2 (Tinder Explore / events)
    for key in ["RoomsV2", "rooms"]:
        if key in data:
            rooms = data[key]
            print(f"\n=== ROOMS ===")
            print(f"  {json.dumps(rooms, indent=2, ensure_ascii=False)[:500]}")

    # 14. Explore everything else
    covered_keys = {"Usage", "User", "Profile", "user", "profile", "Swipes", "swipes",
                    "SwipeLikes", "swipe_likes", "Matches", "matches", "Messages", "messages",
                    "App Opens", "app_opens", "AppOpens", "Purchases", "purchases",
                    "Subscriptions", "subscriptions", "Products", "Photos", "photos",
                    "Spotify", "spotify", "Instagram", "instagram", "SwipeNotes", "swipe_notes",
                    "Campaigns", "campaigns", "RoomsV2", "rooms"}

    remaining = set(top_keys) - covered_keys
    if remaining:
        print(f"\n=== OTHER KEYS ===")
        for key in remaining:
            v = data[key]
            print(f"\n  --- {key} ---")
            if isinstance(v, dict):
                print(f"  dict[{len(v)}] keys: {list(v.keys())[:20]}")
                for sk, sv in list(v.items())[:5]:
                    print(f"    {sk}: {str(sv)[:200]}")
            elif isinstance(v, list):
                print(f"  list[{len(v)}]")
                for item in v[:3]:
                    print(f"    {str(item)[:200]}")
            else:
                print(f"  {str(v)[:500]}")
            report[key] = str(v)[:1000]

    # Save report
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False, default=str)

    print(f"\n\nReport saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    analyze()
