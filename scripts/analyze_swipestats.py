"""
SwipeStats Tinder Data v3 — Women-Focused Analysis
1,209 real Tinder users (150 women) with actual swipe/match/message data.
This is GOLD: real behavioral data, not self-reported.
"""

import csv
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATA_PATH = Path(__file__).parent.parent / "data" / "Swipestats" / "Tinder_Data_v3_Clean_Edition.csv"
OUTPUT_PATH = Path(__file__).parent / "output" / "swipestats_analysis.json"


def safe_int(val, default=0):
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def safe_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def load_data():
    rows = []
    with open(DATA_PATH, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)
    print(f"Loaded {len(rows):,} Tinder user profiles")
    return rows


def split_by_gender(rows):
    women = [r for r in rows if r.get("gender") == "F"]
    men = [r for r in rows if r.get("gender") == "M"]
    print(f"  Women: {len(women)} | Men: {len(men)}")
    return women, men


def percentile(vals, p):
    if not vals:
        return 0
    s = sorted(vals)
    idx = int(len(s) * p / 100)
    return s[min(idx, len(s) - 1)]


def stats_summary(vals):
    if not vals:
        return {}
    s = sorted(vals)
    return {
        "mean": round(sum(vals) / len(vals), 1),
        "median": round(s[len(s) // 2], 1),
        "p10": round(s[int(len(s) * 0.1)], 1),
        "p25": round(s[int(len(s) * 0.25)], 1),
        "p75": round(s[int(len(s) * 0.75)], 1),
        "p90": round(s[int(len(s) * 0.9)], 1),
        "p99": round(s[int(len(s) * 0.99)], 1),
        "min": round(min(vals), 1),
        "max": round(max(vals), 1),
        "n": len(vals),
    }


def analyze_overview(rows, women, men):
    """Basic dataset overview."""
    countries = Counter(r.get("country", "") for r in rows if r.get("country", "").strip() and r["country"] != "unknown")
    ages_w = [safe_int(r["user_age"]) for r in women if 16 <= safe_int(r["user_age"]) <= 65]
    ages_m = [safe_int(r["user_age"]) for r in men if 16 <= safe_int(r["user_age"]) <= 65]

    interested = Counter(r.get("interestedIn", "") for r in rows)

    # Duration on app
    days_w = [safe_int(r["no_of_days"]) for r in women if safe_int(r["no_of_days"]) > 0]
    days_m = [safe_int(r["no_of_days"]) for r in men if safe_int(r["no_of_days"]) > 0]

    return {
        "total_users": len(rows),
        "women": len(women),
        "men": len(men),
        "gender_ratio": f"{round(100 * len(men) / len(rows))}% M / {round(100 * len(women) / len(rows))}% F",
        "interested_in": dict(interested.most_common()),
        "top_countries": dict(countries.most_common(15)),
        "age_women": stats_summary(ages_w),
        "age_men": stats_summary(ages_m),
        "days_on_app_women": stats_summary(days_w),
        "days_on_app_men": stats_summary(days_m),
    }


def analyze_swipe_behavior(women, men):
    """Swipe likes, passes, selectivity."""
    def swipe_stats(group, label):
        likes = [safe_int(r["swipe_likes"]) for r in group if safe_int(r["swipe_likes"]) >= 0]
        passes = [safe_int(r["swipe_passes"]) for r in group if safe_int(r["swipe_passes"]) >= 0]
        total_swipes = [l + p for l, p in zip(likes, passes) if l + p > 0]

        # Selectivity = passes / (likes + passes)
        selectivity = []
        like_rate = []
        for r in group:
            l = safe_int(r["swipe_likes"])
            p = safe_int(r["swipe_passes"])
            if l + p > 100:  # Min activity threshold
                selectivity.append(100 * p / (l + p))
                like_rate.append(100 * l / (l + p))

        return {
            "likes": stats_summary(likes),
            "passes": stats_summary(passes),
            "total_swipes": stats_summary(total_swipes),
            "like_rate_pct": stats_summary(like_rate),
            "selectivity_pct": stats_summary(selectivity),
        }

    return {
        "women": swipe_stats(women, "F"),
        "men": swipe_stats(men, "M"),
    }


def analyze_match_rates(women, men):
    """Match rates — the core metric."""
    def match_stats(group, label):
        matches = [safe_int(r["no_of_matches"]) for r in group]
        likes = [safe_int(r["swipe_likes"]) for r in group]

        # Match rate = matches / likes
        match_rates = []
        for r in group:
            m = safe_int(r["no_of_matches"])
            l = safe_int(r["swipe_likes"])
            if l > 50:  # Min threshold
                match_rates.append(100 * m / l)

        # Matches per day
        per_day = []
        for r in group:
            m = safe_int(r["no_of_matches"])
            d = safe_int(r["no_of_days"])
            if d > 7:
                per_day.append(m / d)

        return {
            "total_matches": stats_summary(matches),
            "match_rate_pct": stats_summary(match_rates),
            "matches_per_day": stats_summary(per_day),
        }

    return {
        "women": match_stats(women, "F"),
        "men": match_stats(men, "M"),
    }


def analyze_messaging(women, men):
    """Messaging patterns — who initiates, who ghosts."""
    def msg_stats(group, label):
        sent = [safe_int(r["no_of_msgs_sent"]) for r in group]
        received = [safe_int(r["no_of_msgs_received"]) for r in group]
        conversations = [safe_int(r["nrOfConversations"]) for r in group if safe_int(r["nrOfConversations"]) > 0]
        avg_conv_len = [safe_float(r["averageConversationLength"]) for r in group if safe_float(r["averageConversationLength"]) > 0]
        longest_conv = [safe_int(r["longestConversation"]) for r in group if safe_int(r["longestConversation"]) > 0]
        one_msg = [safe_float(r["percentOfOneMessageConversations"]) for r in group if safe_float(r["percentOfOneMessageConversations"]) >= 0]
        ghosting = [safe_int(r["nrOfGhostingsAfterInitialMessage"]) for r in group if safe_int(r["nrOfGhostingsAfterInitialMessage"]) >= 0]

        # Sent/received ratio
        ratio = []
        for r in group:
            s = safe_int(r["no_of_msgs_sent"])
            rv = safe_int(r["no_of_msgs_received"])
            if rv > 10:
                ratio.append(s / rv)

        # Messages per match
        msg_per_match = []
        for r in group:
            s = safe_int(r["no_of_msgs_sent"])
            m = safe_int(r["no_of_matches"])
            if m > 5:
                msg_per_match.append(s / m)

        # Conversation rate (conversations / matches)
        conv_rate = []
        for r in group:
            c = safe_int(r["nrOfConversations"])
            m = safe_int(r["no_of_matches"])
            if m > 5:
                conv_rate.append(100 * c / m)

        # Ghosting rate
        ghost_rate = []
        for r in group:
            g = safe_int(r["nrOfGhostingsAfterInitialMessage"])
            c = safe_int(r["nrOfConversations"])
            if c > 5:
                ghost_rate.append(100 * g / c)

        return {
            "msgs_sent": stats_summary(sent),
            "msgs_received": stats_summary(received),
            "sent_received_ratio": stats_summary(ratio),
            "conversations": stats_summary(conversations),
            "avg_conversation_length": stats_summary(avg_conv_len),
            "longest_conversation": stats_summary(longest_conv),
            "pct_one_message_convos": stats_summary(one_msg),
            "msgs_per_match": stats_summary(msg_per_match),
            "conversation_rate_pct": stats_summary(conv_rate),
            "ghosting_rate_pct": stats_summary(ghost_rate),
        }

    return {
        "women": msg_stats(women, "F"),
        "men": msg_stats(men, "M"),
    }


def analyze_app_usage(women, men):
    """App opens and usage intensity."""
    def usage_stats(group):
        opens = [safe_int(r["sum_app_opens"]) for r in group if safe_int(r["sum_app_opens"]) > 0]
        days = [safe_int(r["no_of_days"]) for r in group if safe_int(r["no_of_days"]) > 0]

        # Opens per day
        per_day = []
        for r in group:
            o = safe_int(r["sum_app_opens"])
            d = safe_int(r["no_of_days"])
            if d > 7 and o > 0:
                per_day.append(o / d)

        # Swipes per day
        swipes_per_day = []
        for r in group:
            l = safe_int(r["swipe_likes"])
            p = safe_int(r["swipe_passes"])
            d = safe_int(r["no_of_days"])
            if d > 7:
                swipes_per_day.append((l + p) / d)

        return {
            "total_app_opens": stats_summary(opens),
            "app_opens_per_day": stats_summary(per_day),
            "swipes_per_day": stats_summary(swipes_per_day),
        }

    return {
        "women": usage_stats(women),
        "men": usage_stats(men),
    }


def analyze_by_age(women, men):
    """Metrics broken down by age bracket."""
    def age_breakdown(group, label):
        by_age = defaultdict(list)
        for r in group:
            age = safe_int(r["user_age"])
            if age < 18 or age > 60:
                continue
            bracket = f"{(age // 5) * 5}-{(age // 5) * 5 + 4}"
            by_age[bracket].append(r)

        result = {}
        for bracket in sorted(by_age.keys()):
            users = by_age[bracket]
            if len(users) < 3:
                continue

            match_rates = []
            like_rates = []
            for r in users:
                m = safe_int(r["no_of_matches"])
                l = safe_int(r["swipe_likes"])
                p = safe_int(r["swipe_passes"])
                if l > 50:
                    match_rates.append(100 * m / l)
                if l + p > 100:
                    like_rates.append(100 * l / (l + p))

            result[bracket] = {
                "count": len(users),
                "avg_match_rate": round(sum(match_rates) / len(match_rates), 1) if match_rates else 0,
                "avg_like_rate": round(sum(like_rates) / len(like_rates), 1) if like_rates else 0,
            }
        return result

    return {
        "women": age_breakdown(women, "F"),
        "men": age_breakdown(men, "M"),
    }


def analyze_age_filters(women, men):
    """Age filter preferences."""
    def filter_stats(group):
        filters = []
        for r in group:
            age = safe_int(r["user_age"])
            fmin = safe_int(r["ageFilterMin"])
            fmax = safe_int(r["ageFilterMax"])
            if 18 <= age <= 60 and 18 <= fmin <= 60 and 18 <= fmax <= 70 and fmin < fmax:
                filters.append({
                    "age": age,
                    "filter_min": fmin,
                    "filter_max": fmax,
                    "range_width": fmax - fmin,
                    "accepts_older_by": fmax - age,
                    "accepts_younger_by": age - fmin,
                })

        if not filters:
            return {}

        return {
            "avg_filter_min": round(sum(f["filter_min"] for f in filters) / len(filters), 1),
            "avg_filter_max": round(sum(f["filter_max"] for f in filters) / len(filters), 1),
            "avg_range_width": round(sum(f["range_width"] for f in filters) / len(filters), 1),
            "avg_accepts_older_by": round(sum(f["accepts_older_by"] for f in filters) / len(filters), 1),
            "avg_accepts_younger_by": round(sum(f["accepts_younger_by"] for f in filters) / len(filters), 1),
            "n": len(filters),
        }

    return {
        "women": filter_stats(women),
        "men": filter_stats(men),
    }


def analyze_profile_features(women, men):
    """Instagram, Spotify, education, job impact on matches."""
    def feature_impact(group, label):
        results = {}
        for feature in ["instagram", "spotify"]:
            with_feat = [r for r in group if r.get(feature, "").lower() == "true"]
            without_feat = [r for r in group if r.get(feature, "").lower() == "false"]

            def avg_match_rate(users):
                rates = []
                for r in users:
                    m = safe_int(r["no_of_matches"])
                    l = safe_int(r["swipe_likes"])
                    if l > 50:
                        rates.append(100 * m / l)
                return round(sum(rates) / len(rates), 1) if rates else 0

            results[feature] = {
                "with": {"count": len(with_feat), "avg_match_rate": avg_match_rate(with_feat)},
                "without": {"count": len(without_feat), "avg_match_rate": avg_match_rate(without_feat)},
            }

        # Education
        edu_groups = defaultdict(list)
        for r in group:
            edu = r.get("education", "").strip()
            if edu:
                edu_groups[edu].append(r)

        results["education"] = {}
        for edu, users in edu_groups.items():
            if len(users) >= 5:
                rates = []
                for r in users:
                    m = safe_int(r["no_of_matches"])
                    l = safe_int(r["swipe_likes"])
                    if l > 50:
                        rates.append(100 * m / l)
                results["education"][edu] = {
                    "count": len(users),
                    "avg_match_rate": round(sum(rates) / len(rates), 1) if rates else 0,
                }

        return results

    return {
        "women": feature_impact(women, "F"),
        "men": feature_impact(men, "M"),
    }


def analyze_funnel(women, men):
    """Complete funnel: swipes -> matches -> conversations -> messages."""
    def funnel(group, label):
        funnels = []
        for r in group:
            likes = safe_int(r["swipe_likes"])
            matches = safe_int(r["no_of_matches"])
            convos = safe_int(r["nrOfConversations"])
            msgs = safe_int(r["no_of_msgs_sent"])
            if likes > 50:
                funnels.append({
                    "likes": likes,
                    "matches": matches,
                    "convos": convos,
                    "msgs": msgs,
                })

        if not funnels:
            return {}

        avg_likes = sum(f["likes"] for f in funnels) / len(funnels)
        avg_matches = sum(f["matches"] for f in funnels) / len(funnels)
        avg_convos = sum(f["convos"] for f in funnels) / len(funnels)
        avg_msgs = sum(f["msgs"] for f in funnels) / len(funnels)

        return {
            "avg_likes_sent": round(avg_likes),
            "avg_matches": round(avg_matches),
            "avg_conversations": round(avg_convos),
            "avg_messages_sent": round(avg_msgs),
            "like_to_match_pct": round(100 * avg_matches / avg_likes, 1) if avg_likes else 0,
            "match_to_convo_pct": round(100 * avg_convos / avg_matches, 1) if avg_matches else 0,
            "convo_to_msg_pct": round(100 * avg_msgs / avg_convos, 1) if avg_convos else 0,
            "n": len(funnels),
        }

    return {
        "women": funnel(women, "F"),
        "men": funnel(men, "M"),
    }


def analyze_power_law(women, men):
    """Distribution inequality — do top users get all the matches?"""
    def inequality(group, label):
        matches = sorted([safe_int(r["no_of_matches"]) for r in group], reverse=True)
        if len(matches) < 10:
            return {}

        total = sum(matches)
        top_10_pct = sum(matches[:len(matches) // 10])
        top_20_pct = sum(matches[:len(matches) // 5])
        bottom_50_pct = sum(matches[len(matches) // 2:])

        return {
            "total_matches": total,
            "top_10pct_share": round(100 * top_10_pct / total, 1) if total else 0,
            "top_20pct_share": round(100 * top_20_pct / total, 1) if total else 0,
            "bottom_50pct_share": round(100 * bottom_50_pct / total, 1) if total else 0,
            "max_matches": matches[0],
            "median_matches": matches[len(matches) // 2],
        }

    return {
        "women": inequality(women, "F"),
        "men": inequality(men, "M"),
    }


def analyze_country_comparison(rows):
    """Match rates by country."""
    by_country = defaultdict(lambda: {"M": [], "F": []})
    for r in rows:
        country = r.get("country", "")
        gender = r.get("gender", "")
        if country and country != "unknown" and gender in ("M", "F"):
            m = safe_int(r["no_of_matches"])
            l = safe_int(r["swipe_likes"])
            if l > 50:
                by_country[country][gender].append(100 * m / l)

    result = {}
    for country, genders in by_country.items():
        if len(genders["M"]) >= 3 or len(genders["F"]) >= 3:
            result[country] = {}
            for g, rates in genders.items():
                if rates:
                    result[country][g] = {
                        "avg_match_rate": round(sum(rates) / len(rates), 1),
                        "n": len(rates),
                    }

    # Sort by total users
    return dict(sorted(result.items(), key=lambda x: sum(v.get("n", 0) for v in x[1].values()), reverse=True)[:15])


def print_section(title, data):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")
    if isinstance(data, dict):
        for k, v in list(data.items())[:15]:
            if isinstance(v, dict):
                print(f"  {k}:")
                for k2, v2 in list(v.items())[:8]:
                    if isinstance(v2, dict):
                        compact = {kk: vv for kk, vv in list(v2.items())[:5]}
                        print(f"    {k2}: {compact}")
                    else:
                        print(f"    {k2}: {v2}")
            else:
                print(f"  {k}: {v}")


def main():
    print("=" * 60)
    print("  SwipeStats Tinder Data v3 — Women-Focused Analysis")
    print("  1,209 real Tinder users with actual swipe data")
    print("=" * 60)

    rows = load_data()
    women, men = split_by_gender(rows)

    overview = analyze_overview(rows, women, men)
    print_section("OVERVIEW", overview)

    swipes = analyze_swipe_behavior(women, men)
    print_section("SWIPE BEHAVIOR", swipes)

    matches = analyze_match_rates(women, men)
    print_section("MATCH RATES", matches)

    messaging = analyze_messaging(women, men)
    print_section("MESSAGING", messaging)

    usage = analyze_app_usage(women, men)
    print_section("APP USAGE", usage)

    by_age = analyze_by_age(women, men)
    print_section("BY AGE", by_age)

    age_filters = analyze_age_filters(women, men)
    print_section("AGE FILTERS", age_filters)

    features = analyze_profile_features(women, men)
    print_section("PROFILE FEATURES IMPACT", features)

    funnel = analyze_funnel(women, men)
    print_section("FUNNEL", funnel)

    power = analyze_power_law(women, men)
    print_section("INEQUALITY", power)

    countries = analyze_country_comparison(rows)
    print_section("BY COUNTRY", countries)

    # Save report
    report = {
        "dataset": "SwipeStats Tinder Data v3 Clean Edition",
        "generated": datetime.now().isoformat(),
        "overview": overview,
        "swipe_behavior": swipes,
        "match_rates": matches,
        "messaging": messaging,
        "app_usage": usage,
        "by_age": by_age,
        "age_filters": age_filters,
        "profile_features": features,
        "funnel": funnel,
        "inequality": power,
        "by_country": countries,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False, default=str)
    print(f"\nFull report saved to: {OUTPUT_PATH}")

    # KEY INSIGHTS
    print("\n" + "=" * 60)
    print("  KEY INSIGHTS — WOMEN VS MEN ON TINDER")
    print("=" * 60)

    # Match rate
    wm = matches["women"]["match_rate_pct"]
    mm = matches["men"]["match_rate_pct"]
    print(f"\n  MATCH RATE (matches/likes sent):")
    print(f"    Women: {wm.get('mean', 0)}% mean, {wm.get('median', 0)}% median")
    print(f"    Men:   {mm.get('mean', 0)}% mean, {mm.get('median', 0)}% median")
    if wm.get('median') and mm.get('median'):
        print(f"    -> Women get {wm['median']/mm['median']:.1f}x more matches per like")

    # Like rate (selectivity)
    ws = swipes["women"]["like_rate_pct"]
    ms = swipes["men"]["like_rate_pct"]
    print(f"\n  LIKE RATE (% of profiles liked):")
    print(f"    Women: {ws.get('mean', 0)}% mean, {ws.get('median', 0)}% median")
    print(f"    Men:   {ms.get('mean', 0)}% mean, {ms.get('median', 0)}% median")

    # Funnel
    wf = funnel["women"]
    mf = funnel["men"]
    print(f"\n  FUNNEL:")
    print(f"    Women: {wf.get('avg_likes_sent', 0)} likes -> {wf.get('avg_matches', 0)} matches ({wf.get('like_to_match_pct', 0)}%) -> {wf.get('avg_conversations', 0)} convos ({wf.get('match_to_convo_pct', 0)}%)")
    print(f"    Men:   {mf.get('avg_likes_sent', 0)} likes -> {mf.get('avg_matches', 0)} matches ({mf.get('like_to_match_pct', 0)}%) -> {mf.get('avg_conversations', 0)} convos ({mf.get('match_to_convo_pct', 0)}%)")

    # Messaging
    wms = messaging["women"]
    mms = messaging["men"]
    print(f"\n  MESSAGING:")
    print(f"    Women sent/received ratio: {wms['sent_received_ratio'].get('median', 0):.2f}")
    print(f"    Men sent/received ratio:   {mms['sent_received_ratio'].get('median', 0):.2f}")
    print(f"    Women ghosting rate: {wms['ghosting_rate_pct'].get('median', 0):.1f}%")
    print(f"    Men ghosting rate:   {mms['ghosting_rate_pct'].get('median', 0):.1f}%")

    # Inequality
    wp = power["women"]
    mp = power["men"]
    print(f"\n  INEQUALITY (Pareto):")
    print(f"    Women top 10% get {wp.get('top_10pct_share', 0)}% of all female matches")
    print(f"    Men top 10% get {mp.get('top_10pct_share', 0)}% of all male matches")
    print(f"    Women bottom 50% get {wp.get('bottom_50pct_share', 0)}% of female matches")
    print(f"    Men bottom 50% get {mp.get('bottom_50pct_share', 0)}% of male matches")

    print("\n  Analysis complete.")


if __name__ == "__main__":
    main()
