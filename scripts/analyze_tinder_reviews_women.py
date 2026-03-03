"""
Tinder Google Play Reviews — WOMEN-ONLY deep analysis
Uses multi-signal gender scoring to identify female reviewers,
then analyzes their specific experience, complaints, and temporal patterns.
"""

import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "Tinder google review" / "tinder_google_play_reviews.csv"
OUTPUT_PATH = Path(__file__).parent / "output" / "tinder_reviews_women.json"

# ============================================================
# Gender scoring: positive = likely female, negative = likely male
# ============================================================

FEMALE_STRONG = [
    # Self-identification
    (r'\bi.?m a (woman|girl|female|lady)\b', 5),
    (r'\bas a (woman|girl|female|lady)\b', 5),
    (r'\bbeing a (woman|girl|female)\b', 5),
    (r'\b(i am|i.?m) (lesbian|bi|bisexual)\b.*\b(woman|girl|female)\b', 5),
    (r'\bwomen like me\b', 5),
    (r'\b(my|i.?m a) (mom|mother|wife|girlfriend)\b', 4),
    # Relationship references (she has a boyfriend/husband)
    (r'\bmy (ex.?)?boyfriend\b', 4),
    (r'\bmy (ex.?)?husband\b', 4),
    (r'\bmet my (boyfriend|husband|fiance|partner)\b', 4),
    (r'\bfound my (boyfriend|husband|fiance)\b', 4),
    # Describing interactions with men
    (r'\bmatched with (a |this |some )?guy\b', 3),
    (r'\bthis guy i (matched|met|talked|chatted)\b', 3),
    (r'\bhe (unmatched|ghosted|sent|messaged|asked|said|told|wanted|tried)\b', 3),
    (r'\b(he|his) profile (was|is|had|looked)\b', 3),
    (r'\bhe was (nice|cute|creepy|weird|rude|sweet)\b', 3),
    # Safety concerns (predominantly female)
    (r'\bcreepy (men|guys|dudes|people)\b', 3),
    (r'\b(harass|harassment|harassing) (me|by)\b', 3),
    (r'\bdick pic\b', 4),
    (r'\bunsolicited (pic|photo|message|image)\b', 4),
    (r'\b(unsafe|scary|uncomfortable|threatening) (for women|as a woman|men|guys)\b', 3),
    (r'\bstalker\b', 2),
    (r'\bwomen.s safety\b', 4),
    # Dating from female perspective
    (r'\blooking for (a man|a boyfriend|a husband|a serious|a real)\b', 3),
    (r'\b(guys|men) (on here|on this app) (are|just|only|keep|don.t|won.t|never|always)\b', 3),
    (r'\btoo many (fake|creepy|thirsty|desperate|weird) (guys|men|dudes|profiles)\b', 3),
    (r'\b(guys|men) (swiping|liking) (right on|on) every\b', 3),
    (r'\b(ladies|girls|women),? (be careful|watch out|beware|stay safe|don.t)\b', 3),
    # Female-specific content
    (r'\b(pregnant|pregnancy)\b', 2),
    (r'\bmy (daughter|sister|niece)\b', 2),
]

MALE_STRONG = [
    # Self-identification
    (r'\bi.?m a (man|guy|male|dude|gentleman)\b', -5),
    (r'\bas a (man|guy|male|dude)\b', -5),
    (r'\bbeing a (man|guy|male)\b', -5),
    # Relationship references (he has a girlfriend/wife)
    (r'\bmy (ex.?)?girlfriend\b', -4),
    (r'\bmy (ex.?)?wife\b', -4),
    (r'\bmet my (girlfriend|wife)\b', -4),
    # Describing interactions with women
    (r'\bmatched with (a |this |some )?(girl|woman|chick|lady)\b', -3),
    (r'\b(she|her) (unmatched|ghosted|sent|messaged|said|told)\b', -3),
    (r'\b(she|her) profile (was|is|had)\b', -3),
    (r'\b(girls|women) (on here|on this app) (are|just|only|don.t|won.t|never)\b', -3),
    # Male-specific complaints
    (r'\bno match(es)?.*(male|man|guy|dude)\b', -3),
    (r'\b(zero|no|0) match(es)?\b', -2),
    (r'\bpay to (play|win|get|see|match)\b', -2),
    (r'\b(swipe|swiped|swiping) right on every\b', -2),
    (r'\bno (girls|women) (like|swipe|match)\b', -3),
    (r'\b(guys|men|we) (get|have) (no|zero|0) (likes|matches)\b', -3),
    (r'\brules? 1 and 2\b', -3),  # "rules 1 and 2" meme (be attractive)
    (r'\bif you.re (not )?attractive\b', -2),
    (r'\baverage (looking )?(man|guy|male|dude)\b', -3),
]

