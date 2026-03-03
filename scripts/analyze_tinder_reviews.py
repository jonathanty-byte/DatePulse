"""
Tinder Google Play Reviews Analysis
687K reviews — focus on temporal patterns, sentiment, and female-relevant insights.
"""

import csv
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "Tinder google review" / "tinder_google_play_reviews.csv"
OUTPUT_PATH = Path(__file__).parent / "output" / "tinder_reviews_analysis.json"

# Keywords suggesting female author (heuristic — not perfect)
FEMALE_KEYWORDS = re.compile(
    r'\b(my boyfriend|my husband|as a woman|as a girl|as a female|'
    r'creepy men|creepy guys|guys who|men who|'
    r'i.m a (woman|girl|lady|female)|'
    r'harassment|harassing|dick pic|unsolicited|'
    r'matches with (guys|men|boys)|'
    r'women.s safety|women like me|'
    r'my (ex.?)?girlfriend said)\b',
    re.IGNORECASE
)

MALE_KEYWORDS = re.compile(
    r'\b(my girlfriend|my wife|as a (man|guy|male|dude)|'
    r'i.m a (man|guy|male|dude)|'
    r'matches with (girls|women|ladies)|'
    r'girls who|women who|no matches|zero matches|'
    r'pay to play|pay to win|swipe right on everyone)\b',
    re.IGNORECASE
)

# Topic detection
TOPICS = {
    "bots_scams": re.compile(r'\b(bot|bots|scam|scams|fake|fakes|catfish|spam)\b', re.I),
    "payment_paywall": re.compile(r'\b(pay|paid|money|premium|gold|plus|subscription|paywall|expensive|rip.?off|cash grab|greedy)\b', re.I),
    "matches": re.compile(r'\b(match|matches|matching|no match|zero match|never match|shadow.?ban)\b', re.I),
    "bugs_crashes": re.compile(r'\b(bug|bugs|crash|crashes|glitch|error|freeze|freezes|won.t open|not working|broken)\b', re.I),
    "safety_harassment": re.compile(r'\b(safe|safety|harass|creep|creepy|block|blocking|report|inappropriate|stalker|threatening)\b', re.I),
    "algorithm": re.compile(r'\b(algorithm|elo|shadowban|shadow ban|visibility|hidden|suppressed|throttle)\b', re.I),
    "likes_swipes": re.compile(r'\b(swipe|swipes|like|likes|super like|right swipe|left swipe|daily limit)\b', re.I),
    "profile_photos": re.compile(r'\b(profile|photo|photos|picture|pictures|bio|verification|verify)\b', re.I),
    "messaging": re.compile(r'\b(message|messages|chat|conversation|reply|respond|unmatch)\b', re.I),
    "deleted_banned": re.compile(r'\b(banned|ban|deleted|removed|suspended|locked out|account gone)\b', re.I),
}


def load_data():
    rows = []
    with open(DATA_PATH, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)
    print(f"Loaded {len(rows):,} Tinder reviews")
    return rows


def analyze_overview(rows):
    """Basic stats."""
    scores = Counter(r.get("score", "") for r in rows if r.get("score", "").strip())
    thumbs = [int(r.get("thumbsUpCount", "0") or "0") for r in rows]

    # Date range
    dates = []
    for r in rows:
        at = r.get("at", "").strip()
        if at:
            try:
                dates.append(datetime.strptime(at[:10], "%Y-%m-%d"))
            except ValueError:
                pass

    versions = Counter(r.get("reviewCreatedVersion", "") for r in rows if r.get("reviewCreatedVersion", "").strip())

    # Has reply from Tinder
    has_reply = sum(1 for r in rows if r.get("replyContent", "").strip())

    return {
        "total_reviews": len(rows),
        "score_distribution": {k: int(v) for k, v in sorted(scores.items())},
        "avg_score": round(sum(int(r.get("score", "0") or "0") for r in rows) / len(rows), 2) if rows else 0,
        "date_range": f"{min(dates).strftime('%Y-%m-%d')} to {max(dates).strftime('%Y-%m-%d')}" if dates else "",
        "thumbs_up_mean": round(sum(thumbs) / len(thumbs), 2) if thumbs else 0,
        "tinder_reply_pct": round(100 * has_reply / len(rows), 1),
        "top_versions": dict(versions.most_common(10)),
    }


