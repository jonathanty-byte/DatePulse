"""
Google Trends live modifier for DatePulse.

Fetches 90-day daily data for 3 proxy terms (correlated r=0.93 with Tinder
APP_MONTHLY), computes a trend_modifier that adjusts the real-time score.

Usage:
    python scripts/trends_live.py            # Fetch + write trends.json
    python scripts/trends_live.py --dry-run  # Print results without writing

Schedule via Task Scheduler (Windows) every 2h.
Output: frontend/public/trends.json
"""

import io
import json
import sys
import time
import random
import argparse
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

# Fix Windows console encoding for emoji/unicode
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

PARIS_TZ = ZoneInfo("Europe/Paris")
OUTPUT_PATH = Path(__file__).parent.parent / "frontend" / "public" / "trends.json"
LOG_PATH = Path(__file__).parent / "trends_live.log"

# ── Proxy terms for live trend tracking ──
# The original correlated triple (r=0.93) used niche terms like "coco site de
# rencontre" and "tinder gold", but these have near-zero volume on a 3-month
# window, making them unreliable for live tracking. Instead we use higher-volume
# terms that individually correlate well with Tinder seasonality:
#   - "serie" (r=0.71 solo, dominant term in the r=0.93 triple)
#   - "site de rencontre" (r=0.59 solo, stable high-volume dating proxy)
#   - "rencontre" (r=0.49 solo, broad dating signal)
# Fetched individually to preserve each term's seasonal profile.
TERMS = [
    {"keyword": "serie",              "weight": 0.50},
    {"keyword": "site de rencontre",  "weight": 0.30},
    {"keyword": "rencontre",          "weight": 0.20},
]

# Tinder APP_MONTHLY baseline (mirrored from scoring_engine.py / data.ts)
# Index 0=Jan, 1=Feb, ..., 11=Dec
APP_MONTHLY_TINDER = {
    0: 100, 1: 74, 2: 68, 3: 65, 4: 86, 5: 72,
    6: 89,  7: 82, 8: 75, 9: 83, 10: 78, 11: 60,
}

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

# Safety clamps
MIN_MODIFIER = 0.70
MAX_MODIFIER = 1.40
MIN_DAYS_CURRENT_MONTH = 7


def log(msg: str):
    """Append a timestamped line to the log file and print to stdout."""
    ts = datetime.now(PARIS_TZ).strftime("%Y-%m-%d %H:%M:%S")
    line = f"{ts} {msg}"
    print(line)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def fetch_trends_individual(keywords: list[str], retries: int = 3) -> dict:
    """
    Fetch 90-day daily Google Trends data for each keyword INDIVIDUALLY.

    Each term is fetched in its own request to avoid volume normalization issues
    (e.g., 'serie' at volume 70 would crush 'tinder gold' at volume 2 to zero
    if fetched together). Each term's monthly profile is self-normalized (0-100).

    Returns {keyword: {month_index: avg_value}} or empty dict on failure.
    """
    try:
        from pytrends.request import TrendReq
    except ImportError:
        log("[ERROR] pytrends not installed. Run: pip install pytrends")
        return {}

    pytrends = TrendReq(hl="fr-FR", tz=-60)  # Paris = UTC+1
    result = {}

    for kw in keywords:
        fetched = False
        for attempt in range(retries):
            try:
                pytrends.build_payload([kw], timeframe="today 3-m", geo="FR")
                df = pytrends.interest_over_time()

                if df.empty:
                    log(f"    [WARN] '{kw}' empty response (attempt {attempt + 1}/{retries})")
                    time.sleep(20 * (attempt + 1))
                    continue

                # Drop the isPartial column if present
                if "isPartial" in df.columns:
                    df = df.drop(columns=["isPartial"])

                if kw in df.columns:
                    monthly = df[kw].groupby(df.index.month).mean()
                    result[kw] = {int(m): float(v) for m, v in monthly.items()}
                    log(f"    {kw}: {result[kw]}")
                    fetched = True
                    break

            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "Too Many" in err_str:
                    wait = 60 * (attempt + 1) + random.randint(0, 15)
                    log(f"    [429] '{kw}' rate limited. Waiting {wait}s (attempt {attempt + 1}/{retries})")
                    time.sleep(wait)
                else:
                    log(f"    [ERROR] '{kw}': {err_str} (attempt {attempt + 1}/{retries})")
                    time.sleep(15 * (attempt + 1))

        if not fetched:
            log(f"    [FAILED] '{kw}' — all retries exhausted")

        # Delay between terms to avoid rate limits
        if kw != keywords[-1]:
            delay = 8 + random.randint(0, 5)
            time.sleep(delay)

    return result