# Compile patterns
FEMALE_PATTERNS = [(re.compile(p, re.I), score) for p, score in FEMALE_STRONG]
MALE_PATTERNS = [(re.compile(p, re.I), score) for p, score in MALE_STRONG]

# Topics
TOPICS = {
    "safety_harassment": re.compile(r'\b(safe|safety|harass|creep|creepy|block|blocking|report|inappropriate|stalker|threatening|assault|abuse|abusive)\b', re.I),
    "bots_scams_catfish": re.compile(r'\b(bot|bots|scam|scams|fake|fakes|catfish|catfishing|spam|fraud)\b', re.I),
    "payment_paywall": re.compile(r'\b(pay|paid|money|premium|gold|plus|subscription|paywall|expensive|rip.?off|cash grab|greedy|overpriced)\b', re.I),
    "matches_quality": re.compile(r'\b(match|matches|matching|quality|low quality|no match|zero match)\b', re.I),
    "ghosting_unmatch": re.compile(r'\b(ghost|ghosted|ghosting|unmatch|unmatched|disappeared|vanish)\b', re.I),
    "messaging_chat": re.compile(r'\b(message|messages|chat|conversation|reply|respond|response|talk|talking)\b', re.I),
    "bugs_crashes": re.compile(r'\b(bug|bugs|crash|crashes|glitch|error|freeze|freezes|won.t open|not working|broken|loading)\b', re.I),
    "profile_photos_verification": re.compile(r'\b(profile|photo|photos|picture|pictures|bio|verification|verify|verified)\b', re.I),
    "deleted_banned": re.compile(r'\b(banned|ban|deleted|removed|suspended|locked out|account gone|disabled)\b', re.I),
    "algorithm_visibility": re.compile(r'\b(algorithm|elo|shadowban|shadow ban|visibility|hidden|suppressed|throttle|boost)\b', re.I),
    "relationship_success": re.compile(r'\b(found (my|a|the)|met (my|a|the)|married|engaged|relationship|together|dating|couple|love)\b', re.I),
    "location_distance": re.compile(r'\b(distance|miles|km|location|far away|another (country|state|city)|passport)\b', re.I),
    "age_preferences": re.compile(r'\b(age|older|younger|age range|age gap|too old|too young|minor|underage)\b', re.I),
}


def score_gender(content):
    """Return gender score: positive=female, negative=male, 0=unknown."""
    score = 0
    for pattern, pts in FEMALE_PATTERNS:
        if pattern.search(content):
            score += pts
    for pattern, pts in MALE_PATTERNS:
        if pattern.search(content):
            score += pts  # pts are already negative
    return score


