#!/usr/bin/env python3
"""
Scrape Google Play Store reviews for dating apps in France.
Extract review volume per month as a proxy for real user activity.
"""

import json
import time
import os
from datetime import datetime
from pathlib import Path
from collections import defaultdict

import numpy as np
import pandas as pd
from google_play_scraper import reviews, Sort, app

# ─── Config ───────────────────────────────────────────────────────────────
OUTPUT_DIR = Path(__file__).parent / "output_playstore"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

APPS = {
    "tinder": "com.tinder",
    "bumble": "com.bumble.app",
    "hinge": "co.hinge.app",
    "happn": "com.ftw_and_co.happn",
}

COUNTRY = "fr"
LANG = "fr"
BATCH_SIZE = 200
MAX_REVIEWS = 15000  # per app — enough for 2-5 years of history
SLEEP_BETWEEN_BATCHES = 1.5  # seconds


# ─── Step 1: Scrape reviews ──────────────────────────────────────────────
def scrape_app_reviews(app_name: str, app_id: str) -> list[dict]:
    """Scrape all available reviews for an app, paginating until exhausted."""
    cache_path = OUTPUT_DIR / f"reviews_{app_name}.json"

    # Check cache
    if cache_path.exists():
        print(f"  [CACHE] Loading {app_name} from {cache_path}")
        with open(cache_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"  [CACHE] {len(data)} reviews loaded")
        return data

    print(f"  [SCRAPE] Fetching reviews for {app_name} ({app_id})...")
    all_reviews = []
    token = None
    batch_num = 0

    while len(all_reviews) < MAX_REVIEWS:
        batch_num += 1
        try:
            result, token = reviews(
                app_id,
                lang=LANG,
                country=COUNTRY,
                sort=Sort.NEWEST,
                count=BATCH_SIZE,
                continuation_token=token,
            )
        except Exception as e:
            print(f"  [ERROR] Batch {batch_num}: {e}")
            break

        if not result:
            print(f"  [DONE] No more reviews after batch {batch_num}")
            break

        all_reviews.extend(result)

        if batch_num % 10 == 0:
            oldest = min(r["at"] for r in result) if result else "?"
            print(f"  [PROGRESS] {len(all_reviews)} reviews, oldest in batch: {oldest}")

        if token is None:
            print(f"  [DONE] No continuation token after batch {batch_num}")
            break

        time.sleep(SLEEP_BETWEEN_BATCHES)

    print(f"  [TOTAL] {len(all_reviews)} reviews for {app_name}")

    # Serialize (convert datetime to string)
    serializable = []
    for r in all_reviews:
        serializable.append({
            "date": r["at"].isoformat() if isinstance(r["at"], datetime) else str(r["at"]),
            "score": r["score"],
            "thumbsUpCount": r.get("thumbsUpCount", 0),
        })

    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(serializable, f, ensure_ascii=False)
    print(f"  [SAVED] {cache_path}")

    return serializable


# ─── Step 2: Analyze monthly patterns ────────────────────────────────────
def analyze_reviews(app_name: str, reviews_data: list[dict]) -> pd.DataFrame:
    """Aggregate reviews by month, compute volume and average score."""
    df = pd.DataFrame(reviews_data)
    df["date"] = pd.to_datetime(df["date"])
    df["year_month"] = df["date"].dt.to_period("M")
    df["month"] = df["date"].dt.month
    df["year"] = df["date"].dt.year

    # Monthly aggregation
    monthly = df.groupby("year_month").agg(
        review_count=("score", "count"),
        avg_score=("score", "mean"),
    ).reset_index()
    monthly["year_month_str"] = monthly["year_month"].astype(str)

    return df, monthly


def extract_seasonal_pattern(df: pd.DataFrame, app_name: str) -> dict:
    """Extract detrended seasonal pattern from review volume."""
    # Group by year-month
    df_temp = df.copy()
    df_temp["_year"] = df_temp["date"].dt.year
    df_temp["_month"] = df_temp["date"].dt.month
    monthly = df_temp.groupby(["_year", "_month"]).size().reset_index(name="count")
    monthly.columns = ["year", "month", "count"]

    # Need at least 2 full years
    year_counts = monthly.groupby("year")["month"].count()
    full_years = year_counts[year_counts >= 10].index.tolist()

    if len(full_years) < 2:
        print(f"  [WARN] {app_name}: only {len(full_years)} full years, pattern may be unreliable")

    # Compute yearly totals for normalization (detrending)
    yearly_total = monthly.groupby("year")["count"].sum()

    # Normalize each month by its year's total (removes growth/decline trend)
    monthly["year_total"] = monthly["year"].map(yearly_total)
    monthly["normalized"] = monthly["count"] / monthly["year_total"] * 1200  # scale to ~100

    # Average normalized value per month across years
    seasonal = monthly.groupby("month")["normalized"].mean()

    # Rescale to 0-100
    min_val = seasonal.min()
    max_val = seasonal.max()
    if max_val > min_val:
        seasonal_normalized = ((seasonal - min_val) / (max_val - min_val) * 100).round(1)
    else:
        seasonal_normalized = pd.Series([50] * 12, index=range(1, 13))

    return seasonal_normalized.to_dict()


