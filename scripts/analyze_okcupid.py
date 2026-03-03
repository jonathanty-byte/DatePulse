"""
OkCupid Profile Dataset Analysis
Analyzes ~60K profiles from San Francisco area for dating behavior insights.
Outputs stats to console + saves summary JSON.
"""

import csv
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "OkCupid" / "okcupid_profiles.csv"
OUTPUT_PATH = Path(__file__).parent / "output" / "okcupid_analysis.json"


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


def load_data():
    """Load CSV into list of dicts."""
    rows = []
    with open(DATA_PATH, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"Loaded {len(rows):,} profiles")
    return rows


def analyze_demographics(rows):
    """Age, sex, orientation breakdown."""
    ages = [safe_int(r["age"]) for r in rows if safe_int(r["age"])]
    sexes = Counter(r["sex"] for r in rows if r["sex"])
    orientations = Counter(r["orientation"] for r in rows if r["orientation"])
    statuses = Counter(r["status"] for r in rows if r["status"])

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

    return {
        "total_profiles": len(rows),
        "age": {
            "mean": round(sum(ages) / len(ages), 1) if ages else 0,
            "median": sorted(ages)[len(ages) // 2] if ages else 0,
            "min": min(ages) if ages else 0,
            "max": max(ages) if ages else 0,
            "brackets": dict(sorted(age_brackets.items())),
        },
        "sex": dict(sexes.most_common()),
        "orientation": dict(orientations.most_common()),
        "status": dict(statuses.most_common()),
    }


def analyze_lifestyle(rows):
    """Diet, drinks, drugs, smokes."""
    fields = ["diet", "drinks", "drugs", "smokes"]
    result = {}
    for field in fields:
        counts = Counter(r[field] for r in rows if r[field].strip())
        result[field] = dict(counts.most_common(15))
    return result


def analyze_physical(rows):
    """Body type, height."""
    body_types = Counter(r["body_type"] for r in rows if r["body_type"].strip())

    heights = [safe_float(r["height"]) for r in rows if safe_float(r["height"])]
    heights_cm = [h * 2.54 for h in heights]  # inches to cm

    # Height by sex
    height_by_sex = defaultdict(list)
    for r in rows:
        h = safe_float(r["height"])
        if h and r["sex"]:
            height_by_sex[r["sex"]].append(h * 2.54)

    height_stats = {}
    for sex, hs in height_by_sex.items():
        height_stats[sex] = {
            "mean_cm": round(sum(hs) / len(hs), 1),
            "count": len(hs),
        }

    return {
        "body_type": dict(body_types.most_common()),
        "height_overall_mean_cm": round(sum(heights_cm) / len(heights_cm), 1) if heights_cm else 0,
        "height_by_sex": height_stats,
    }


def analyze_education_income(rows):
    """Education level, income distribution."""
    education = Counter(r["education"] for r in rows if r["education"].strip())

    incomes = [safe_int(r["income"]) for r in rows if safe_int(r["income"]) is not None]
    income_brackets = Counter()
    for inc in incomes:
        if inc < 20000:
            income_brackets["<20k"] += 1
        elif inc < 40000:
            income_brackets["20-40k"] += 1
        elif inc < 60000:
            income_brackets["40-60k"] += 1
        elif inc < 80000:
            income_brackets["60-80k"] += 1
        elif inc < 100000:
            income_brackets["80-100k"] += 1
        elif inc < 150000:
            income_brackets["100-150k"] += 1
        else:
            income_brackets["150k+"] += 1

    jobs = Counter(r["job"] for r in rows if r["job"].strip())

    return {
        "education": dict(education.most_common()),
        "income_brackets": dict(sorted(income_brackets.items())),
        "income_reported_count": len(incomes),
        "income_mean": round(sum(incomes) / len(incomes)) if incomes else 0,
        "top_jobs": dict(jobs.most_common(15)),
    }


def analyze_religion_sign(rows):
    """Religion and astro sign."""
    religions = Counter(r["religion"] for r in rows if r["religion"].strip())
    signs = Counter(r["sign"] for r in rows if r["sign"].strip())

    # Extract just the sign name (before "but" or "and")
    clean_signs = Counter()
    for s, c in signs.items():
        base = s.split(" ")[0].strip()
        clean_signs[base] += c

    return {
        "religion": dict(religions.most_common(15)),
        "astro_sign": dict(clean_signs.most_common()),
    }


def analyze_offspring_pets(rows):
    """Offspring and pets preferences."""
    offspring = Counter(r["offspring"] for r in rows if r["offspring"].strip())
    pets = Counter(r["pets"] for r in rows if r["pets"].strip())
    return {
        "offspring": dict(offspring.most_common()),
        "pets": dict(pets.most_common()),
    }


def analyze_activity(rows):
    """Last online activity patterns."""
    online_hours = Counter()
    online_days = Counter()
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for r in rows:
        lo = r.get("last_online", "")
        if lo:
            try:
                dt = datetime.strptime(lo, "%Y-%m-%d-%H-%M")
                online_hours[dt.hour] += 1
                online_days[day_names[dt.weekday()]] += 1
            except ValueError:
                pass

    # Sort hours
    sorted_hours = {str(h): online_hours.get(h, 0) for h in range(24)}
    sorted_days = {d: online_days.get(d, 0) for d in day_names}

    return {
        "last_online_by_hour": sorted_hours,
        "last_online_by_day": sorted_days,
    }


def analyze_essays(rows):
    """Essay completion rates and avg lengths."""
    essay_fields = [f"essay{i}" for i in range(10)]
    essay_labels = {
        "essay0": "Self-summary",
        "essay1": "What I'm doing with my life",
        "essay2": "I'm really good at",
        "essay3": "First things people notice",
        "essay4": "Favorite books/movies/shows",
        "essay5": "Six things I couldn't do without",
        "essay6": "I spend a lot of time thinking about",
        "essay7": "On a typical Friday night",
        "essay8": "Most private thing to admit",
        "essay9": "You should message me if",
    }

    stats = {}
    for field in essay_fields:
        filled = [r[field] for r in rows if r.get(field, "").strip()]
        lengths = [len(e) for e in filled]
        stats[essay_labels.get(field, field)] = {
            "fill_rate_pct": round(100 * len(filled) / len(rows), 1),
            "avg_length_chars": round(sum(lengths) / len(lengths)) if lengths else 0,
        }
    return stats


def analyze_gender_differences(rows):
    """Key differences between male and female profiles."""
    by_sex = defaultdict(list)
    for r in rows:
        if r["sex"] in ("m", "f"):
            by_sex[r["sex"]].append(r)

    result = {}
    for sex, profiles in by_sex.items():
        ages = [safe_int(r["age"]) for r in profiles if safe_int(r["age"])]
        incomes = [safe_int(r["income"]) for r in profiles if safe_int(r["income"]) is not None]

        # Essay fill rates
        essay_filled = sum(
            1 for r in profiles
            if any(r.get(f"essay{i}", "").strip() for i in range(10))
        )

        # Orientation
        orientations = Counter(r["orientation"] for r in profiles if r["orientation"])

        result[sex] = {
            "count": len(profiles),
            "avg_age": round(sum(ages) / len(ages), 1) if ages else 0,
            "avg_income": round(sum(incomes) / len(incomes)) if incomes else 0,
            "income_reported_pct": round(100 * len(incomes) / len(profiles), 1),
            "essay_any_filled_pct": round(100 * essay_filled / len(profiles), 1),
            "orientation": dict(orientations.most_common()),
        }

    return result


def analyze_location(rows):
    """Top locations."""
    locations = Counter(r["location"] for r in rows if r["location"].strip())
    return {"top_locations": dict(locations.most_common(20))}


def analyze_languages(rows):
    """Languages spoken."""
    lang_counter = Counter()
    for r in rows:
        speaks = r.get("speaks", "")
        if speaks:
            for lang in speaks.split(","):
                base_lang = lang.strip().split("(")[0].strip().lower()
                if base_lang:
                    lang_counter[base_lang] += 1
    return {"languages": dict(lang_counter.most_common(20))}


def analyze_ethnicity(rows):
    """Ethnicity distribution."""
    eth_counter = Counter()
    for r in rows:
        eth = r.get("ethnicity", "")
        if eth.strip():
            # Some have multiple ethnicities comma-separated
            for e in eth.split(","):
                e = e.strip()
                if e:
                    eth_counter[e] += 1
    return {"ethnicity": dict(eth_counter.most_common(15))}


def print_section(title, data, indent=0):
    """Pretty-print a section."""
    prefix = "  " * indent
    print(f"\n{prefix}{'='*60}")
    print(f"{prefix}  {title}")
    print(f"{prefix}{'='*60}")
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, dict):
                print(f"{prefix}  {k}:")
                for k2, v2 in v.items():
                    print(f"{prefix}    {k2}: {v2}")
            else:
                print(f"{prefix}  {k}: {v}")
    else:
        print(f"{prefix}  {data}")