def load_and_classify():
    """Load all reviews and classify gender."""
    female = []
    male = []
    unknown = []

    with open(DATA_PATH, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for r in reader:
            content = r.get("content", "")
            if not content or len(content) < 15:
                unknown.append(r)
                continue

            score = score_gender(content)
            r["_gender_score"] = score

            if score >= 3:
                female.append(r)
            elif score <= -3:
                male.append(r)
            else:
                unknown.append(r)

    print(f"Classified: {len(female):,} female, {len(male):,} male, {len(unknown):,} unknown")
    return female, male, unknown


def analyze_reviews(rows, label):
    """Full analysis of a review set."""
    total = len(rows)
    if total == 0:
        return {"count": 0}

    # Score distribution
    scores = Counter(r.get("score", "") for r in rows)
    score_vals = [int(r.get("score", "0") or "0") for r in rows]

    # Temporal
    hours = Counter()
    days_map = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    days = Counter()
    months = Counter()
    yearly = defaultdict(list)

    for r in rows:
        at = r.get("at", "").strip()
        sc = int(r.get("score", "0") or "0")
        if not at:
            continue
        try:
            dt = datetime.strptime(at, "%Y-%m-%d %H:%M:%S")
            hours[dt.hour] += 1
            days[days_map[dt.weekday()]] += 1
            months[dt.month] += 1
            yearly[dt.year].append(sc)
        except ValueError:
            pass

    # Topics
    topic_counts = Counter()
    topic_examples = defaultdict(list)
    for r in rows:
        content = r.get("content", "")
        for topic, pattern in TOPICS.items():
            if pattern.search(content):
                topic_counts[topic] += 1
                if len(topic_examples[topic]) < 3:
                    topic_examples[topic].append(content[:200])

    # Review length
    lengths = [len(r.get("content", "")) for r in rows if r.get("content", "")]

    # Thumbs up (community agreement)
    thumbs = [int(r.get("thumbsUpCount", "0") or "0") for r in rows]

    # Top upvoted
    top_upvoted = sorted(rows, key=lambda r: int(r.get("thumbsUpCount", "0") or "0"), reverse=True)[:15]

    return {
        "count": total,
        "avg_score": round(sum(score_vals) / total, 2),
        "score_distribution": {k: int(v) for k, v in sorted(scores.items())},
        "score_pct": {
            "1_star_pct": round(100 * scores.get("1", 0) / total, 1),
            "5_star_pct": round(100 * scores.get("5", 0) / total, 1),
        },
        "avg_review_length": round(sum(lengths) / len(lengths)) if lengths else 0,
        "avg_thumbs_up": round(sum(thumbs) / len(thumbs), 2) if thumbs else 0,
        "temporal": {
            "by_hour": {str(h): hours.get(h, 0) for h in range(24)},
            "by_day": {d: days.get(d, 0) for d in days_map},
            "by_month": {str(m): months.get(m, 0) for m in range(1, 13)},
            "score_by_year": {str(y): round(sum(s) / len(s), 2) for y, s in sorted(yearly.items()) if len(s) >= 10},
        },
        "topics": {
            topic: {
                "mentions": count,
                "pct": round(100 * count / total, 1),
            }
            for topic, count in topic_counts.most_common()
        },
        "top_upvoted": [
            {
                "score": r.get("score", ""),
                "thumbs": int(r.get("thumbsUpCount", "0") or "0"),
                "date": r.get("at", "")[:10],
                "content": r.get("content", "")[:300],
            }
            for r in top_upvoted
        ],
    }


def compare_genders(f_stats, m_stats):
    """Side-by-side comparison."""
    comparison = {
        "satisfaction": {
            "female_avg_score": f_stats["avg_score"],
            "male_avg_score": m_stats["avg_score"],
            "delta": round(f_stats["avg_score"] - m_stats["avg_score"], 2),
        },
        "1_star_rate": {
            "female": f_stats["score_pct"]["1_star_pct"],
            "male": m_stats["score_pct"]["1_star_pct"],
        },
        "5_star_rate": {
            "female": f_stats["score_pct"]["5_star_pct"],
            "male": m_stats["score_pct"]["5_star_pct"],
        },
        "review_investment": {
            "female_avg_chars": f_stats["avg_review_length"],
            "male_avg_chars": m_stats["avg_review_length"],
        },
        "community_agreement": {
            "female_avg_thumbs": f_stats["avg_thumbs_up"],
            "male_avg_thumbs": m_stats["avg_thumbs_up"],
        },
    }

    # Topic comparison
    all_topics = set(f_stats["topics"].keys()) | set(m_stats["topics"].keys())
    topic_comparison = {}
    for topic in sorted(all_topics):
        f_pct = f_stats["topics"].get(topic, {}).get("pct", 0)
        m_pct = m_stats["topics"].get(topic, {}).get("pct", 0)
        topic_comparison[topic] = {
            "female_pct": f_pct,
            "male_pct": m_pct,
            "female_over_indexed": round(f_pct - m_pct, 1),
        }
    comparison["topic_comparison"] = dict(sorted(topic_comparison.items(), key=lambda x: x[1]["female_over_indexed"], reverse=True))

    return comparison


def print_section(title, data):
    print(f"\n{'='*65}")
    print(f"  {title}")
    print(f"{'='*65}")
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, dict):
                print(f"\n  [{k}]")
                for k2, v2 in v.items():
                    if isinstance(v2, dict):
                        items = ", ".join(f"{k3}={v3}" for k3, v3 in list(v2.items())[:6])
                        print(f"    {k2}: {items}")
                    elif isinstance(v2, list):
                        print(f"    {k2}: ({len(v2)} items)")
                    else:
                        print(f"    {k2}: {v2}")
            elif isinstance(v, list):
                for item in v[:5]:
                    if isinstance(item, dict):
                        print(f"    [{item.get('score','')}] ({item.get('thumbs',0)} thumbs) {item.get('content','')[:120]}")
                    else:
                        print(f"    {item}")
            else:
                print(f"  {k}: {v}")


