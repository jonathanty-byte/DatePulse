"""
Cross-dataset analysis: WOMEN ONLY
Consolidates female behavior patterns from:
  1. OkCupid (24,117 women, SF Bay Area)
  2. Lovoo (4,008 women, Europe CH/DE/FR)
  3. Speed Dating (274 women, Columbia University)

Goal: Extract actionable insights for DatePulse scoring model.
"""

import csv
import json
import io
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).parent.parent / "data"
OUTPUT = Path(__file__).parent / "output" / "women_cross_analysis.json"


def sf(val, default=None):
    """Safe float."""
    if val is None: return default
    val = str(val).strip()
    if not val: return default
    try: return float(val)
    except ValueError: return default


def si(val, default=None):
    f = sf(val)
    return int(f) if f is not None else default


def percentiles(vals, ps=[10, 25, 50, 75, 90, 99]):
    s = sorted(vals)
    n = len(s)
    return {f"p{p}": round(s[min(int(n * p / 100), n - 1)], 2) for p in ps}


# ============================================================
# 1. OkCupid Women
# ============================================================
def load_okcupid_women():
    path = BASE / "OkCupid" / "okcupid_profiles.csv"
    women = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for r in csv.DictReader(f):
            if r.get("sex") == "f":
                women.append(r)
    print(f"OkCupid: {len(women):,} women loaded")
    return women


def analyze_okc_women(rows):
    ages = [si(r["age"]) for r in rows if si(r["age"])]

    # Activity by hour
    hours = Counter()
    days_map = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    days = Counter()
    for r in rows:
        lo = r.get("last_online", "")
        if lo:
            try:
                dt = datetime.strptime(lo, "%Y-%m-%d-%H-%M")
                hours[dt.hour] += 1
                days[days_map[dt.weekday()]] += 1
            except ValueError:
                pass

    # Orientation
    orientations = Counter(r["orientation"] for r in rows if r["orientation"])

    # Status
    statuses = Counter(r["status"] for r in rows if r["status"])

    # Body type
    body_types = Counter(r["body_type"] for r in rows if r["body_type"].strip())

    # Height
    heights = [sf(r["height"]) * 2.54 for r in rows if sf(r["height"])]

    # Diet
    diets = Counter(r["diet"] for r in rows if r["diet"].strip())

    # Drinks
    drinks = Counter(r["drinks"] for r in rows if r["drinks"].strip())

    # Smokes
    smokes = Counter(r["smokes"] for r in rows if r["smokes"].strip())

    # Offspring
    offspring = Counter(r["offspring"] for r in rows if r["offspring"].strip())

    # Religion
    religions = Counter(r["religion"] for r in rows if r["religion"].strip())

    # Education
    education = Counter(r["education"] for r in rows if r["education"].strip())

    # Income
    incomes = [si(r["income"]) for r in rows if si(r["income"]) is not None]

    # Pets
    pets = Counter(r["pets"] for r in rows if r["pets"].strip())

    # Essay engagement
    essay_rates = {}
    labels = {
        "essay0": "Self-summary", "essay1": "What I'm doing", "essay2": "Good at",
        "essay3": "First notice", "essay4": "Favorites", "essay5": "Six things",
        "essay6": "Thinking about", "essay7": "Friday night", "essay8": "Private thing",
        "essay9": "Message me if",
    }
    for field, label in labels.items():
        filled = [r for r in rows if r.get(field, "").strip()]
        lengths = [len(r[field]) for r in filled]
        essay_rates[label] = {
            "fill_pct": round(100 * len(filled) / len(rows), 1),
            "avg_chars": round(sum(lengths) / len(lengths)) if lengths else 0,
        }

    # Ethnicity
    eth = Counter()
    for r in rows:
        e = r.get("ethnicity", "")
        if e.strip():
            for part in e.split(","):
                part = part.strip()
                if part:
                    eth[part] += 1

    return {
        "source": "OkCupid",
        "count": len(rows),
        "age": {
            "mean": round(sum(ages) / len(ages), 1),
            "median": sorted(ages)[len(ages) // 2],
            "distribution": dict(Counter(
                "<20" if a < 20 else "20-24" if a < 25 else "25-29" if a < 30 else
                "30-34" if a < 35 else "35-39" if a < 40 else "40-49" if a < 50 else "50+"
                for a in ages
            ).most_common()),
        },
        "orientation": dict(orientations.most_common()),
        "status": dict(statuses.most_common()),
        "body_type": dict(body_types.most_common(10)),
        "height_cm": {"mean": round(sum(heights) / len(heights), 1)} if heights else {},
        "diet_top5": dict(diets.most_common(5)),
        "drinks": dict(drinks.most_common()),
        "smokes": dict(smokes.most_common()),
        "offspring_top5": dict(offspring.most_common(5)),
        "religion_top5": dict(religions.most_common(5)),
        "education_top5": dict(education.most_common(5)),
        "income": {
            "reported_pct": round(100 * len(incomes) / len(rows), 1),
            "mean": round(sum(incomes) / len(incomes)) if incomes else 0,
        },
        "ethnicity": dict(eth.most_common(8)),
        "pets_top5": dict(pets.most_common(5)),
        "essays": essay_rates,
        "activity_hours": {str(h): hours.get(h, 0) for h in range(24)},
        "activity_days": {d: days.get(d, 0) for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]},
    }