# ─── Step 3: Compare with our model ──────────────────────────────────────
CURRENT_MODEL = {
    1: 100, 2: 90, 3: 75, 4: 70, 5: 65,
    6: 60, 7: 60, 8: 50, 9: 75, 10: 80, 11: 85, 12: 65,
}

MONTH_NAMES = {
    1: "Jan", 2: "Fev", 3: "Mar", 4: "Avr", 5: "Mai", 6: "Jun",
    7: "Jul", 8: "Aou", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
}


# ─── Main ─────────────────────────────────────────────────────────────────
def main():
    print("=" * 70)
    print("Play Store Review Analysis — Dating Apps France")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 70)

    all_patterns = {}
    all_monthly = {}

    for app_name, app_id in APPS.items():
        print(f"\n--- {app_name.upper()} ({app_id}) ---")
        reviews_data = scrape_app_reviews(app_name, app_id)

        if not reviews_data:
            print(f"  [SKIP] No reviews for {app_name}")
            continue

        df, monthly = analyze_reviews(app_name, reviews_data)
        pattern = extract_seasonal_pattern(df, app_name)
        all_patterns[app_name] = pattern
        all_monthly[app_name] = monthly

        # Date range
        dates = pd.to_datetime([r["date"] for r in reviews_data])
        print(f"  Date range: {dates.min().strftime('%Y-%m')} to {dates.max().strftime('%Y-%m')}")
        print(f"  Total reviews: {len(reviews_data)}")

    # ─── Summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("SEASONAL PATTERNS (detrended, normalized 0-100)")
    print("=" * 70)
    print(f"\n{'Mois':<6}", end="")
    for app_name in APPS:
        if app_name in all_patterns:
            print(f"{app_name:>10}", end="")
    print(f"{'MOYENNE':>10}{'MODELE':>10}{'DELTA':>10}")
    print("-" * 76)

    avg_pattern = {}
    for month in range(1, 13):
        vals = [all_patterns[a].get(month, 0) for a in APPS if a in all_patterns]
        avg_val = np.mean(vals) if vals else 0
        avg_pattern[month] = round(avg_val, 1)
        model_val = CURRENT_MODEL[month]
        delta = round(avg_val - model_val, 1)

        print(f"{MONTH_NAMES[month]:<6}", end="")
        for app_name in APPS:
            if app_name in all_patterns:
                v = all_patterns[app_name].get(month, 0)
                print(f"{v:>10.1f}", end="")
        print(f"{avg_val:>10.1f}{model_val:>10}{delta:>+10.1f}")

    # Peak months
    print("\n" + "-" * 76)
    print("PIC SAISONNIER PAR APP:")
    for app_name in APPS:
        if app_name in all_patterns:
            p = all_patterns[app_name]
            peak_month = max(p, key=p.get)
            print(f"  {app_name:<10} -> {MONTH_NAMES[peak_month]} (score: {p[peak_month]:.0f})")

    avg_peak = max(avg_pattern, key=avg_pattern.get)
    print(f"  {'MOYENNE':<10} -> {MONTH_NAMES[avg_peak]} (score: {avg_pattern[avg_peak]:.0f})")

    # Monthly review volume (raw)
    print("\n" + "=" * 70)
    print("RAW MONTHLY REVIEW VOLUME (absolute numbers)")
    print("=" * 70)
    for app_name in APPS:
        if app_name in all_monthly:
            m = all_monthly[app_name]
            print(f"\n  {app_name.upper()}:")
            for _, row in m.iterrows():
                bar = "#" * int(row["review_count"] / 5)
                print(f"    {row['year_month_str']}: {int(row['review_count']):>5} reviews  "
                      f"(avg score: {row['avg_score']:.1f})  {bar}")

    # Save report
    report = {
        "generated": datetime.now().isoformat(),
        "patterns": all_patterns,
        "average_pattern": avg_pattern,
        "current_model": CURRENT_MODEL,
    }
    report_path = OUTPUT_DIR / "playstore_analysis.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n[SAVED] {report_path}")

    print("\n" + "=" * 70)
    print("DONE")
    print("=" * 70)


if __name__ == "__main__":
    main()