def main():
    print("=" * 65)
    print("  Tinder Reviews — WOMEN FOCUS")
    print("  Multi-signal gender scoring + deep female analysis")
    print("=" * 65)

    female, male, unknown = load_and_classify()

    print(f"\nAnalyzing {len(female):,} female reviews...")
    f_stats = analyze_reviews(female, "Female")

    print(f"Analyzing {len(male):,} male reviews (for comparison)...")
    m_stats = analyze_reviews(male, "Male")

    comparison = compare_genders(f_stats, m_stats)

    print_section("FEMALE REVIEWS OVERVIEW", {
        "count": f_stats["count"],
        "avg_score": f_stats["avg_score"],
        "score_distribution": f_stats["score_distribution"],
        "avg_review_length": f_stats["avg_review_length"],
        "avg_thumbs_up": f_stats["avg_thumbs_up"],
    })

    print_section("FEMALE vs MALE COMPARISON", comparison)

    print_section("FEMALE TEMPORAL PATTERNS", f_stats["temporal"])

    print_section("FEMALE TOP TOPICS", f_stats["topics"])

    print_section("FEMALE TOP UPVOTED REVIEWS", f_stats["top_upvoted"])

    # Save
    report = {
        "title": "Tinder Reviews - Women Focus Analysis",
        "generated": datetime.now().isoformat(),
        "classification": {
            "female_count": len(female),
            "male_count": len(male),
            "unknown_count": len(unknown),
            "method": "Multi-signal keyword scoring (threshold >= 3 for female, <= -3 for male)",
        },
        "female_analysis": f_stats,
        "male_analysis_comparison": m_stats,
        "gender_comparison": comparison,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False, default=str)
    print(f"\nFull report saved to: {OUTPUT_PATH}")

    # Summary
    print("\n" + "=" * 65)
    print("  SYNTHESIS — L'EXPERIENCE TINDER VUE PAR LES FEMMES")
    print("=" * 65)

    print(f"\n  Detection: {len(female):,} reviews feminines identifiees")
    print(f"  Score moyen: {f_stats['avg_score']} (vs hommes: {m_stats['avg_score']})")
    print(f"  Delta: +{comparison['satisfaction']['delta']} en faveur des femmes")

    print(f"\n  Repartition:")
    for score in ["1", "2", "3", "4", "5"]:
        fc = f_stats['score_distribution'].get(score, 0)
        mc = m_stats['score_distribution'].get(score, 0)
        fp = round(100 * fc / f_stats['count'], 1) if f_stats['count'] else 0
        mp = round(100 * mc / m_stats['count'], 1) if m_stats['count'] else 0
        print(f"    {score} etoile(s): F={fp}% vs M={mp}%")

    print(f"\n  Topics ou les femmes sont SUR-REPRESENTEES (vs hommes):")
    for topic, vals in comparison["topic_comparison"].items():
        delta = vals["female_over_indexed"]
        if delta > 2:
            print(f"    {topic}: F={vals['female_pct']}% vs M={vals['male_pct']}% (+{delta}pts)")

    print(f"\n  Topics ou les hommes sont SUR-REPRESENTES (vs femmes):")
    for topic, vals in comparison["topic_comparison"].items():
        delta = vals["female_over_indexed"]
        if delta < -2:
            print(f"    {topic}: F={vals['female_pct']}% vs M={vals['male_pct']}% ({delta}pts)")

    # Female hours
    fh = f_stats["temporal"]["by_hour"]
    top_fh = sorted(fh.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"\n  Heures de pic feminines: {', '.join(f'{h}h ({c})' for h, c in top_fh)}")

    fd = f_stats["temporal"]["by_day"]
    top_fd = sorted(fd.items(), key=lambda x: x[1], reverse=True)[:3]
    print(f"  Jours de pic feminins: {', '.join(f'{d} ({c})' for d, c in top_fd)}")

    print("\n  Analysis complete.")


if __name__ == "__main__":
    main()