def main():
    print("=" * 60)
    print("  OkCupid Profile Dataset Analysis")
    print("  ~60K profiles from San Francisco Bay Area")
    print("=" * 60)

    rows = load_data()

    # Run all analyses
    demographics = analyze_demographics(rows)
    lifestyle = analyze_lifestyle(rows)
    physical = analyze_physical(rows)
    edu_income = analyze_education_income(rows)
    religion_sign = analyze_religion_sign(rows)
    offspring_pets = analyze_offspring_pets(rows)
    activity = analyze_activity(rows)
    essays = analyze_essays(rows)
    gender_diff = analyze_gender_differences(rows)
    location = analyze_location(rows)
    languages = analyze_languages(rows)
    ethnicity = analyze_ethnicity(rows)

    # Print results
    print_section("DEMOGRAPHICS", demographics)
    print_section("GENDER DIFFERENCES", gender_diff)
    print_section("LIFESTYLE", lifestyle)
    print_section("PHYSICAL", physical)
    print_section("EDUCATION & INCOME", edu_income)
    print_section("RELIGION & ASTROLOGY", religion_sign)
    print_section("OFFSPRING & PETS", offspring_pets)
    print_section("ACTIVITY PATTERNS (last_online)", activity)
    print_section("ESSAY COMPLETION", essays)
    print_section("LOCATION", location)
    print_section("LANGUAGES", languages)
    print_section("ETHNICITY", ethnicity)

    # Compile full report
    report = {
        "dataset": "OkCupid Profiles (~60K, San Francisco Bay Area)",
        "generated": datetime.now().isoformat(),
        "demographics": demographics,
        "gender_differences": gender_diff,
        "lifestyle": lifestyle,
        "physical": physical,
        "education_income": edu_income,
        "religion_sign": religion_sign,
        "offspring_pets": offspring_pets,
        "activity_patterns": activity,
        "essay_completion": essays,
        "location": location,
        "languages": languages,
        "ethnicity": ethnicity,
    }

    # Save JSON
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nFull report saved to: {OUTPUT_PATH}")

    # Key insights summary
    print("\n" + "=" * 60)
    print("  KEY INSIGHTS FOR DATEPULSE")
    print("=" * 60)

    # Peak activity hours
    hours = activity["last_online_by_hour"]
    top_hours = sorted(hours.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"\n  Peak activity hours: {', '.join(f'{h}h ({c:,})' for h, c in top_hours)}")

    # Peak days
    days = activity["last_online_by_day"]
    top_days = sorted(days.items(), key=lambda x: x[1], reverse=True)
    print(f"  Peak activity days: {', '.join(f'{d} ({c:,})' for d, c in top_days[:3])}")

    # Gender ratio
    m_count = demographics["sex"].get("m", 0)
    f_count = demographics["sex"].get("f", 0)
    total = m_count + f_count
    print(f"\n  Gender ratio: {round(100*m_count/total)}% male / {round(100*f_count/total)}% female")
    print(f"  Male avg age: {gender_diff.get('m', {}).get('avg_age', '?')}, Female avg age: {gender_diff.get('f', {}).get('avg_age', '?')}")

    # Essay engagement
    print(f"\n  Essay engagement (any essay filled):")
    for sex in ("m", "f"):
        gd = gender_diff.get(sex, {})
        print(f"    {'Male' if sex == 'm' else 'Female'}: {gd.get('essay_any_filled_pct', '?')}%")

    print("\n  Analysis complete.")


if __name__ == "__main__":
    main()
