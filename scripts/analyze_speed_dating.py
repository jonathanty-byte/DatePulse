"""
Speed Dating Experiment Analysis (Columbia University, 2002-2004)
8,378 observations from 552 participants across 21 speed dating events.
Each row = one 4-minute date between two participants.
Key: what predicts a match?
"""

import csv
import json
import sys
import io
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "Speed dating experiment" / "Speed Dating Data.csv"
OUTPUT_PATH = Path(__file__).parent / "output" / "speed_dating_analysis.json"


def safe_float(val, default=None):
    if val is None:
        return default
    val = str(val).strip()
    if not val:
        return default
    try:
        return float(val)
    except ValueError:
        return default


def safe_int(val, default=None):
    f = safe_float(val)
    if f is None:
        return default
    return int(f)


def load_data():
    """Load CSV handling CR line endings."""
    with open(DATA_PATH, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)
    print(f"Loaded {len(rows):,} speed dates from {len(set(r.get('iid','') for r in rows))} participants")
    return rows


def analyze_demographics(rows):
    """Participant demographics."""
    # Get unique participants (by iid)
    participants = {}
    for r in rows:
        iid = r.get("iid", "")
        if iid and iid not in participants:
            participants[iid] = r

    people = list(participants.values())
    ages = [safe_int(r.get("age")) for r in people if safe_int(r.get("age"))]
    genders = Counter(("Female" if r.get("gender", "").strip() == "0" else "Male") for r in people if r.get("gender", "").strip())

    # Race mapping
    race_map = {"1": "Black", "2": "White", "3": "Hispanic", "4": "Asian", "5": "Native American", "6": "Other"}
    races = Counter(race_map.get(r.get("race", "").strip(), "Unknown") for r in people if r.get("race", "").strip())

    # Field of study
    fields = Counter()
    for r in people:
        f = r.get("field", "").strip()
        if f:
            fields[f.title()] += 1

    # Goal
    goal_map = {
        "1": "Fun night out",
        "2": "Meet new people",
        "3": "Get a date",
        "4": "Serious relationship",
        "5": "To say I did it",
        "6": "Other",
    }
    goals = Counter(goal_map.get(r.get("goal", "").strip(), "Unknown") for r in people if r.get("goal", "").strip())

    # How often go out
    go_out_map = {
        "1": "Several times a week",
        "2": "Twice a week",
        "3": "Once a week",
        "4": "Twice a month",
        "5": "Once a month",
        "6": "Several times a year",
        "7": "Almost never",
    }
    go_out = Counter(go_out_map.get(r.get("go_out", "").strip(), "Unknown") for r in people if r.get("go_out", "").strip())

    age_brackets = Counter()
    for a in ages:
        if a < 22:
            age_brackets["<22"] += 1
        elif a < 25:
            age_brackets["22-24"] += 1
        elif a < 28:
            age_brackets["25-27"] += 1
        elif a < 30:
            age_brackets["28-29"] += 1
        elif a < 35:
            age_brackets["30-34"] += 1
        else:
            age_brackets["35+"] += 1

    return {
        "unique_participants": len(people),
        "total_dates": len(rows),
        "gender": dict(genders.most_common()),
        "age": {
            "mean": round(sum(ages) / len(ages), 1) if ages else 0,
            "median": sorted(ages)[len(ages) // 2] if ages else 0,
            "min": min(ages) if ages else 0,
            "max": max(ages) if ages else 0,
            "brackets": dict(sorted(age_brackets.items())),
        },
        "race": dict(races.most_common()),
        "top_fields": dict(fields.most_common(15)),
        "goals": dict(goals.most_common()),
        "go_out_frequency": dict(go_out.most_common()),
    }


def analyze_match_rates(rows):
    """Overall and by-gender match rates."""
    total = len(rows)
    matches = sum(1 for r in rows if r.get("match", "").strip() == "1")

    # Decision rates (did they say yes?)
    dec_yes = sum(1 for r in rows if r.get("dec", "").strip() == "1")
    dec_o_yes = sum(1 for r in rows if r.get("dec_o", "").strip() == "1")

    # By gender (gender=0 is female, gender=1 is male)
    by_gender = defaultdict(lambda: {"total": 0, "said_yes": 0, "got_yes": 0, "matches": 0})
    for r in rows:
        g = r.get("gender", "").strip()
        if g == "0":
            label = "Female"
        elif g == "1":
            label = "Male"
        else:
            continue
        by_gender[label]["total"] += 1
        if r.get("dec", "").strip() == "1":
            by_gender[label]["said_yes"] += 1
        if r.get("dec_o", "").strip() == "1":
            by_gender[label]["got_yes"] += 1
        if r.get("match", "").strip() == "1":
            by_gender[label]["matches"] += 1

    gender_stats = {}
    for gender, stats in by_gender.items():
        gender_stats[gender] = {
            "total_dates": stats["total"],
            "said_yes_pct": round(100 * stats["said_yes"] / stats["total"], 1) if stats["total"] else 0,
            "got_yes_pct": round(100 * stats["got_yes"] / stats["total"], 1) if stats["total"] else 0,
            "match_rate_pct": round(100 * stats["matches"] / stats["total"], 1) if stats["total"] else 0,
        }

    # Same race effect
    same_race_match = sum(1 for r in rows if r.get("samerace", "").strip() == "1" and r.get("match", "").strip() == "1")
    same_race_total = sum(1 for r in rows if r.get("samerace", "").strip() == "1")
    diff_race_match = sum(1 for r in rows if r.get("samerace", "").strip() == "0" and r.get("match", "").strip() == "1")
    diff_race_total = sum(1 for r in rows if r.get("samerace", "").strip() == "0")

    return {
        "overall_match_rate_pct": round(100 * matches / total, 1) if total else 0,
        "overall_yes_rate_pct": round(100 * dec_yes / total, 1) if total else 0,
        "partner_yes_rate_pct": round(100 * dec_o_yes / total, 1) if total else 0,
        "total_matches": matches,
        "by_gender": gender_stats,
        "same_race_match_rate_pct": round(100 * same_race_match / same_race_total, 1) if same_race_total else 0,
        "diff_race_match_rate_pct": round(100 * diff_race_match / diff_race_total, 1) if diff_race_total else 0,
    }


def analyze_attribute_ratings(rows):
    """What attributes matter most for matches."""
    attrs = ["attr", "sinc", "intel", "fun", "amb", "shar"]
    attr_labels = {
        "attr": "Attractiveness",
        "sinc": "Sincerity",
        "intel": "Intelligence",
        "fun": "Fun",
        "amb": "Ambition",
        "shar": "Shared Interests",
    }

    # Average ratings for matches vs non-matches
    match_ratings = defaultdict(list)
    no_match_ratings = defaultdict(list)
    for r in rows:
        is_match = r.get("match", "").strip() == "1"
        for attr in attrs:
            val = safe_float(r.get(attr))
            if val is not None:
                if is_match:
                    match_ratings[attr].append(val)
                else:
                    no_match_ratings[attr].append(val)

    comparison = {}
    for attr in attrs:
        label = attr_labels[attr]
        m_avg = round(sum(match_ratings[attr]) / len(match_ratings[attr]), 2) if match_ratings[attr] else 0
        n_avg = round(sum(no_match_ratings[attr]) / len(no_match_ratings[attr]), 2) if no_match_ratings[attr] else 0
        comparison[label] = {
            "match_avg": m_avg,
            "no_match_avg": n_avg,
            "delta": round(m_avg - n_avg, 2),
        }

    # What they SAY they want vs what predicts match
    # attr1_1 = importance of attractiveness (self-reported)
    pref_attrs = ["attr1_1", "sinc1_1", "intel1_1", "fun1_1", "amb1_1", "shar1_1"]
    pref_labels = {
        "attr1_1": "Attractiveness",
        "sinc1_1": "Sincerity",
        "intel1_1": "Intelligence",
        "fun1_1": "Fun",
        "amb1_1": "Ambition",
        "shar1_1": "Shared Interests",
    }
    stated_prefs_by_gender = defaultdict(lambda: defaultdict(list))
    for r in rows:
        g = "Female" if r.get("gender", "").strip() == "0" else "Male"
        for pref in pref_attrs:
            val = safe_float(r.get(pref))
            if val is not None:
                stated_prefs_by_gender[g][pref_labels[pref]].append(val)

    stated_prefs = {}
    for gender in ("Male", "Female"):
        stated_prefs[gender] = {}
        for label, vals in stated_prefs_by_gender[gender].items():
            stated_prefs[gender][label] = round(sum(vals) / len(vals), 1) if vals else 0

    return {
        "ratings_match_vs_no_match": comparison,
        "stated_preferences_by_gender": stated_prefs,
    }


def analyze_attribute_by_gender(rows):
    """Rating differences by gender (what men vs women rate higher)."""
    attrs = ["attr", "sinc", "intel", "fun", "amb", "shar"]
    attr_labels = {
        "attr": "Attractiveness",
        "sinc": "Sincerity",
        "intel": "Intelligence",
        "fun": "Fun",
        "amb": "Ambition",
        "shar": "Shared Interests",
    }

    # Average ratings given BY each gender
    by_gender = defaultdict(lambda: defaultdict(list))
    for r in rows:
        g = "Female" if r.get("gender", "").strip() == "0" else "Male"
        for attr in attrs:
            val = safe_float(r.get(attr))
            if val is not None:
                by_gender[g][attr].append(val)

    result = {}
    for gender in ("Male", "Female"):
        result[gender] = {}
        for attr in attrs:
            vals = by_gender[gender][attr]
            result[gender][attr_labels[attr]] = round(sum(vals) / len(vals), 2) if vals else 0

    return result


def analyze_decision_factors(rows):
    """Correlate each attribute with the decision to say yes."""
    attrs = ["attr", "sinc", "intel", "fun", "amb", "shar", "like", "prob"]
    attr_labels = {
        "attr": "Attractiveness",
        "sinc": "Sincerity",
        "intel": "Intelligence",
        "fun": "Fun",
        "amb": "Ambition",
        "shar": "Shared Interests",
        "like": "Overall Liking",
        "prob": "Perceived Reciprocity",
    }

    # Average attribute scores when person said YES vs NO
    yes_scores = defaultdict(list)
    no_scores = defaultdict(list)

    for r in rows:
        dec = r.get("dec", "").strip()
        if dec not in ("0", "1"):
            continue
        said_yes = dec == "1"
        for attr in attrs:
            val = safe_float(r.get(attr))
            if val is not None:
                if said_yes:
                    yes_scores[attr].append(val)
                else:
                    no_scores[attr].append(val)

    result = {}
    for attr in attrs:
        label = attr_labels[attr]
        y_avg = round(sum(yes_scores[attr]) / len(yes_scores[attr]), 2) if yes_scores[attr] else 0
        n_avg = round(sum(no_scores[attr]) / len(no_scores[attr]), 2) if no_scores[attr] else 0
        result[label] = {
            "yes_avg": y_avg,
            "no_avg": n_avg,
            "delta": round(y_avg - n_avg, 2),
            "impact_ratio": round(y_avg / n_avg, 2) if n_avg else 0,
        }

    return result


def analyze_wave_patterns(rows):
    """Match rates by wave (event number)."""
    by_wave = defaultdict(lambda: {"total": 0, "matches": 0})
    for r in rows:
        wave = safe_int(r.get("wave"))
        if wave is not None:
            by_wave[wave]["total"] += 1
            if r.get("match", "").strip() == "1":
                by_wave[wave]["matches"] += 1

    result = {}
    for wave in sorted(by_wave.keys()):
        stats = by_wave[wave]
        result[f"wave_{wave}"] = {
            "dates": stats["total"],
            "matches": stats["matches"],
            "match_rate_pct": round(100 * stats["matches"] / stats["total"], 1) if stats["total"] else 0,
        }
    return result


def analyze_interests(rows):
    """Hobby/interest ratings."""
    interest_fields = [
        "sports", "tvsports", "exercise", "dining", "museums", "art",
        "hiking", "gaming", "clubbing", "reading", "tv", "theater",
        "movies", "concerts", "music", "shopping", "yoga",
    ]

    # Get unique participants
    participants = {}
    for r in rows:
        iid = r.get("iid", "")
        if iid and iid not in participants:
            participants[iid] = r

    # Average interest scores
    averages = {}
    for field in interest_fields:
        vals = [safe_float(r.get(field)) for r in participants.values() if safe_float(r.get(field)) is not None]
        averages[field] = round(sum(vals) / len(vals), 2) if vals else 0

    # Sort by popularity
    return dict(sorted(averages.items(), key=lambda x: x[1], reverse=True))


def analyze_selectivity(rows):
    """How selective are men vs women?"""
    by_person = defaultdict(lambda: {"total": 0, "yes": 0, "gender": ""})
    for r in rows:
        iid = r.get("iid", "")
        g = "Female" if r.get("gender", "").strip() == "0" else "Male"
        by_person[iid]["total"] += 1
        by_person[iid]["gender"] = g
        if r.get("dec", "").strip() == "1":
            by_person[iid]["yes"] += 1

    selectivity_by_gender = defaultdict(list)
    for iid, stats in by_person.items():
        if stats["total"] >= 5:  # min dates threshold
            rate = stats["yes"] / stats["total"]
            selectivity_by_gender[stats["gender"]].append(rate)

    result = {}
    for gender, rates in selectivity_by_gender.items():
        sorted_rates = sorted(rates)
        result[gender] = {
            "avg_yes_rate_pct": round(100 * sum(rates) / len(rates), 1),
            "median_yes_rate_pct": round(100 * sorted_rates[len(rates) // 2], 1),
            "p10_pct": round(100 * sorted_rates[int(len(rates) * 0.1)], 1),
            "p90_pct": round(100 * sorted_rates[int(len(rates) * 0.9)], 1),
            "participants": len(rates),
        }

    return result


def analyze_age_gap_effect(rows):
    """Does age gap affect match rate?"""
    age_gaps = defaultdict(lambda: {"total": 0, "matches": 0})
    for r in rows:
        age = safe_float(r.get("age"))
        age_o = safe_float(r.get("age_o"))
        if age is not None and age_o is not None:
            gap = abs(age - age_o)
            if gap <= 1:
                bracket = "0-1"
            elif gap <= 3:
                bracket = "2-3"
            elif gap <= 5:
                bracket = "4-5"
            elif gap <= 8:
                bracket = "6-8"
            else:
                bracket = "9+"
            age_gaps[bracket]["total"] += 1
            if r.get("match", "").strip() == "1":
                age_gaps[bracket]["matches"] += 1

    result = {}
    for bracket in ["0-1", "2-3", "4-5", "6-8", "9+"]:
        stats = age_gaps.get(bracket, {"total": 0, "matches": 0})
        result[bracket + " years"] = {
            "dates": stats["total"],
            "match_rate_pct": round(100 * stats["matches"] / stats["total"], 1) if stats["total"] else 0,
        }
    return result


def analyze_expected_happiness(rows):
    """Expected vs actual happiness from dating."""
    participants = {}
    for r in rows:
        iid = r.get("iid", "")
        if iid and iid not in participants:
            participants[iid] = r

    exp_happy = [safe_float(r.get("exphappy")) for r in participants.values() if safe_float(r.get("exphappy")) is not None]

    by_gender = defaultdict(list)
    for r in participants.values():
        g = "Female" if r.get("gender", "").strip() == "0" else "Male"
        val = safe_float(r.get("exphappy"))
        if val is not None:
            by_gender[g].append(val)

    result = {
        "overall_mean": round(sum(exp_happy) / len(exp_happy), 2) if exp_happy else 0,
    }
    for gender, vals in by_gender.items():
        result[gender] = round(sum(vals) / len(vals), 2) if vals else 0

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
    print("  Speed Dating Experiment Analysis")
    print("  Columbia University, 2002-2004")
    print("  552 participants, 21 waves, 8378 speed dates")
    print("=" * 60)

    rows = load_data()

    demographics = analyze_demographics(rows)
    match_rates = analyze_match_rates(rows)
    attributes = analyze_attribute_ratings(rows)
    attr_by_gender = analyze_attribute_by_gender(rows)
    decision_factors = analyze_decision_factors(rows)
    selectivity = analyze_selectivity(rows)
    wave_patterns = analyze_wave_patterns(rows)
    interests = analyze_interests(rows)
    age_gap = analyze_age_gap_effect(rows)
    happiness = analyze_expected_happiness(rows)

    print_section("DEMOGRAPHICS", demographics)
    print_section("MATCH RATES", match_rates)
    print_section("SELECTIVITY (per person)", selectivity)
    print_section("WHAT PREDICTS SAYING YES (rating delta)", decision_factors)
    print_section("RATINGS: MATCH vs NO-MATCH", attributes["ratings_match_vs_no_match"])
    print_section("STATED PREFERENCES BY GENDER", attributes["stated_preferences_by_gender"])
    print_section("ACTUAL RATINGS GIVEN BY GENDER", attr_by_gender)
    print_section("AGE GAP EFFECT ON MATCH RATE", age_gap)
    print_section("INTERESTS (1-10 scale)", interests)
    print_section("EXPECTED HAPPINESS", happiness)

    # Save
    report = {
        "dataset": "Speed Dating Experiment (Columbia, 2002-2004)",
        "generated": datetime.now().isoformat(),
        "demographics": demographics,
        "match_rates": match_rates,
        "selectivity": selectivity,
        "decision_factors": decision_factors,
        "attribute_ratings": attributes,
        "ratings_by_gender": attr_by_gender,
        "age_gap_effect": age_gap,
        "interests": interests,
        "wave_patterns": wave_patterns,
        "expected_happiness": happiness,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nFull report saved to: {OUTPUT_PATH}")

    # Key insights
    print("\n" + "=" * 60)
    print("  KEY INSIGHTS FOR DATEPULSE")
    print("=" * 60)

    mr = match_rates
    print(f"\n  Overall match rate: {mr['overall_match_rate_pct']}%")
    print(f"  Same race match rate: {mr['same_race_match_rate_pct']}% vs diff race: {mr['diff_race_match_rate_pct']}%")

    bg = mr["by_gender"]
    for g in ("Male", "Female"):
        if g in bg:
            print(f"  {g}: said yes {bg[g]['said_yes_pct']}%, got yes {bg[g]['got_yes_pct']}%, match {bg[g]['match_rate_pct']}%")

    # Top predictor
    print(f"\n  Top predictors of saying YES (delta yes-no):")
    df = decision_factors
    sorted_factors = sorted(df.items(), key=lambda x: x[1]["delta"], reverse=True)
    for label, stats in sorted_factors[:5]:
        print(f"    {label}: {stats['yes_avg']} vs {stats['no_avg']} (delta +{stats['delta']})")

    print("\n  Analysis complete.")


if __name__ == "__main__":
    main()