def compute_modifier(monthly_data: dict, now: datetime) -> dict:
    """
    Compare Google Trends monthly profile to our static APP_MONTHLY prediction.

    Algorithm:
    1. For each term, self-normalize its monthly profile (peak=100)
    2. Compute weighted combined signal per month from normalized profiles
    3. Normalize the combined signal (peak=100)
    4. Compare the SHAPE: for each month in the window, compute ratio vs model
    5. The modifier for the current month = combined_normalized[current] / model[current]
       This captures "is this month relatively stronger/weaker than expected"

    Key insight: we compare SHAPES not absolute values. Both curves are normalized
    to 100 at their peak, so a ratio of 1.0 means the month is exactly as expected.

    Returns full result dict for trends.json.
    """
    current_month = now.month  # 1-12
    current_day = now.day

    # Build the combined weighted signal per month
    active_terms = []
    total_weight = 0.0

    for term in TERMS:
        kw = term["keyword"]
        if kw in monthly_data and monthly_data[kw]:
            # Check that the term has at least some non-zero values
            if any(v > 0 for v in monthly_data[kw].values()):
                active_terms.append({**term})
                total_weight += term["weight"]

    if not active_terms:
        return _fallback_result("no_data")

    # Renormalize weights if some terms are missing
    for term in active_terms:
        term["_norm_weight"] = term["weight"] / total_weight

    # Step 1: Self-normalize each term's monthly profile (peak=100)
    normalized_terms = {}
    for term in active_terms:
        kw = term["keyword"]
        raw = monthly_data[kw]
        peak = max(raw.values())
        if peak > 0:
            normalized_terms[kw] = {m: v / peak * 100 for m, v in raw.items()}
        else:
            normalized_terms[kw] = {m: 0.0 for m in raw}

    # Step 2: Weighted combination of normalized profiles
    all_months = set()
    for kw in normalized_terms:
        all_months.update(normalized_terms[kw].keys())

    combined = {}
    for m in sorted(all_months):
        val = 0.0
        for term in active_terms:
            kw = term["keyword"]
            if m in normalized_terms[kw]:
                val += term["_norm_weight"] * normalized_terms[kw][m]
        combined[m] = val

    if not combined:
        return _fallback_result("no_months")

    # Step 3: Normalize combined signal (peak=100)
    peak = max(combined.values())
    if peak <= 0:
        return _fallback_result("zero_peak")

    normalized = {m: round(v / peak * 100, 1) for m, v in combined.items()}

    # Determine which month to use for comparison
    use_month = current_month
    if current_day < MIN_DAYS_CURRENT_MONTH and current_month > 1:
        # Not enough data for current month, use previous
        use_month = current_month - 1 if current_month > 1 else 12

    # Get GT value for the target month
    gt_value = normalized.get(use_month)
    if gt_value is None:
        # Try current month if previous wasn't available
        gt_value = normalized.get(current_month)
    if gt_value is None:
        return _fallback_result("month_missing")

    # Get model prediction for the same month (0-indexed)
    model_value = APP_MONTHLY_TINDER.get(use_month - 1, 78)  # 78 = average fallback

    if model_value <= 0:
        return _fallback_result("model_zero")

    # Step 4: Compute the modifier using RELATIVE deviation
    # We compare how each month deviates from the window average, not absolute values.
    # This solves the "variance compression" problem: a 3-month window has less
    # spread than a full year, so direct ratios are misleading.
    #
    # Formula: modifier = 1 + (gt_deviation - model_deviation)
    # Where deviation = (month_value / window_average) - 1
    #
    # Example: If GT says Feb is 5% below its window avg, and our model says
    # Feb should be 10% below its window avg, then modifier = 1 + (-0.05 - (-0.10)) = 1.05
    # → "Feb is 5% better than expected"

    # GT: deviation of current month from window average
    gt_avg = sum(normalized.values()) / len(normalized)
    gt_deviation = (gt_value / gt_avg - 1) if gt_avg > 0 else 0

    # Model: deviation of current month from same window months' average
    window_months_0indexed = [m - 1 for m in normalized.keys()]  # convert 1-based to 0-based
    model_values = [APP_MONTHLY_TINDER.get(m, 78) for m in window_months_0indexed]
    model_avg = sum(model_values) / len(model_values) if model_values else 78
    model_deviation = (model_value / model_avg - 1) if model_avg > 0 else 0

    # The modifier captures the DIFFERENCE in deviation
    raw_ratio = 1 + (gt_deviation - model_deviation)
    trend_modifier = max(MIN_MODIFIER, min(MAX_MODIFIER, round(raw_ratio, 4)))
    trend_pct = round((trend_modifier - 1) * 100)

    # Direction
    if trend_pct > 2:
        direction = "up"
    elif trend_pct < -2:
        direction = "down"
    else:
        direction = "neutral"

    # Confidence based on number of active terms
    n_ok = len(active_terms)
    confidence = "high" if n_ok == 3 else "medium" if n_ok == 2 else "low"

    # Terms status
    terms_status = {}
    for term in TERMS:
        kw = term["keyword"]
        terms_status[kw] = "ok" if kw in monthly_data and monthly_data[kw] else "failed"

    return {
        "trend_modifier": trend_modifier,
        "trend_pct": trend_pct,
        "direction": direction,
        "confidence": confidence,
        "current_month": MONTH_NAMES[current_month - 1],
        "current_month_index": current_month - 1,
        "comparison_month": use_month,
        "n_terms_ok": n_ok,
        "terms_status": terms_status,
        "source": "google_trends_3m",
        "updated": now.isoformat(),
        "debug": {
            "gt_normalized": {MONTH_NAMES[m - 1]: v for m, v in normalized.items()},
            "gt_value": gt_value,
            "gt_avg": round(gt_avg, 1),
            "gt_deviation": round(gt_deviation, 4),
            "model_value": model_value,
            "model_avg": round(model_avg, 1),
            "model_deviation": round(model_deviation, 4),
            "raw_ratio": round(raw_ratio, 4),
        },
    }