def analyze_temporal(rows):
    """Review patterns by hour, day, month, year."""
    hours = Counter()
    days_map = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    days = Counter()
    months = Counter()
    years = Counter()
    score_by_year = defaultdict(list)
    score_by_month = defaultdict(list)

    for r in rows:
        at = r.get("at", "").strip()
        score = int(r.get("score", "0") or "0")
        if not at:
            continue
        try:
            dt = datetime.strptime(at, "%Y-%m-%d %H:%M:%S")
            hours[dt.hour] += 1
            days[days_map[dt.weekday()]] += 1
            months[dt.month] += 1
            years[dt.year] += 1
            score_by_year[dt.year].append(score)
            score_by_month[dt.month].append(score)
        except ValueError:
            pass

    return {
        "by_hour": {str(h): hours.get(h, 0) for h in range(24)},
        "by_day": {d: days.get(d, 0) for d in days_map},
        "by_month": {str(m): months.get(m, 0) for m in range(1, 13)},
        "by_year": dict(sorted(years.items())),
        "avg_score_by_year": {str(y): round(sum(s) / len(s), 2) for y, s in sorted(score_by_year.items()) if s},
        "avg_score_by_month": {str(m): round(sum(s) / len(s), 2) for m, s in sorted(score_by_month.items()) if s},
    }


def analyze_sentiment_score(rows):
    """Score distribution and content length analysis."""
    by_score = defaultdict(list)
    for r in rows:
        score = r.get("score", "").strip()
        content = r.get("content", "")
        if score and content:
            by_score[score].append(len(content))

    result = {}
    for score in sorted(by_score.keys()):
        lengths = by_score[score]
        result[f"score_{score}"] = {
            "count": len(lengths),
            "avg_review_length": round(sum(lengths) / len(lengths)) if lengths else 0,
        }
    return result


def analyze_topics(rows):
    """What do people complain/praise about?"""
    topic_counts = Counter()
    topic_by_score = defaultdict(lambda: defaultdict(int))

    for r in rows:
        content = r.get("content", "")
        score = r.get("score", "").strip()
        if not content:
            continue
        for topic, pattern in TOPICS.items():
            if pattern.search(content):
                topic_counts[topic] += 1
                if score:
                    topic_by_score[topic][score] += 1

    # Avg score per topic
    topic_stats = {}
    for topic, count in topic_counts.most_common():
        scores = topic_by_score[topic]
        total_score = sum(int(s) * c for s, c in scores.items())
        total_count = sum(scores.values())
        topic_stats[topic] = {
            "mentions": count,
            "pct_of_reviews": round(100 * count / len(rows), 1),
            "avg_score": round(total_score / total_count, 2) if total_count else 0,
        }
    return topic_stats


def analyze_gender_signal(rows):
    """Detect likely female vs male reviews (heuristic)."""
    female_reviews = []
    male_reviews = []
    neutral = 0

    for r in rows:
        content = r.get("content", "")
        if not content:
            continue
        is_f = bool(FEMALE_KEYWORDS.search(content))
        is_m = bool(MALE_KEYWORDS.search(content))
        if is_f and not is_m:
            female_reviews.append(r)
        elif is_m and not is_f:
            male_reviews.append(r)
        else:
            neutral += 1

    def stats(revs):
        if not revs:
            return {}
        scores = [int(r.get("score", "0") or "0") for r in revs]
        # Top topics
        topic_counts = Counter()
        for r in revs:
            content = r.get("content", "")
            for topic, pattern in TOPICS.items():
                if pattern.search(content):
                    topic_counts[topic] += 1
        return {
            "count": len(revs),
            "avg_score": round(sum(scores) / len(scores), 2),
            "score_dist": dict(Counter(str(s) for s in scores).most_common()),
            "top_topics": dict(topic_counts.most_common(5)),
        }

    return {
        "detected_female": stats(female_reviews),
        "detected_male": stats(male_reviews),
        "undetected": neutral,
        "detection_note": "Heuristic keyword-based, ~10-15% of reviews classifiable",
    }


def analyze_score_evolution(rows):
    """Monthly average score evolution (recent trends)."""
    monthly = defaultdict(list)
    for r in rows:
        at = r.get("at", "").strip()
        score = int(r.get("score", "0") or "0")
        if not at:
            continue
        try:
            dt = datetime.strptime(at[:7], "%Y-%m")
            monthly[at[:7]].append(score)
        except ValueError:
            pass

    # Last 24 months
    sorted_months = sorted(monthly.keys(), reverse=True)[:24]
    return {m: {"count": len(monthly[m]), "avg": round(sum(monthly[m]) / len(monthly[m]), 2)} for m in reversed(sorted_months)}


