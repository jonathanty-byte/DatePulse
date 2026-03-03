"""
Lovoo v3 Dating App Dataset Analysis
Analyzes ~4K user profiles from Lovoo (European dating app).
Two sources: API results + user instances.
"""

import csv
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "Lovoo"
API_PATH = DATA_DIR / "lovoo_v3_users_api-results.csv"
INST_PATH = DATA_DIR / "lovoo_v3_users_instances.csv"
OUTPUT_PATH = Path(__file__).parent / "output" / "lovoo_analysis.json"


def safe_int(val, default=None):
    try:
        v = int(val)
        return v if v >= 0 else default
    except (ValueError, TypeError):
        return default


def safe_float(val, default=None):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def load_csv(path):
    rows = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"  Loaded {len(rows):,} rows from {path.name}")
    return rows


def analyze_demographics(rows):
    """Gender, age, orientation (genderLooking)."""
    genders = Counter(r.get("gender", "") for r in rows if r.get("gender", "").strip())
    ages = [safe_int(r.get("age")) for r in rows if safe_int(r.get("age"))]

    age_brackets = Counter()
    for a in ages:
        if a < 20:
            age_brackets["<20"] += 1
        elif a < 25:
            age_brackets["20-24"] += 1
        elif a < 30:
            age_brackets["25-29"] += 1
        elif a < 35:
            age_brackets["30-34"] += 1
        elif a < 40:
            age_brackets["35-39"] += 1
        elif a < 50:
            age_brackets["40-49"] += 1
        else:
            age_brackets["50+"] += 1

    # Gender looking for (only in API results)
    looking = Counter()
    for r in rows:
        gl = r.get("genderLooking", "")
        g = r.get("gender", "")
        if gl and g:
            looking[f"{g}->{gl}"] += 1

    return {
        "total_profiles": len(rows),
        "gender": dict(genders.most_common()),
        "age": {
            "mean": round(sum(ages) / len(ages), 1) if ages else 0,
            "median": sorted(ages)[len(ages) // 2] if ages else 0,
            "min": min(ages) if ages else 0,
            "max": max(ages) if ages else 0,
            "brackets": dict(sorted(age_brackets.items())),
        },
        "gender_looking": dict(looking.most_common()),
    }


def analyze_engagement(rows):
    """Profile visits, kisses, fans, pictures."""
    metrics = {
        "counts_profileVisits": [],
        "counts_kisses": [],
        "counts_fans": [],
        "counts_pictures": [],
    }

    for r in rows:
        for key in metrics:
            val = safe_float(r.get(key))
            if val is not None:
                metrics[key].append(val)

    result = {}
    for key, vals in metrics.items():
        clean_name = key.replace("counts_", "")
        if vals:
            sorted_vals = sorted(vals)
            result[clean_name] = {
                "mean": round(sum(vals) / len(vals), 1),
                "median": round(sorted_vals[len(vals) // 2], 1),
                "max": round(max(vals)),
                "p90": round(sorted_vals[int(len(vals) * 0.9)], 1),
                "p99": round(sorted_vals[int(len(vals) * 0.99)], 1),
                "count": len(vals),
            }
    return result


def analyze_engagement_by_gender(rows):
    """Engagement metrics broken down by gender."""
    by_gender = defaultdict(lambda: defaultdict(list))
    metric_keys = ["counts_profileVisits", "counts_kisses", "counts_fans"]

    for r in rows:
        g = r.get("gender", "")
        if g not in ("M", "F"):
            continue
        for key in metric_keys:
            val = safe_float(r.get(key))
            if val is not None:
                by_gender[g][key].append(val)

    result = {}
    for gender, metrics in by_gender.items():
        result[gender] = {}
        for key, vals in metrics.items():
            clean = key.replace("counts_", "")
            result[gender][clean] = {
                "mean": round(sum(vals) / len(vals), 1),
                "median": round(sorted(vals)[len(vals) // 2], 1),
                "count": len(vals),
            }
    return result


def analyze_flirt_interests(rows):
    """What users are looking for: chat, friends, date."""
    interests = defaultdict(Counter)
    for r in rows:
        for field in ["flirtInterests_chat", "flirtInterests_friends", "flirtInterests_date"]:
            val = r.get(field, "").lower().strip()
            if val:
                clean = field.replace("flirtInterests_", "")
                interests[clean][val] += 1

    # By gender
    by_gender = defaultdict(lambda: defaultdict(Counter))
    for r in rows:
        g = r.get("gender", "")
        if g not in ("M", "F"):
            continue
        for field in ["flirtInterests_chat", "flirtInterests_friends", "flirtInterests_date"]:
            val = r.get(field, "").lower().strip()
            if val == "true":
                clean = field.replace("flirtInterests_", "")
                by_gender[g][clean]["yes"] += 1
            elif val == "false":
                clean = field.replace("flirtInterests_", "")
                by_gender[g][clean]["no"] += 1

    result = {"overall": {}, "by_gender": {}}
    for interest, counts in interests.items():
        result["overall"][interest] = dict(counts.most_common())

    for gender in ("M", "F"):
        result["by_gender"][gender] = {}
        for interest, counts in by_gender[gender].items():
            total = counts["yes"] + counts["no"]
            result["by_gender"][gender][interest] = {
                "yes_pct": round(100 * counts["yes"] / total, 1) if total else 0,
                "total": total,
            }

    return result


def analyze_activity(rows):
    """Last online patterns."""
    online_hours = Counter()
    online_days = Counter()
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for r in rows:
        lo = r.get("lastOnlineDate") or r.get("lastOnline", "")
        if not lo:
            continue
        try:
            # Format: 2015-04-25T20:43:26Z or 2015-04-25 20:43:26
            lo_clean = lo.replace("T", " ").replace("Z", "").strip()
            dt = datetime.strptime(lo_clean, "%Y-%m-%d %H:%M:%S")
            online_hours[dt.hour] += 1
            online_days[day_names[dt.weekday()]] += 1
        except ValueError:
            pass

    sorted_hours = {str(h): online_hours.get(h, 0) for h in range(24)}
    sorted_days = {d: online_days.get(d, 0) for d in day_names}

    return {
        "last_online_by_hour": sorted_hours,
        "last_online_by_day": sorted_days,
    }


def analyze_location(rows):
    """Country and city distribution."""
    countries = Counter(r.get("country", "") for r in rows if r.get("country", "").strip())
    cities = Counter(r.get("city", "") for r in rows if r.get("city", "").strip())
    return {
        "countries": dict(countries.most_common(15)),
        "top_cities": dict(cities.most_common(20)),
    }


def analyze_languages(rows):
    """Languages spoken."""
    lang_fields = ["lang_fr", "lang_en", "lang_de", "lang_it", "lang_es", "lang_pt"]
    lang_counts = Counter()
    for r in rows:
        for field in lang_fields:
            val = r.get(field, "").lower().strip()
            if val == "true":
                lang = field.replace("lang_", "").upper()
                lang_counts[lang] += 1

    lang_count_dist = Counter()
    for r in rows:
        lc = safe_int(r.get("lang_count"))
        if lc is not None:
            lang_count_dist[str(lc)] += 1

    return {
        "languages_spoken": dict(lang_counts.most_common()),
        "num_languages_distribution": dict(sorted(lang_count_dist.items())),
    }


def analyze_features(rows):
    """VIP, verified, mobile, flirtstar, new, online, influencer."""
    features = ["isVip", "verified", "isMobile", "isFlirtstar", "isNew",
                 "isOnline", "isInfluencer", "isHighlighted", "isVIP", "isVerified",
                 "connectedToFacebook"]

    result = {}
    for feat in features:
        counter = Counter()
        for r in rows:
            val = r.get(feat, "").lower().strip()
            if val:
                counter[val] += 1
        if counter:
            total = sum(counter.values())
            true_count = counter.get("true", counter.get("1", 0))
            result[feat] = {
                "true_pct": round(100 * true_count / total, 1) if total else 0,
                "total": total,
            }
    return result


def analyze_profile_completeness(rows):
    """How complete are profiles (freetext, whazzup)."""
    has_freetext = sum(1 for r in rows if r.get("freetext", "").strip())
    has_whazzup = sum(1 for r in rows if r.get("whazzup", "").strip())
    total = len(rows)

    # Avg lengths
    freetext_lengths = [len(r["freetext"]) for r in rows if r.get("freetext", "").strip()]
    whazzup_lengths = [len(r["whazzup"]) for r in rows if r.get("whazzup", "").strip()]

    return {
        "freetext_fill_rate_pct": round(100 * has_freetext / total, 1) if total else 0,
        "freetext_avg_length": round(sum(freetext_lengths) / len(freetext_lengths)) if freetext_lengths else 0,
        "whazzup_fill_rate_pct": round(100 * has_whazzup / total, 1) if total else 0,
        "whazzup_avg_length": round(sum(whazzup_lengths) / len(whazzup_lengths)) if whazzup_lengths else 0,
    }


def analyze_kisses_per_visit(rows):
    """Kiss-to-visit ratio (engagement quality metric)."""
    ratios_by_gender = defaultdict(list)
    for r in rows:
        visits = safe_float(r.get("counts_profileVisits"))
        kisses = safe_float(r.get("counts_kisses"))
        g = r.get("gender", "")
        if visits and visits > 10 and kisses is not None and g in ("M", "F"):
            ratios_by_gender[g].append(kisses / visits)

    result = {}
    for gender, ratios in ratios_by_gender.items():
        result[gender] = {
            "mean_kiss_per_visit_pct": round(100 * sum(ratios) / len(ratios), 2),
            "median_kiss_per_visit_pct": round(100 * sorted(ratios)[len(ratios) // 2], 2),
            "count": len(ratios),
        }
    return result


def print_section(title, data, indent=0):
    prefix = "  " * indent
    print(f"\n{prefix}{'='*60}")
    print(f"{prefix}  {title}")
    print(f"{prefix}{'='*60}")
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, dict):
                print(f"{prefix}  {k}:")
                for k2, v2 in v.items():
                    if isinstance(v2, dict):
                        print(f"{prefix}    {k2}:")
                        for k3, v3 in v2.items():
                            print(f"{prefix}      {k3}: {v3}")
                    else:
                        print(f"{prefix}    {k2}: {v2}")
            else:
                print(f"{prefix}  {k}: {v}")


def main():
    print("=" * 60)
    print("  Lovoo v3 Dating App Dataset Analysis")
    print("  European dating app user profiles")
    print("=" * 60)

    # Load both files
    print("\nLoading data...")
    api_rows = load_csv(API_PATH)
    inst_rows = load_csv(INST_PATH)

    # Use API results as primary (more columns), merge unique from instances
    # Deduplicate by userId
    seen_ids = set()
    all_rows = []
    for r in api_rows:
        uid = r.get("userId", "")
        if uid and uid not in seen_ids:
            seen_ids.add(uid)
            all_rows.append(r)
    for r in inst_rows:
        uid = r.get("userId", "")
        if uid and uid not in seen_ids:
            seen_ids.add(uid)
            all_rows.append(r)

    print(f"  Total unique profiles: {len(all_rows):,}")

    # Run analyses
    demographics = analyze_demographics(all_rows)
    engagement = analyze_engagement(all_rows)
    engagement_gender = analyze_engagement_by_gender(all_rows)
    flirt = analyze_flirt_interests(all_rows)
    activity = analyze_activity(all_rows)
    location = analyze_location(all_rows)
    languages = analyze_languages(all_rows)
    features = analyze_features(all_rows)
    completeness = analyze_profile_completeness(all_rows)
    kiss_ratio = analyze_kisses_per_visit(all_rows)

    # Print
    print_section("DEMOGRAPHICS", demographics)
    print_section("ENGAGEMENT METRICS", engagement)
    print_section("ENGAGEMENT BY GENDER", engagement_gender)
    print_section("KISS-TO-VISIT RATIO", kiss_ratio)
    print_section("FLIRT INTERESTS", flirt)
    print_section("ACTIVITY PATTERNS", activity)
    print_section("LOCATION", location)
    print_section("LANGUAGES", languages)
    print_section("ACCOUNT FEATURES", features)
    print_section("PROFILE COMPLETENESS", completeness)

    # Save report
    report = {
        "dataset": "Lovoo v3 (European dating app)",
        "generated": datetime.now().isoformat(),
        "demographics": demographics,
        "engagement": engagement,
        "engagement_by_gender": engagement_gender,
        "kiss_to_visit_ratio": kiss_ratio,
        "flirt_interests": flirt,
        "activity_patterns": activity,
        "location": location,
        "languages": languages,
        "features": features,
        "profile_completeness": completeness,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nFull report saved to: {OUTPUT_PATH}")

    # Key insights
    print("\n" + "=" * 60)
    print("  KEY INSIGHTS FOR DATEPULSE")
    print("=" * 60)

    # Gender ratio
    m = demographics["gender"].get("M", 0)
    f = demographics["gender"].get("F", 0)
    t = m + f
    if t:
        print(f"\n  Gender ratio: {round(100*m/t)}% male / {round(100*f/t)}% female")

    # Engagement gap
    eg = engagement_gender
    if "M" in eg and "F" in eg:
        m_visits = eg["M"].get("profileVisits", {}).get("mean", 0)
        f_visits = eg["F"].get("profileVisits", {}).get("mean", 0)
        m_kisses = eg["M"].get("kisses", {}).get("mean", 0)
        f_kisses = eg["F"].get("kisses", {}).get("mean", 0)
        print(f"  Avg profile visits: M={m_visits:,.0f} / F={f_visits:,.0f} (ratio {f_visits/m_visits:.1f}x)" if m_visits else "")
        print(f"  Avg kisses received: M={m_kisses:,.0f} / F={f_kisses:,.0f} (ratio {f_kisses/m_kisses:.1f}x)" if m_kisses else "")

    # Kiss ratio
    if "M" in kiss_ratio and "F" in kiss_ratio:
        print(f"\n  Kiss-per-visit rate: M={kiss_ratio['M']['mean_kiss_per_visit_pct']:.1f}% / F={kiss_ratio['F']['mean_kiss_per_visit_pct']:.1f}%")

    # Activity
    hours = activity["last_online_by_hour"]
    top_hours = sorted(hours.items(), key=lambda x: x[1], reverse=True)[:5]
    if top_hours:
        print(f"\n  Peak hours: {', '.join(f'{h}h ({c})' for h, c in top_hours)}")

    days = activity["last_online_by_day"]
    top_days = sorted(days.items(), key=lambda x: x[1], reverse=True)[:3]
    if top_days:
        print(f"  Peak days: {', '.join(f'{d} ({c})' for d, c in top_days)}")

    print("\n  Analysis complete.")


if __name__ == "__main__":
    main()