def _fallback_result(reason: str) -> dict:
    """Return a neutral modifier when computation fails."""
    return {
        "trend_modifier": 1.0,
        "trend_pct": 0,
        "direction": "neutral",
        "confidence": "none",
        "current_month": "",
        "current_month_index": -1,
        "comparison_month": -1,
        "n_terms_ok": 0,
        "terms_status": {t["keyword"]: "failed" for t in TERMS},
        "source": f"fallback_{reason}",
        "updated": datetime.now(PARIS_TZ).isoformat(),
        "debug": {},
    }


def main():
    parser = argparse.ArgumentParser(description="DatePulse Google Trends live modifier")
    parser.add_argument("--dry-run", action="store_true", help="Print without writing")
    args = parser.parse_args()

    log("=" * 60)
    log("TRENDS LIVE — Fetching Google Trends data")
    log("=" * 60)

    now = datetime.now(PARIS_TZ)
    log(f"  Current time (Paris): {now.strftime('%Y-%m-%d %H:%M')}")
    log(f"  Current month: {MONTH_NAMES[now.month - 1]} (day {now.day})")

    # Fetch each term individually (avoids volume normalization issues)
    keywords = [t["keyword"] for t in TERMS]
    log(f"  Fetching individually: {keywords}")

    monthly_data = fetch_trends_individual(keywords)

    if not monthly_data:
        log("  [ERROR] All fetches failed")

    # Compute the trend modifier
    result = compute_modifier(monthly_data, now)

    log(f"\n  trend_modifier = {result['trend_modifier']}")
    log(f"  trend_pct      = {result['trend_pct']}%")
    log(f"  direction       = {result['direction']}")
    log(f"  confidence      = {result['confidence']}")
    log(f"  source          = {result['source']}")

    if args.dry_run:
        log("\n  [DRY RUN] Would write:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        try:
            OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
            OUTPUT_PATH.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
            log(f"\n  [OK] Written to {OUTPUT_PATH}")
        except Exception as e:
            log(f"\n  [ERROR] Failed to write: {e}")
            # Don't overwrite existing file on error
            if not OUTPUT_PATH.exists():
                fallback = _fallback_result("write_error")
                OUTPUT_PATH.write_text(json.dumps(fallback, indent=2), encoding="utf-8")
                log(f"  [FALLBACK] Wrote neutral modifier to {OUTPUT_PATH}")

    status = "OK" if result["confidence"] != "none" else "ERROR"
    log(f"\n[{status}] trend_modifier={result['trend_modifier']} "
        f"({result['n_terms_ok']}/3 terms, {result['confidence']} confidence)")


if __name__ == "__main__":
    main()