def analyze_review_length(rows):
    """Review length patterns."""
    lengths = []
    by_score = defaultdict(list)
    for r in rows:
        content = r.get("content", "")
        score = r.get("score", "").strip()
        if content:
            l = len(content)
            lengths.append(l)
            if score:
                by_score[score].append(l)

    return {
        "overall_avg_chars": round(sum(lengths) / len(lengths)) if lengths else 0,
        "by_score": {
            s: round(sum(ls) / len(ls))
            for s, ls in sorted(by_score.items())
            if ls
        },
    }


def analyze_top_reviews(rows):
    """Most upvoted reviews."""
    with_thumbs = [(r, int(r.get("thumbsUpCount", "0") or "0")) for r in rows]
    with_thumbs.sort(key=lambda x: x[1], reverse=True)

    top = []
    for r, thumbs in with_thumbs[:10]:
        content = r.get("content", "")[:200]
        top.append({
            "score": r.get("score", ""),
            "thumbs": thumbs,
            "date": r.get("at", "")[:10],
            "preview": content,
        })
    return top


def print_section(title, data):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, dict):
                print(f"  {k}:")
                for k2, v2 in v.items():
                    print(f"    {k2}: {v2}")
            elif isinstance(v, list):
                for item in v[:5]:
                    print(f"    {item}")
            else:
                print(f"  {k}: {v}")
    elif isinstance(data, list):
        for item in data[:10]:
            print(f"  {item}")


def main():
    print("=" * 60)
    print("  Tinder Google Play Reviews Analysis")
    print("  687K reviews — temporal + sentiment + gender focus")
    print("=" * 60)

    rows = load_data()

    overview = analyze_overview(rows)
    temporal = analyze_temporal(rows)
    sentiment = analyze_sentiment_score(rows)
    topics = analyze_topics(rows)
    gender = analyze_gender_signal(rows)
    evolution = analyze_score_evolution(rows)
    review_length = analyze_review_length(rows)
    top_reviews = analyze_top_reviews(rows)

    print_section("OVERVIEW", overview)
    print_section("TEMPORAL PATTERNS", temporal)
    print_section("SCORE DISTRIBUTION & LENGTH", sentiment)
    print_section("TOPICS MENTIONED", topics)
    print_section("GENDER SIGNAL (heuristic)", gender)
    print_section("SCORE EVOLUTION (last 24 months)", evolution)
    print_section("REVIEW LENGTH", review_length)

    report = {
        "dataset": "Tinder Google Play Reviews (687K)",
        "generated": datetime.now().isoformat(),
        "overview": overview,
        "temporal": temporal,
        "sentiment": sentiment,
        "topics": topics,
        "gender_signal": gender,
        "score_evolution": evolution,
        "review_length": review_length,
        "top_reviews": top_reviews,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False, default=str)
    print(f"\nFull report saved to: {OUTPUT_PATH}")

    # Key insights
    print("\n" + "=" * 60)
    print("  KEY INSIGHTS FOR DATEPULSE")
    print("=" * 60)

    # Peak review hours
    h = temporal["by_hour"]
    top_h = sorted(h.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"\n  Peak review hours: {', '.join(f'{hr}h ({c:,})' for hr, c in top_h)}")

    d = temporal["by_day"]
    top_d = sorted(d.items(), key=lambda x: x[1], reverse=True)[:3]
    print(f"  Peak review days: {', '.join(f'{day} ({c:,})' for day, c in top_d)}")

    # Score trend
    print(f"\n  Average score: {overview['avg_score']}")
    recent = list(evolution.items())[-6:]
    for m, s in recent:
        print(f"    {m}: {s['avg']} ({s['count']:,} reviews)")

    # Gender
    gf = gender.get("detected_female", {})
    gm = gender.get("detected_male", {})
    if gf and gm:
        print(f"\n  Female-detected reviews: {gf.get('count', 0):,} (avg score: {gf.get('avg_score', 0)})")
        print(f"  Male-detected reviews: {gm.get('count', 0):,} (avg score: {gm.get('avg_score', 0)})")

    # Top complaints
    print(f"\n  Top complaint topics:")
    for topic, stats in list(topics.items())[:5]:
        print(f"    {topic}: {stats['mentions']:,} ({stats['pct_of_reviews']}%) avg score {stats['avg_score']}")

    print("\n  Analysis complete.")


if __name__ == "__main__":
    main()
