"""
OkCupid Full Dataset — Women-Only Analysis
25,952 female profiles + 2,541 compatibility questions.
Focus: preferences, sexuality, personality, what women actually want vs say.
"""

import csv
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATA_DIR = Path(__file__).parent.parent / "data" / "OKcupid full"
PARQUET_PATH = DATA_DIR / "parsed_data_public.parquet"
QUESTIONS_PATH = DATA_DIR / "question_data.csv"
OUTPUT_PATH = Path(__file__).parent / "output" / "okcupid_full_women.json"


def load_parquet():
    import pyarrow.parquet as pq
    table = pq.read_table(PARQUET_PATH)
    cols = table.column_names
    # Convert to list of dicts (only non-null rows)
    # For efficiency, convert column by column
    n = table.num_rows
    print(f"Loaded {n:,} total profiles, {len(cols)} columns")
    return table, cols


def load_questions():
    """Load questions. CSV first col is unnamed (empty key) and values are already 'q2','q11' etc."""
    questions = {}
    with open(QUESTIONS_PATH, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter=";")
        first_key = None
        for row in reader:
            if first_key is None:
                first_key = list(row.keys())[0]  # empty string or BOM-prefixed
            qid = row[first_key].strip()
            if not qid:
                continue
            # qid is already like "q2", "q11" — store with the q prefix as key
            questions[qid] = {
                "text": row.get("text", ""),
                "options": [row.get(f"option_{i}", "") for i in range(1, 5) if row.get(f"option_{i}", "").strip()],
                "n": int(row.get("N", "0") or "0"),
                "keywords": row.get("Keywords", ""),
            }
    print(f"Loaded {len(questions):,} questions")
    return questions


def get_column_values(table, col_name):
    """Get non-null values from a column."""
    col = table.column(col_name)
    return [v.as_py() for v in col if v.as_py() is not None]


def get_women_mask(table):
    """Return boolean list for women rows."""
    gender_col = table.column("gender")
    return [v.as_py() == "Woman" for v in gender_col]


def filter_women(table, women_mask):
    """Get values for women only from a column."""
    import pyarrow.compute as pc
    mask_array = table.column("gender")
    # Use pyarrow filter
    import pyarrow as pa
    mask = pa.array(women_mask)
    return table.filter(mask)