# ============================================================
# 2. Lovoo Women (all are women)
# ============================================================
def load_lovoo():
    path = BASE / "Lovoo" / "lovoo_v3_users_api-results.csv"
    rows = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for r in csv.DictReader(f):
            rows.append(r)
    print(f"Lovoo: {len(rows):,} women loaded (100% female dataset)")
    return rows


def analyze_lovoo_women(rows):
    ages = [si(r.get("age")) for r in rows if si(r.get("age"))]

    # Activity
    hours = Counter()
    days_map = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    days = Counter()
    for r in rows:
        lo = r.get("lastOnlineDate", "")
        if lo:
            try:
                dt = datetime.strptime(lo.replace("T", " ").replace("Z", ""), "%Y-%m-%d %H:%M:%S")
                hours[dt.hour] += 1
                days[days_map[dt.weekday()]] += 1
            except ValueError:
                pass

    # Engagement
    visits = [sf(r.get("counts_profileVisits")) for r in rows if sf(r.get("counts_profileVisits")) is not None]
    kisses = [sf(r.get("counts_kisses")) for r in rows if sf(r.get("counts_kisses")) is not None]
    fans = [sf(r.get("counts_fans")) for r in rows if sf(r.get("counts_fans")) is not None]
    photos = [sf(r.get("counts_pictures")) for r in rows if sf(r.get("counts_pictures")) is not None]

    # Kiss/visit ratio
    ratios = []
    for r in rows:
        v = sf(r.get("counts_profileVisits"))
        k = sf(r.get("counts_kisses"))
        if v and v > 10 and k is not None:
            ratios.append(k / v)

    # What they look for
    looking = Counter(r.get("genderLooking", "") for r in rows if r.get("genderLooking", "").strip())

    # Flirt interests
    interests = {}
    for field in ["flirtInterests_chat", "flirtInterests_friends", "flirtInterests_date"]:
        true_count = sum(1 for r in rows if r.get(field, "").lower() == "true")
        interests[field.replace("flirtInterests_", "")] = round(100 * true_count / len(rows), 1)

    # Countries
    countries = Counter(r.get("country", "") for r in rows if r.get("country", "").strip())

    # Verified / VIP / Mobile
    verified = sum(1 for r in rows if r.get("verified", "").lower() == "true" or r.get("verified", "").strip() == "1")
    mobile = sum(1 for r in rows if r.get("isMobile", "").lower() == "true" or r.get("isMobile", "").strip() == "1")

    # Profile completeness
    has_whazzup = sum(1 for r in rows if r.get("whazzup", "").strip())
    has_freetext = sum(1 for r in rows if r.get("freetext", "").strip())

    return {
        "source": "Lovoo",
        "count": len(rows),
        "age": {
            "mean": round(sum(ages) / len(ages), 1) if ages else 0,
            "median": sorted(ages)[len(ages) // 2] if ages else 0,
            "distribution": dict(Counter(
                "<20" if a < 20 else "20-24" if a < 25 else "25-29" if a < 30 else "30+"
                for a in ages
            ).most_common()),
        },
        "looking_for": dict(looking.most_common()),
        "flirt_interests_pct": interests,
        "engagement": {
            "profile_visits": {"mean": round(sum(visits) / len(visits)), "median": round(sorted(visits)[len(visits) // 2]), **percentiles(visits)},
            "kisses": {"mean": round(sum(kisses) / len(kisses), 1), "median": round(sorted(kisses)[len(kisses) // 2])},
            "fans": {"mean": round(sum(fans) / len(fans), 1)},
            "photos": {"mean": round(sum(photos) / len(photos), 1)},
        },
        "kiss_per_visit_pct": {
            "mean": round(100 * sum(ratios) / len(ratios), 2) if ratios else 0,
            "median": round(100 * sorted(ratios)[len(ratios) // 2], 2) if ratios else 0,
        },
        "countries": dict(countries.most_common(5)),
        "verified_pct": round(100 * verified / len(rows), 1),
        "mobile_pct": round(100 * mobile / len(rows), 1),
        "profile_whazzup_pct": round(100 * has_whazzup / len(rows), 1),
        "profile_freetext_pct": round(100 * has_freetext / len(rows), 1),
        "activity_hours": {str(h): hours.get(h, 0) for h in range(24)},
        "activity_days": {d: days.get(d, 0) for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]},
    }


# ============================================================
# 3. Speed Dating Women
# ============================================================
def load_speed_dating():
    path = BASE / "Speed dating experiment" / "Speed Dating Data.csv"
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    rows = list(csv.DictReader(io.StringIO(content)))
    women = [r for r in rows if r.get("gender", "").strip() == "0"]
    # Get unique female participants
    participants = {}
    for r in rows:
        if r.get("gender", "").strip() == "0":
            iid = r.get("iid", "")
            if iid and iid not in participants:
                participants[iid] = r
    print(f"Speed Dating: {len(women):,} dates by {len(participants)} women")
    return women, list(participants.values())


def analyze_sd_women(dates, participants):
    ages = [si(r.get("age")) for r in participants if si(r.get("age"))]

    # Selectivity: what % of men do they say yes to?
    by_person = defaultdict(lambda: {"total": 0, "yes": 0})
    for r in dates:
        iid = r.get("iid", "")
        by_person[iid]["total"] += 1
        if r.get("dec", "").strip() == "1":
            by_person[iid]["yes"] += 1

    yes_rates = [p["yes"] / p["total"] for p in by_person.values() if p["total"] >= 5]

    # What predicts her YES
    attrs = ["attr", "sinc", "intel", "fun", "amb", "shar", "like", "prob"]
    labels = {"attr": "Attractiveness", "sinc": "Sincerity", "intel": "Intelligence",
              "fun": "Fun", "amb": "Ambition", "shar": "Shared Interests",
              "like": "Overall Liking", "prob": "Perceived Reciprocity"}

    yes_avgs = defaultdict(list)
    no_avgs = defaultdict(list)
    for r in dates:
        dec = r.get("dec", "").strip()
        if dec not in ("0", "1"):
            continue
        for attr in attrs:
            val = sf(r.get(attr))
            if val is not None:
                if dec == "1":
                    yes_avgs[attr].append(val)
                else:
                    no_avgs[attr].append(val)

    decision_factors = {}
    for attr in attrs:
        y = round(sum(yes_avgs[attr]) / len(yes_avgs[attr]), 2) if yes_avgs[attr] else 0
        n = round(sum(no_avgs[attr]) / len(no_avgs[attr]), 2) if no_avgs[attr] else 0
        decision_factors[labels[attr]] = {"yes": y, "no": n, "delta": round(y - n, 2)}

    # Stated preferences (what she SAYS she wants)
    pref_fields = ["attr1_1", "sinc1_1", "intel1_1", "fun1_1", "amb1_1", "shar1_1"]
    pref_labels = {"attr1_1": "Attractiveness", "sinc1_1": "Sincerity", "intel1_1": "Intelligence",
                   "fun1_1": "Fun", "amb1_1": "Ambition", "shar1_1": "Shared Interests"}
    stated = {}
    for field, label in pref_labels.items():
        vals = [sf(r.get(field)) for r in dates if sf(r.get(field)) is not None]
        stated[label] = round(sum(vals) / len(vals), 1) if vals else 0

    # Match rate
    total_dates = len(dates)
    matches = sum(1 for r in dates if r.get("match", "").strip() == "1")

    # Got yes from partner (men saying yes to her)
    got_yes = sum(1 for r in dates if r.get("dec_o", "").strip() == "1")

    # Age gap preference
    age_gap_yes = defaultdict(lambda: {"total": 0, "yes": 0})
    for r in dates:
        age = sf(r.get("age"))
        age_o = sf(r.get("age_o"))
        if age is not None and age_o is not None:
            gap = age_o - age  # positive = older man
            if gap < -2:
                bracket = "Younger man (3+)"
            elif gap < 0:
                bracket = "Younger man (1-2)"
            elif gap <= 2:
                bracket = "Same age (+/-2)"
            elif gap <= 5:
                bracket = "Older man (3-5)"
            else:
                bracket = "Older man (6+)"
            age_gap_yes[bracket]["total"] += 1
            if r.get("dec", "").strip() == "1":
                age_gap_yes[bracket]["yes"] += 1

    age_gap_pref = {}
    for bracket in ["Younger man (3+)", "Younger man (1-2)", "Same age (+/-2)", "Older man (3-5)", "Older man (6+)"]:
        s = age_gap_yes.get(bracket, {"total": 0, "yes": 0})
        age_gap_pref[bracket] = {
            "dates": s["total"],
            "yes_pct": round(100 * s["yes"] / s["total"], 1) if s["total"] else 0,
        }

    # Race
    races = Counter()
    race_map = {"1": "Black", "2": "White", "3": "Hispanic", "4": "Asian", "5": "Native American", "6": "Other"}
    for r in participants:
        rc = race_map.get(r.get("race", "").strip(), "")
        if rc:
            races[rc] += 1

    # Same race preference
    same_yes = sum(1 for r in dates if r.get("samerace", "").strip() == "1" and r.get("dec", "").strip() == "1")
    same_total = sum(1 for r in dates if r.get("samerace", "").strip() == "1")
    diff_yes = sum(1 for r in dates if r.get("samerace", "").strip() == "0" and r.get("dec", "").strip() == "1")
    diff_total = sum(1 for r in dates if r.get("samerace", "").strip() == "0")

    # Goals
    goal_map = {"1": "Fun night out", "2": "Meet new people", "3": "Get a date",
                "4": "Serious relationship", "5": "To say I did it", "6": "Other"}
    goals = Counter(goal_map.get(r.get("goal", "").strip(), "") for r in participants if r.get("goal", "").strip())

    # Interests
    interest_fields = ["sports", "tvsports", "exercise", "dining", "museums", "art",
                       "hiking", "gaming", "clubbing", "reading", "tv", "theater",
                       "movies", "concerts", "music", "shopping", "yoga"]
    interest_avgs = {}
    for field in interest_fields:
        vals = [sf(r.get(field)) for r in participants if sf(r.get(field)) is not None]
        interest_avgs[field] = round(sum(vals) / len(vals), 2) if vals else 0
    interest_avgs = dict(sorted(interest_avgs.items(), key=lambda x: x[1], reverse=True))

    # Expected happiness
    exp = [sf(r.get("exphappy")) for r in participants if sf(r.get("exphappy")) is not None]

    return {
        "source": "Speed Dating (Columbia)",
        "count_participants": len(participants),
        "count_dates": total_dates,
        "age": {
            "mean": round(sum(ages) / len(ages), 1) if ages else 0,
            "median": sorted(ages)[len(ages) // 2] if ages else 0,
        },
        "race": dict(races.most_common()),
        "goals": dict(goals.most_common()),
        "selectivity": {
            "avg_yes_pct": round(100 * sum(yes_rates) / len(yes_rates), 1) if yes_rates else 0,
            "median_yes_pct": round(100 * sorted(yes_rates)[len(yes_rates) // 2], 1) if yes_rates else 0,
            "p10_pct": round(100 * sorted(yes_rates)[int(len(yes_rates) * 0.1)], 1) if yes_rates else 0,
            "p90_pct": round(100 * sorted(yes_rates)[int(len(yes_rates) * 0.9)], 1) if yes_rates else 0,
        },
        "match_rate_pct": round(100 * matches / total_dates, 1) if total_dates else 0,
        "got_yes_from_men_pct": round(100 * got_yes / total_dates, 1) if total_dates else 0,
        "what_predicts_her_yes": dict(sorted(decision_factors.items(), key=lambda x: x[1]["delta"], reverse=True)),
        "stated_preferences": stated,
        "age_gap_preference": age_gap_pref,
        "same_race_yes_pct": round(100 * same_yes / same_total, 1) if same_total else 0,
        "diff_race_yes_pct": round(100 * diff_yes / diff_total, 1) if diff_total else 0,
        "interests": interest_avgs,
        "expected_happiness": round(sum(exp) / len(exp), 2) if exp else 0,
    }


# ============================================================
# CROSS-DATASET SYNTHESIS
# ============================================================
def synthesize(okc, lovoo, sd):
    """Build cross-dataset synthesis focused on female patterns."""

    synthesis = {
        "title": "Women-Only Cross-Dataset Analysis for DatePulse",
        "datasets": {
            "OkCupid": f"{okc['count']:,} women (SF, ~2012)",
            "Lovoo": f"{lovoo['count']:,} women (CH/DE/FR, ~2015)",
            "Speed Dating": f"{sd['count_participants']} women (NYC, 2002-2004)",
        },

        "1_who_are_they": {
            "age": {
                "OkCupid": f"{okc['age']['mean']} avg (18-{max(a for a in [20,25,30,35,40,50] if okc['age']['distribution'].get(f'{a}-{a+4}', okc['age']['distribution'].get(f'{a}+', 0)))}+)",
                "Lovoo": f"{lovoo['age']['mean']} avg (youngest, 18-28 only)",
                "Speed Dating": f"{sd['age']['mean']} avg (grad students)",
                "insight": "Lovoo women are youngest (22), OkCupid oldest (33). App choice correlates with age/maturity.",
            },
            "orientation_OkCupid": okc["orientation"],
            "body_type_OkCupid": okc["body_type"],
        },

        "2_activity_patterns": {
            "peak_hours": {
                "OkCupid": _top_hours(okc["activity_hours"], 5),
                "Lovoo": _top_hours(lovoo["activity_hours"], 5),
                "insight": "OkCupid women peak 21-23h (evening). Lovoo women peak 14-16h (afternoon). Age-driven: younger = daytime, older = evening.",
            },
            "peak_days": {
                "OkCupid": _top_days(okc["activity_days"]),
                "Lovoo": _top_days(lovoo["activity_days"]),
                "insight": "OkCupid: Sat >>> Fri. Lovoo: Mon dominant (snapshot bias possible).",
            },
        },

        "3_what_women_want": {
            "speed_dating_actual_predictors": sd["what_predicts_her_yes"],
            "stated_vs_revealed": {
                "stated_top": sorted(sd["stated_preferences"].items(), key=lambda x: x[1], reverse=True),
                "revealed_top": [(k, v["delta"]) for k, v in sd["what_predicts_her_yes"].items()][:4],
                "insight": "Women SAY intelligence #1 (21%), but attractiveness has 2x more impact on actual decisions. Fun and shared interests also outperform stated importance.",
            },
            "lovoo_interests": lovoo["flirt_interests_pct"],
            "lovoo_insight": "Only 39% of women select 'date' as interest. 63% prefer chat/friends. Women on apps are not all actively seeking dates.",
        },

        "4_selectivity": {
            "speed_dating": sd["selectivity"],
            "insight": "Women say yes to 37% of men (median). Top 10% most selective: only 6% yes rate. Bottom 10%: 70% yes rate. Extreme variance.",
        },

        "5_engagement_lovoo": {
            "profile_visits": lovoo["engagement"]["profile_visits"],
            "kisses": lovoo["engagement"]["kisses"],
            "conversion": lovoo["kiss_per_visit_pct"],
            "insight": "Median woman gets 1,221 visits but only 44 kisses (3.4% conversion). Top 1% gets 32K+ visits. Power law distribution.",
        },

        "6_profile_investment": {
            "OkCupid_essays": {k: v for k, v in okc["essays"].items() if k in ["Self-summary", "Friday night", "Message me if", "Private thing"]},
            "Lovoo_completeness": {
                "whazzup_pct": lovoo["profile_whazzup_pct"],
                "freetext_pct": lovoo["profile_freetext_pct"],
            },
            "insight": "OkCupid women invest heavily in profiles (91% fill self-summary, avg 635 chars). Lovoo women barely fill bios (3% freetext). App UX drives investment.",
        },

        "7_age_gap_effect": {
            "speed_dating": sd["age_gap_preference"],
            "insight": "Women say yes most to same-age or slightly older men. Sharp drop for 6+ years older.",
        },

        "8_race_effect": {
            "same_race_yes_pct": sd["same_race_yes_pct"],
            "diff_race_yes_pct": sd["diff_race_yes_pct"],
            "insight": "Minimal difference in female yes rate by race match.",
        },
    }

    return synthesis


def _top_hours(hours_dict, n=5):
    return sorted(hours_dict.items(), key=lambda x: x[1], reverse=True)[:n]


def _top_days(days_dict):
    return sorted(days_dict.items(), key=lambda x: x[1], reverse=True)


def print_report(synthesis):
    print("\n" + "=" * 70)
    print("  WOMEN-ONLY CROSS-DATASET ANALYSIS")
    print("  For DatePulse scoring model optimization")
    print("=" * 70)

    for section_key, section in synthesis.items():
        if section_key in ("title", "datasets"):
            if section_key == "datasets":
                print(f"\n  Datasets:")
                for k, v in section.items():
                    print(f"    - {k}: {v}")
            continue

        print(f"\n{'='*70}")
        print(f"  {section_key.upper()}")
        print(f"{'='*70}")

        if isinstance(section, dict):
            for k, v in section.items():
                if isinstance(v, dict):
                    print(f"\n  [{k}]")
                    for k2, v2 in v.items():
                        if isinstance(v2, dict):
                            items = ", ".join(f"{k3}={v3}" for k3, v3 in v2.items())
                            print(f"    {k2}: {items}")
                        elif isinstance(v2, list):
                            items = ", ".join(f"{a}={b}" for a, b in v2[:5])
                            print(f"    {k2}: {items}")
                        else:
                            print(f"    {k2}: {v2}")
                elif isinstance(v, list):
                    items = ", ".join(f"{a}: {b}" for a, b in v[:5])
                    print(f"  {k}: {items}")
                else:
                    print(f"  {k}: {v}")


def main():
    print("Loading women-only data from 3 datasets...\n")

    # Load
    okc_rows = load_okcupid_women()
    lovoo_rows = load_lovoo()
    sd_dates, sd_participants = load_speed_dating()

    # Analyze
    print("\nAnalyzing...")
    okc = analyze_okc_women(okc_rows)
    lovoo = analyze_lovoo_women(lovoo_rows)
    sd = analyze_sd_women(sd_dates, sd_participants)

    # Synthesize
    synthesis = synthesize(okc, lovoo, sd)

    # Add raw data for JSON
    full_report = {
        "synthesis": synthesis,
        "raw": {
            "okcupid_women": okc,
            "lovoo_women": lovoo,
            "speed_dating_women": sd,
        },
        "generated": datetime.now().isoformat(),
    }

    # Print
    print_report(synthesis)

    # Save
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2, ensure_ascii=False, default=str)
    print(f"\n\nFull report saved to: {OUTPUT}")


if __name__ == "__main__":
    main()