def safe_float(val):
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def analyze_demographics(w_table):
    """Age, orientation, ethnicity, body type, location."""
    import pyarrow.compute as pc

    # Age
    ages = [v.as_py() for v in w_table.column("d_age") if v.as_py() is not None]
    ages = [a for a in ages if 18 <= a <= 80]

    age_brackets = Counter()
    for a in ages:
        if a < 20: age_brackets["18-19"] += 1
        elif a < 25: age_brackets["20-24"] += 1
        elif a < 30: age_brackets["25-29"] += 1
        elif a < 35: age_brackets["30-34"] += 1
        elif a < 40: age_brackets["35-39"] += 1
        elif a < 50: age_brackets["40-49"] += 1
        else: age_brackets["50+"] += 1

    # Orientation
    orientations = Counter(v.as_py() for v in w_table.column("d_orientation") if v.as_py())

    # Gender orientation (more specific)
    gender_orient = Counter(v.as_py() for v in w_table.column("gender_orientation") if v.as_py())

    # Ethnicity
    ethnicities = Counter(v.as_py() for v in w_table.column("d_ethnicity") if v.as_py())

    # Body type
    body_types = Counter(v.as_py() for v in w_table.column("d_bodytype") if v.as_py())

    # Location
    countries = Counter(v.as_py() for v in w_table.column("d_country") if v.as_py())

    # Relationship status
    rel = Counter(v.as_py() for v in w_table.column("d_relationship") if v.as_py())

    return {
        "total_women": w_table.num_rows,
        "age": {
            "mean": round(sum(ages) / len(ages), 1) if ages else 0,
            "median": sorted(ages)[len(ages) // 2] if ages else 0,
            "min": min(ages) if ages else 0,
            "max": max(ages) if ages else 0,
            "brackets": dict(sorted(age_brackets.items())),
        },
        "orientation": dict(orientations.most_common()),
        "gender_orientation": dict(gender_orient.most_common()),
        "ethnicity_top10": dict(ethnicities.most_common(10)),
        "body_type": dict(body_types.most_common()),
        "location_top10": dict(countries.most_common(10)),
        "relationship": dict(rel.most_common()),
    }


def analyze_lifestyle(w_table):
    """Drinks, drugs, smokes, diet, religion, education, job."""
    results = {}
    for col_name, label in [
        ("d_drinks", "drinks"),
        ("d_drugs", "drugs"),
        ("d_smokes", "smokes"),
        ("d_religion_type", "religion"),
        ("d_education_type", "education"),
        ("d_job", "job"),
    ]:
        try:
            vals = Counter(v.as_py() for v in w_table.column(col_name) if v.as_py() and v.as_py() != "-")
            results[label] = dict(vals.most_common(10))
        except Exception:
            pass
    return results


def analyze_looking_for(w_table):
    """What women are looking for: gender, relationship type, age range, location."""
    # lf_want: who they want
    want = Counter(v.as_py() for v in w_table.column("lf_want") if v.as_py())

    # lf_for: what kind of relationship
    lf_for = Counter(v.as_py() for v in w_table.column("lf_for") if v.as_py())

    # Age range
    min_ages = [v.as_py() for v in w_table.column("lf_min_age") if v.as_py() is not None]
    max_ages = [v.as_py() for v in w_table.column("lf_max_age") if v.as_py() is not None]

    # Location preference
    location = Counter(v.as_py() for v in w_table.column("lf_location") if v.as_py())

    # Age range by woman's age
    age_range_by_age = defaultdict(lambda: {"min_ages": [], "max_ages": []})
    d_ages = [v.as_py() for v in w_table.column("d_age")]
    lf_mins = [v.as_py() for v in w_table.column("lf_min_age")]
    lf_maxs = [v.as_py() for v in w_table.column("lf_max_age")]

    for i in range(len(d_ages)):
        age = d_ages[i]
        lf_min = lf_mins[i]
        lf_max = lf_maxs[i]
        if age and lf_min and lf_max and 18 <= age <= 65:
            bracket = f"{(int(age) // 5) * 5}-{(int(age) // 5) * 5 + 4}"
            age_range_by_age[bracket]["min_ages"].append(lf_min)
            age_range_by_age[bracket]["max_ages"].append(lf_max)

    age_pref_by_bracket = {}
    for bracket in sorted(age_range_by_age.keys()):
        data = age_range_by_age[bracket]
        mins = data["min_ages"]
        maxs = data["max_ages"]
        if mins and maxs:
            age_pref_by_bracket[bracket] = {
                "avg_min_age": round(sum(mins) / len(mins), 1),
                "avg_max_age": round(sum(maxs) / len(maxs), 1),
                "avg_range_width": round(sum(m2 - m1 for m1, m2 in zip(mins, maxs)) / len(mins), 1),
                "count": len(mins),
            }

    return {
        "want_gender": dict(want.most_common()),
        "relationship_type": dict(lf_for.most_common()),
        "age_range": {
            "avg_min": round(sum(min_ages) / len(min_ages), 1) if min_ages else 0,
            "avg_max": round(sum(max_ages) / len(max_ages), 1) if max_ages else 0,
        },
        "age_preferences_by_age_bracket": age_pref_by_bracket,
        "location": dict(location.most_common()),
    }


def analyze_personality(w_table, m_table):
    """Personality scores: women vs men comparison."""
    p_cols = [c for c in w_table.column_names if c.startswith("p_")]

    results = {}
    for col_name in p_cols:
        w_vals = [v.as_py() for v in w_table.column(col_name) if v.as_py() is not None]
        m_vals = [v.as_py() for v in m_table.column(col_name) if v.as_py() is not None]

        if len(w_vals) > 100 and len(m_vals) > 100:
            clean_name = col_name.replace("p_", "")
            results[clean_name] = {
                "women_mean": round(sum(w_vals) / len(w_vals), 1),
                "men_mean": round(sum(m_vals) / len(m_vals), 1),
                "women_n": len(w_vals),
                "men_n": len(m_vals),
                "gap": round(sum(w_vals) / len(w_vals) - sum(m_vals) / len(m_vals), 1),
            }

    # Sort by absolute gap
    sorted_results = dict(sorted(results.items(), key=lambda x: abs(x[1]["gap"]), reverse=True))
    return sorted_results


def analyze_key_questions(w_table, m_table, questions):
    """Analyze responses to key dating/sex/relationship questions."""

    # Curated questions relevant to dating behavior
    key_question_ids = []
    sex_questions = []
    relationship_questions = []
    dating_questions = []

    for qid, qdata in questions.items():
        kw = qdata.get("keywords", "").lower()
        col_name = qid  # Already "q2", "q11" etc.
        if col_name not in w_table.column_names:
            continue

        n = qdata.get("n", 0)
        if n < 5000:
            continue  # Skip low-response questions

        if "sex" in kw or "intimacy" in kw or "bdsm" in kw:
            sex_questions.append((col_name, qid, qdata))
        elif "relationship" in kw or "dating" in kw:
            relationship_questions.append((col_name, qid, qdata))

    # Analyze top sex/intimacy questions (most responded)
    sex_questions.sort(key=lambda x: x[2]["n"], reverse=True)
    relationship_questions.sort(key=lambda x: x[2]["n"], reverse=True)

    def analyze_question_responses(col_name, qdata, w_tab, m_tab):
        """Get response distribution for women vs men."""
        w_vals = Counter(str(v.as_py()) for v in w_tab.column(col_name) if v.as_py() is not None)
        m_vals = Counter(str(v.as_py()) for v in m_tab.column(col_name) if v.as_py() is not None)

        # Map option numbers to text
        options = qdata["options"]
        w_total = sum(w_vals.values())
        m_total = sum(m_vals.values())

        w_dist = {}
        m_dist = {}
        for opt_num, count in w_vals.most_common():
            idx = int(opt_num) - 1 if opt_num.isdigit() else -1
            label = options[idx] if 0 <= idx < len(options) else f"option_{opt_num}"
            w_dist[label] = round(100 * count / w_total, 1) if w_total else 0

        for opt_num, count in m_vals.most_common():
            idx = int(opt_num) - 1 if opt_num.isdigit() else -1
            label = options[idx] if 0 <= idx < len(options) else f"option_{opt_num}"
            m_dist[label] = round(100 * count / m_total, 1) if m_total else 0

        return {
            "question": qdata["text"],
            "women_responses": w_dist,
            "men_responses": m_dist,
            "women_n": w_total,
            "men_n": m_total,
        }

    results = {"sex_intimacy": [], "relationships": []}

    for col_name, qid, qdata in sex_questions[:20]:
        try:
            r = analyze_question_responses(col_name, qdata, w_table, m_table)
            r["question_id"] = qid
            results["sex_intimacy"].append(r)
        except Exception as e:
            pass

    for col_name, qid, qdata in relationship_questions[:15]:
        try:
            r = analyze_question_responses(col_name, qdata, w_table, m_table)
            r["question_id"] = qid
            results["relationships"].append(r)
        except Exception as e:
            pass

    return results


def analyze_selectivity_by_age(w_table):
    """How age range preferences change with women's age."""
    d_ages = [v.as_py() for v in w_table.column("d_age")]
    lf_mins = [v.as_py() for v in w_table.column("lf_min_age")]
    lf_maxs = [v.as_py() for v in w_table.column("lf_max_age")]

    by_age = defaultdict(lambda: {"ranges": [], "older_ok": 0, "younger_ok": 0, "total": 0})

    for i in range(len(d_ages)):
        age = d_ages[i]
        lf_min = lf_mins[i]
        lf_max = lf_maxs[i]
        if not age or not lf_min or not lf_max or age < 18:
            continue

        bracket = f"{(int(age) // 5) * 5}-{(int(age) // 5) * 5 + 4}"
        by_age[bracket]["ranges"].append(lf_max - lf_min)
        by_age[bracket]["total"] += 1
        if lf_max > age + 5:
            by_age[bracket]["older_ok"] += 1
        if lf_min < age - 5:
            by_age[bracket]["younger_ok"] += 1

    result = {}
    for bracket in sorted(by_age.keys()):
        data = by_age[bracket]
        ranges = data["ranges"]
        if ranges:
            result[bracket] = {
                "avg_age_range_width": round(sum(ranges) / len(ranges), 1),
                "pct_open_to_much_older": round(100 * data["older_ok"] / data["total"], 1),
                "pct_open_to_much_younger": round(100 * data["younger_ok"] / data["total"], 1),
                "count": data["total"],
            }
    return result


def analyze_orientation_deep(w_table):
    """Deep dive into orientation × looking for."""
    orient_vals = [v.as_py() for v in w_table.column("d_orientation")]
    want_vals = [v.as_py() for v in w_table.column("lf_want")]
    for_vals = [v.as_py() for v in w_table.column("lf_for")]

    by_orient = defaultdict(lambda: {"want": Counter(), "for": Counter(), "count": 0})

    for i in range(len(orient_vals)):
        o = orient_vals[i]
        w = want_vals[i]
        f = for_vals[i]
        if not o:
            continue
        by_orient[o]["count"] += 1
        if w:
            by_orient[o]["want"][w] += 1
        if f:
            by_orient[o]["for"][f] += 1

    result = {}
    for orient, data in sorted(by_orient.items(), key=lambda x: x[1]["count"], reverse=True):
        result[orient] = {
            "count": data["count"],
            "pct": round(100 * data["count"] / w_table.num_rows, 1),
            "want_top3": dict(data["want"].most_common(3)),
            "looking_for_top3": dict(data["for"].most_common(3)),
        }
    return result


def analyze_cognitive_ability(w_table, m_table):
    """Cognitive ability (CA) comparison."""
    w_ca = [v.as_py() for v in w_table.column("CA") if v.as_py() is not None]
    m_ca = [v.as_py() for v in m_table.column("CA") if v.as_py() is not None]

    if not w_ca or not m_ca:
        return {"note": "CA data not available"}

    return {
        "women": {
            "mean": round(sum(w_ca) / len(w_ca), 2),
            "median": round(sorted(w_ca)[len(w_ca) // 2], 2),
            "n": len(w_ca),
        },
        "men": {
            "mean": round(sum(m_ca) / len(m_ca), 2),
            "median": round(sorted(m_ca)[len(m_ca) // 2], 2),
            "n": len(m_ca),
        },
    }


def analyze_body_ethnicity_cross(w_table):
    """Body type × ethnicity cross-analysis."""
    bodies = [v.as_py() for v in w_table.column("d_bodytype")]
    ethnicities = [v.as_py() for v in w_table.column("d_ethnicity")]
    ages = [v.as_py() for v in w_table.column("d_age")]

    # Body type by age bracket
    body_by_age = defaultdict(Counter)
    for i in range(len(ages)):
        age = ages[i]
        body = bodies[i]
        if age and body and 18 <= age <= 65:
            bracket = f"{(int(age) // 10) * 10}s"
            body_by_age[bracket][body] += 1

    result = {}
    for bracket in sorted(body_by_age.keys()):
        total = sum(body_by_age[bracket].values())
        result[bracket] = {
            bt: round(100 * c / total, 1)
            for bt, c in body_by_age[bracket].most_common(5)
        }

    return {"body_type_by_age": result}


def analyze_deal_breakers(w_table, questions):
    """Find questions where women have very strong consensus (>75% one answer)."""
    q_cols = [c for c in w_table.column_names if c.startswith("q")]

    strong_opinions = []

    for col_name in q_cols:
        # col_name is "q2", "q11" etc — same format as question dict keys
        if col_name not in questions:
            continue

        qdata = questions[col_name]
        if qdata["n"] < 10000:
            continue

        vals = Counter(str(v.as_py()) for v in w_table.column(col_name) if v.as_py() is not None)
        total = sum(vals.values())
        if total < 3000:
            continue

        # Check if one option dominates
        top_val, top_count = vals.most_common(1)[0]
        pct = 100 * top_count / total

        if pct >= 70:
            idx = int(top_val) - 1 if top_val.isdigit() else -1
            options = qdata["options"]
            label = options[idx] if 0 <= idx < len(options) else f"option_{top_val}"

            strong_opinions.append({
                "question": qdata["text"],
                "dominant_answer": label,
                "pct": round(pct, 1),
                "n": total,
                "keywords": qdata["keywords"],
            })

    # Sort by consensus strength
    strong_opinions.sort(key=lambda x: x["pct"], reverse=True)
    return strong_opinions[:30]


def analyze_gender_gaps(w_table, m_table, questions):
    """Find questions with biggest gender gap in responses."""
    q_cols = [c for c in w_table.column_names if c.startswith("q")]

    gaps = []

    for col_name in q_cols:
        # col_name is "q2", "q11" etc — same format as question dict keys
        if col_name not in questions:
            continue

        qdata = questions[col_name]
        if qdata["n"] < 10000 or len(qdata["options"]) < 2:
            continue

        w_vals = Counter(str(v.as_py()) for v in w_table.column(col_name) if v.as_py() is not None)
        m_vals = Counter(str(v.as_py()) for v in m_table.column(col_name) if v.as_py() is not None)

        w_total = sum(w_vals.values())
        m_total = sum(m_vals.values())

        if w_total < 2000 or m_total < 2000:
            continue

        # Compute max gap across options
        all_opts = set(list(w_vals.keys()) + list(m_vals.keys()))
        max_gap = 0
        gap_option = ""
        w_pct_at_gap = 0
        m_pct_at_gap = 0

        for opt in all_opts:
            w_p = 100 * w_vals.get(opt, 0) / w_total
            m_p = 100 * m_vals.get(opt, 0) / m_total
            gap = abs(w_p - m_p)
            if gap > max_gap:
                max_gap = gap
                gap_option = opt
                w_pct_at_gap = w_p
                m_pct_at_gap = m_p

        if max_gap >= 15:
            idx = int(gap_option) - 1 if gap_option.isdigit() else -1
            options = qdata["options"]
            label = options[idx] if 0 <= idx < len(options) else f"option_{gap_option}"

            gaps.append({
                "question": qdata["text"],
                "biggest_gap_option": label,
                "women_pct": round(w_pct_at_gap, 1),
                "men_pct": round(m_pct_at_gap, 1),
                "gap_pp": round(max_gap, 1),
                "keywords": qdata["keywords"],
            })

    gaps.sort(key=lambda x: x["gap_pp"], reverse=True)
    return gaps[:30]


def analyze_relationship_goals_by_age(w_table):
    """How relationship goals change with age."""
    ages = [v.as_py() for v in w_table.column("d_age")]
    lf_for = [v.as_py() for v in w_table.column("lf_for")]

    by_age = defaultdict(Counter)
    for i in range(len(ages)):
        age = ages[i]
        goal = lf_for[i]
        if age and goal and 18 <= age <= 65:
            bracket = f"{(int(age) // 5) * 5}-{(int(age) // 5) * 5 + 4}"
            by_age[bracket][goal] += 1

    result = {}
    for bracket in sorted(by_age.keys()):
        total = sum(by_age[bracket].values())
        result[bracket] = {
            g: round(100 * c / total, 1)
            for g, c in by_age[bracket].most_common(5)
        }
    return result


def print_section(title, data, indent=0):
    prefix = "  " * indent
    print(f"\n{prefix}{'=' * 60}")
    print(f"{prefix}  {title}")
    print(f"{prefix}{'=' * 60}")
    if isinstance(data, dict):
        for k, v in list(data.items())[:15]:
            if isinstance(v, dict):
                print(f"{prefix}  {k}:")
                for k2, v2 in list(v.items())[:10]:
                    print(f"{prefix}    {k2}: {v2}")
            elif isinstance(v, list):
                print(f"{prefix}  {k}: [{len(v)} items]")
                for item in v[:3]:
                    if isinstance(item, dict):
                        print(f"{prefix}    Q: {item.get('question', '')[:80]}")
                    else:
                        print(f"{prefix}    {item}")
            else:
                print(f"{prefix}  {k}: {v}")
    elif isinstance(data, list):
        for item in data[:5]:
            if isinstance(item, dict):
                for k, v in item.items():
                    val = str(v)[:100] if isinstance(v, (dict, list)) else v
                    print(f"{prefix}  {k}: {val}")
                print()


def main():
    print("=" * 60)
    print("  OkCupid Full Dataset - Women-Only Analysis")
    print("  25,952 female profiles + 2,541 questions")
    print("=" * 60)

    import pyarrow as pa

    table, cols = load_parquet()
    questions = load_questions()

    # Split by gender
    women_mask = [v.as_py() == "Woman" for v in table.column("gender")]
    men_mask = [v.as_py() == "Man" for v in table.column("gender")]

    w_table = table.filter(pa.array(women_mask))
    m_table = table.filter(pa.array(men_mask))
    print(f"\nWomen: {w_table.num_rows:,} | Men: {m_table.num_rows:,}")

    # Run analyses
    print("\n[1/11] Demographics...")
    demographics = analyze_demographics(w_table)
    print_section("DEMOGRAPHICS", demographics)

    print("\n[2/11] Lifestyle...")
    lifestyle = analyze_lifestyle(w_table)
    print_section("LIFESTYLE", lifestyle)

    print("\n[3/11] Looking for...")
    looking_for = analyze_looking_for(w_table)
    print_section("LOOKING FOR", looking_for)

    print("\n[4/11] Orientation deep dive...")
    orientation = analyze_orientation_deep(w_table)
    print_section("ORIENTATION", orientation)

    print("\n[5/11] Personality (W vs M)...")
    personality = analyze_personality(w_table, m_table)
    print_section("PERSONALITY GAPS", personality)

    print("\n[6/11] Cognitive ability...")
    cognitive = analyze_cognitive_ability(w_table, m_table)
    print_section("COGNITIVE ABILITY", cognitive)

    print("\n[7/11] Key questions (sex/relationships)...")
    key_questions = analyze_key_questions(w_table, m_table, questions)
    print_section("KEY QUESTIONS - SEX/INTIMACY", {"count": len(key_questions.get("sex_intimacy", []))})
    print_section("KEY QUESTIONS - RELATIONSHIPS", {"count": len(key_questions.get("relationships", []))})

    print("\n[8/11] Deal breakers (strong consensus)...")
    deal_breakers = analyze_deal_breakers(w_table, questions)
    print_section("DEAL BREAKERS", deal_breakers)

    print("\n[9/11] Gender gaps in questions...")
    gender_gaps = analyze_gender_gaps(w_table, m_table, questions)
    print_section("BIGGEST GENDER GAPS", gender_gaps)

    print("\n[10/11] Selectivity by age...")
    selectivity = analyze_selectivity_by_age(w_table)
    print_section("SELECTIVITY BY AGE", selectivity)

    print("\n[11/11] Relationship goals by age...")
    goals_by_age = analyze_relationship_goals_by_age(w_table)
    print_section("GOALS BY AGE", goals_by_age)

    # Body/ethnicity cross
    body_cross = analyze_body_ethnicity_cross(w_table)

    # Save report
    report = {
        "dataset": "OkCupid Full (Kirkegaard) - Women Only",
        "generated": datetime.now().isoformat(),
        "total_women": w_table.num_rows,
        "total_men": m_table.num_rows,
        "demographics": demographics,
        "lifestyle": lifestyle,
        "looking_for": looking_for,
        "orientation_deep": orientation,
        "personality_wvs_m": personality,
        "cognitive_ability": cognitive,
        "key_questions": key_questions,
        "deal_breakers_consensus": deal_breakers,
        "gender_gaps": gender_gaps,
        "selectivity_by_age": selectivity,
        "goals_by_age": goals_by_age,
        "body_ethnicity_cross": body_cross,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False, default=str)
    print(f"\nFull report saved to: {OUTPUT_PATH}")

    # Key insights
    print("\n" + "=" * 60)
    print("  KEY INSIGHTS - WOMEN ON OKCUPID")
    print("=" * 60)

    # Demographics
    print(f"\n  Total women: {w_table.num_rows:,}")
    print(f"  Average age: {demographics['age']['mean']}")
    print(f"  Orientation: {', '.join(f'{k} ({v})' for k, v in list(demographics['orientation'].items())[:3])}")

    # What they want
    lf = looking_for
    print(f"\n  Looking for: {', '.join(f'{k} ({v})' for k, v in list(lf['want_gender'].items())[:3])}")
    print(f"  Relationship type: {', '.join(f'{k} ({v})' for k, v in list(lf['relationship_type'].items())[:3])}")
    print(f"  Age range: {lf['age_range']['avg_min']:.0f} - {lf['age_range']['avg_max']:.0f}")

    # Top personality gaps
    print(f"\n  Biggest personality gaps (W vs M):")
    for trait, stats in list(personality.items())[:5]:
        direction = "W>M" if stats["gap"] > 0 else "M>W"
        print(f"    {trait}: W={stats['women_mean']} M={stats['men_mean']} ({direction} by {abs(stats['gap'])})")

    # Deal breakers
    print(f"\n  Top consensus answers (>70% agree):")
    for db in deal_breakers[:5]:
        print(f"    {db['pct']}%: {db['question'][:60]}... -> {db['dominant_answer'][:40]}")

    # Gender gaps
    print(f"\n  Biggest gender gaps:")
    for gg in gender_gaps[:5]:
        print(f"    {gg['gap_pp']}pp: {gg['question'][:60]}...")
        print(f"      W={gg['women_pct']}% vs M={gg['men_pct']}% on '{gg['biggest_gap_option'][:40]}'")

    print("\n  Analysis complete.")


if __name__ == "__main__":
    main()
