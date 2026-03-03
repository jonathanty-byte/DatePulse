#!/usr/bin/env python3
"""
Estimate the "Likes You" bias in Jonathan's Tinder RGPD data.

Tinder doesn't distinguish organic matches (mutual right-swipe during swiping)
from "Likes You" matches (swiping right on someone who already liked you, shown
in the Likes You queue or occasionally surfaced in the regular deck).

This script uses statistical methods to estimate how many matches come from
each source and compute a corrected organic match rate.

Key insight: On days with very few outgoing likes but multiple matches, those
matches are almost certainly from the "Likes You" queue, because the probability
of organic matches on so few swipes is extremely low.
"""

import json
import sys
from datetime import datetime
from collections import defaultdict
from math import comb, exp, log, factorial
import statistics

DATA_PATH = "C:/Users/jonat/Downloads/myData/data.json"

# ============================================================
# Load and align daily data
# ============================================================

def load_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    usage = raw["Usage"]

    # Collect all dates across all metrics
    all_dates = set()
    metrics = ["app_opens", "swipes_likes", "swipes_passes", "matches",
               "messages_sent", "messages_received", "superlikes"]
    for m in metrics:
        all_dates.update(usage[m].keys())

    days = []
    for d in sorted(all_dates):
        days.append({
            "date": d,
            "weekday": datetime.strptime(d, "%Y-%m-%d").strftime("%A"),
            "weekday_num": datetime.strptime(d, "%Y-%m-%d").weekday(),  # 0=Mon
            "app_opens": usage["app_opens"].get(d, 0),
            "likes": usage["swipes_likes"].get(d, 0),
            "passes": usage["swipes_passes"].get(d, 0),
            "matches": usage["matches"].get(d, 0),
            "messages_sent": usage["messages_sent"].get(d, 0),
            "messages_received": usage["messages_received"].get(d, 0),
            "superlikes": usage["superlikes"].get(d, 0),
        })

    return days


# ============================================================
# Method 1: Anomaly Detection (days with impossible match rates)
# ============================================================

def method_anomaly_detection(days):
    """
    Flag days where the match rate is statistically impossible from organic swiping.

    If the organic match rate is ~0.5-1%, getting 1+ match on 0-5 likes is very unlikely
    organically. These matches are almost certainly from "Likes You".
    """
    print("=" * 72)
    print("METHOD 1: ANOMALY DETECTION (Impossible Match Rate Days)")
    print("=" * 72)

    # First, estimate a rough organic rate from high-volume days
    # (where Likes You matches are diluted and negligible)
    high_vol_likes = 0
    high_vol_matches = 0
    for d in days:
        if d["likes"] >= 50:
            high_vol_likes += d["likes"]
            high_vol_matches += d["matches"]

    # This is still contaminated by Likes You but gives an upper bound
    contaminated_rate = high_vol_matches / high_vol_likes if high_vol_likes > 0 else 0.01
    print(f"\nHigh-volume days (>=50 likes): {high_vol_likes} likes, {high_vol_matches} matches")
    print(f"  Contaminated match rate (upper bound): {contaminated_rate:.2%}")

    # Now scan for anomalous days
    # Use binomial probability: P(>=k matches | n likes, rate p)
    anomalous_matches = 0
    anomalous_days = []
    total_matches = sum(d["matches"] for d in days)

    for d in days:
        n = d["likes"]
        k = d["matches"]
        if k == 0:
            continue

        if n == 0:
            # Matches with ZERO likes = 100% Likes You
            anomalous_matches += k
            anomalous_days.append(d)
            continue

        # P(X >= k) where X ~ Binomial(n, contaminated_rate)
        # Using contaminated rate (generous) to be CONSERVATIVE
        p_organic = contaminated_rate
        # Compute P(X >= k) = 1 - P(X < k) = 1 - sum_{i=0}^{k-1} C(n,i) * p^i * (1-p)^(n-i)
        p_at_least_k = 0
        try:
            cum_prob = 0
            for i in range(k):
                cum_prob += comb(n, i) * (p_organic ** i) * ((1 - p_organic) ** (n - i))
            p_at_least_k = 1 - cum_prob
        except:
            p_at_least_k = 1  # If computation fails, assume possible

        if p_at_least_k < 0.05:  # Less than 5% chance organically
            # Estimate how many are Likes You
            expected_organic = n * p_organic
            likely_likes_you = max(0, k - max(1, round(expected_organic)))
            anomalous_matches += likely_likes_you
            anomalous_days.append({**d, "p_organic": p_at_least_k, "est_likes_you": likely_likes_you})

    print(f"\nAnomalous days found: {len(anomalous_days)}")
    print(f"  Total matches on these days estimated from Likes You: {anomalous_matches}")
    print(f"  = {anomalous_matches / total_matches:.1%} of all {total_matches} matches")

    # Show top anomalous days
    print(f"\n  Top anomalous days (sorted by suspicion):")
    print(f"  {'Date':<12} {'Likes':>6} {'Matches':>8} {'Rate':>8} {'P(organic)':>12} {'Est LY':>7}")
    print(f"  {'-'*12} {'-'*6} {'-'*8} {'-'*8} {'-'*12} {'-'*7}")
    sorted_days = sorted(anomalous_days,
                         key=lambda x: x.get("p_organic", 0))
    for d in sorted_days[:25]:
        rate = d["matches"] / d["likes"] if d["likes"] > 0 else float("inf")
        p = d.get("p_organic", 0)
        ly = d.get("est_likes_you", d["matches"])
        print(f"  {d['date']:<12} {d['likes']:>6} {d['matches']:>8} {rate:>7.1%} {p:>11.4f} {ly:>7}")

    return anomalous_matches


# ============================================================
# Method 2: Volume-Stratified Rate Analysis
# ============================================================

def method_volume_stratification(days):
    """
    If Likes You matches are independent of swiping volume, then the organic
    match rate should be roughly constant across volume buckets.

    The OBSERVED rate = organic_rate + (likes_you_per_day / likes_per_day)

    On low-volume days, likes_you_per_day/likes_per_day dominates.
    On high-volume days, organic_rate dominates.

    We can fit this model to estimate both parameters.
    """
    print("\n" + "=" * 72)
    print("METHOD 2: VOLUME-STRATIFIED ANALYSIS")
    print("=" * 72)

    # Define volume buckets
    buckets = [
        ("0 likes", 0, 0),
        ("1-5 likes", 1, 5),
        ("6-15 likes", 6, 15),
        ("16-30 likes", 16, 30),
        ("31-50 likes", 31, 50),
        ("51-100 likes", 51, 100),
        ("101-200 likes", 101, 200),
        ("201+ likes", 201, 9999),
    ]

    print(f"\n  {'Bucket':<15} {'Days':>5} {'Likes':>7} {'Matches':>8} {'Rate':>8} {'Avg M/day':>10}")
    print(f"  {'-'*15} {'-'*5} {'-'*7} {'-'*8} {'-'*8} {'-'*10}")

    bucket_data = []
    for label, lo, hi in buckets:
        b_days = [d for d in days if lo <= d["likes"] <= hi]
        b_likes = sum(d["likes"] for d in b_days)
        b_matches = sum(d["matches"] for d in b_days)
        rate = b_matches / b_likes if b_likes > 0 else 0
        avg_m = b_matches / len(b_days) if b_days else 0
        avg_l = b_likes / len(b_days) if b_days else 0

        print(f"  {label:<15} {len(b_days):>5} {b_likes:>7} {b_matches:>8} "
              f"{rate:>7.2%} {avg_m:>10.2f}")

        bucket_data.append({
            "label": label, "days": len(b_days), "likes": b_likes,
            "matches": b_matches, "rate": rate, "avg_matches": avg_m,
            "avg_likes": avg_l
        })

    # Fit the model: matches_per_day = organic_rate * likes_per_day + likes_you_per_day
    # Using OLS on days with likes > 0
    active_days = [d for d in days if d["likes"] > 0]
    n = len(active_days)
    sum_x = sum(d["likes"] for d in active_days)
    sum_y = sum(d["matches"] for d in active_days)
    sum_xy = sum(d["likes"] * d["matches"] for d in active_days)
    sum_xx = sum(d["likes"] ** 2 for d in active_days)

    # y = a + b*x  where b = organic_rate, a = likes_you_per_day
    denom = n * sum_xx - sum_x ** 2
    if denom != 0:
        b = (n * sum_xy - sum_x * sum_y) / denom  # organic rate
        a = (sum_y - b * sum_x) / n                # likes_you per day (intercept)
    else:
        b = 0
        a = 0

    print(f"\n  Linear regression: matches/day = {a:.3f} + {b:.4f} * likes/day")
    print(f"    -> Estimated ORGANIC match rate: {b:.2%}")
    print(f"    -> Estimated Likes You matches per active day: {a:.2f}")

    total_matches = sum(d["matches"] for d in days)
    total_active_days = len(active_days)
    est_total_likes_you = a * total_active_days
    est_pct_likes_you = est_total_likes_you / total_matches if total_matches > 0 else 0

    print(f"\n    -> Est. total Likes You matches: {est_total_likes_you:.0f} / {total_matches}")
    print(f"    -> Est. % from Likes You: {est_pct_likes_you:.1%}")

    return b, a, bucket_data


# ============================================================
# Method 3: Bayesian Day-by-Day Estimation
# ============================================================

def method_bayesian(days, organic_rate_prior):
    """
    For each day, compute P(match is from Likes You) vs P(match is organic)
    using Bayes' theorem.

    Model: Each match is either organic (probability = organic_rate per like)
    or from Likes You (independent of likes sent).

    We estimate an incoming "likes received per day" rate and use it as prior.
    """
    print("\n" + "=" * 72)
    print("METHOD 3: BAYESIAN DAY-BY-DAY ESTIMATION")
    print("=" * 72)

    # We need to estimate the incoming likes rate (likes received per day)
    # We can estimate this from days with 0 likes sent but matches > 0
    zero_like_days = [d for d in days if d["likes"] == 0]
    zero_like_matches = sum(d["matches"] for d in zero_like_days)
    zero_like_count = len(zero_like_days)

    if zero_like_count > 0 and zero_like_matches > 0:
        # On zero-like days, ALL matches are from Likes You
        # But we only get a Likes You match if we open the app and swipe in the queue
        # So this is a LOWER bound
        ly_rate_from_zeros = zero_like_matches / zero_like_count
    else:
        ly_rate_from_zeros = 0.1  # fallback

    print(f"\n  Days with 0 likes sent: {zero_like_count}")
    print(f"  Matches on those days: {zero_like_matches}")
    print(f"  Implied min. Likes You rate: {ly_rate_from_zeros:.2f} matches/day")

    # Use the organic rate from Method 2 as prior
    p_organic = max(organic_rate_prior, 0.001)

    # For each day, estimate expected organic vs expected Likes You matches
    # Expected organic = likes * p_organic
    # Expected Likes You = ly_rate (roughly constant)
    # Then for each match: P(LY) = ly_rate / (ly_rate + likes * p_organic)

    # We'll optimize ly_rate to maximize likelihood
    # But first, let's use the regression intercept as ly_rate
    # and compute the day-by-day breakdown

    # Try multiple ly_rates and find the one that best explains the data
    best_ll = float("-inf")
    best_ly_rate = 0

    for ly_rate_try in [i * 0.05 for i in range(1, 40)]:  # 0.05 to 2.0
        ll = 0
        for d in days:
            n = d["likes"]
            k = d["matches"]
            # Expected matches = organic + likes_you
            lam = n * p_organic + ly_rate_try
            # Poisson log-likelihood
            if lam > 0:
                ll += k * log(lam) - lam - sum(log(i) for i in range(1, k + 1))
        if ll > best_ll:
            best_ll = ll
            best_ly_rate = ly_rate_try

    print(f"\n  MLE Likes You rate (Poisson model): {best_ly_rate:.2f} matches/day")
    print(f"  Using organic rate: {p_organic:.3%}")

    # Now compute day-by-day estimates
    total_est_organic = 0
    total_est_ly = 0
    daily_estimates = []

    for d in days:
        n = d["likes"]
        k = d["matches"]
        if k == 0:
            daily_estimates.append({**d, "est_organic": 0, "est_ly": 0})
            continue

        expected_organic = n * p_organic
        expected_ly = best_ly_rate

        total_expected = expected_organic + expected_ly
        if total_expected > 0:
            frac_organic = expected_organic / total_expected
            frac_ly = expected_ly / total_expected
        else:
            frac_organic = 0
            frac_ly = 1

        est_organic = k * frac_organic
        est_ly = k * frac_ly

        total_est_organic += est_organic
        total_est_ly += est_ly

        daily_estimates.append({
            **d,
            "est_organic": est_organic,
            "est_ly": est_ly,
        })

    total_matches = sum(d["matches"] for d in days)
    print(f"\n  Estimated ORGANIC matches: {total_est_organic:.1f} ({total_est_organic/total_matches:.1%})")
    print(f"  Estimated LIKES YOU matches: {total_est_ly:.1f} ({total_est_ly/total_matches:.1%})")

    return daily_estimates, best_ly_rate, total_est_organic, total_est_ly


# ============================================================
# Method 4: Zero-Likes Proof & Match Delay Analysis
# ============================================================

def method_zero_likes_proof(days):
    """
    Irrefutable evidence: matches on days with ZERO likes sent.
    These are 100% from Likes You (or delayed matches, but likely LY).
    """
    print("\n" + "=" * 72)
    print("METHOD 4: ZERO-LIKES PROOF (Irrefutable Evidence)")
    print("=" * 72)

    zero_days = [d for d in days if d["likes"] == 0 and d["matches"] > 0]
    zero_matches = sum(d["matches"] for d in zero_days)
    total_matches = sum(d["matches"] for d in days)

    print(f"\n  Days with 0 likes sent but matches > 0: {len(zero_days)}")
    print(f"  Total matches on those days: {zero_matches}")
    print(f"  = {zero_matches / total_matches:.1%} of all matches (ABSOLUTE MINIMUM from Likes You)")

    if zero_days:
        print(f"\n  {'Date':<12} {'Opens':>6} {'Likes':>6} {'Passes':>7} {'Matches':>8} {'MsgSent':>8}")
        print(f"  {'-'*12} {'-'*6} {'-'*6} {'-'*7} {'-'*8} {'-'*8}")
        for d in sorted(zero_days, key=lambda x: x["matches"], reverse=True):
            print(f"  {d['date']:<12} {d['app_opens']:>6} {d['likes']:>6} "
                  f"{d['passes']:>7} {d['matches']:>8} {d['messages_sent']:>8}")

    # Also check days with very low likes (1-3) and disproportionate matches
    low_like_days = [d for d in days if 1 <= d["likes"] <= 3 and d["matches"] > 0]
    low_matches = sum(d["matches"] for d in low_like_days)
    low_likes = sum(d["likes"] for d in low_like_days)

    print(f"\n  Days with 1-3 likes and matches > 0: {len(low_like_days)}")
    print(f"  Total likes: {low_likes}, Total matches: {low_matches}")
    if low_likes > 0:
        print(f"  Match rate: {low_matches / low_likes:.1%} (vs ~0.5% organic = virtually impossible)")

    return zero_matches


# ============================================================
# Re-analyze key findings with corrected organic-only matches
# ============================================================

def reanalyze_with_correction(days, daily_estimates):
    """
    Re-run the key analyses using only estimated organic matches.
    Check if volume impact, selectivity, and day-of-week effects survive.
    """
    print("\n" + "=" * 72)
    print("RE-ANALYSIS: KEY FINDINGS WITH LIKES YOU CORRECTION")
    print("=" * 72)

    total_likes = sum(d["likes"] for d in days)
    total_matches = sum(d["matches"] for d in days)
    total_est_organic = sum(d["est_organic"] for d in daily_estimates)
    total_est_ly = sum(d["est_ly"] for d in daily_estimates)

    raw_rate = total_matches / total_likes if total_likes > 0 else 0
    organic_rate = total_est_organic / total_likes if total_likes > 0 else 0

    print(f"\n  Overall:")
    print(f"    Raw match rate:     {raw_rate:.2%} ({total_matches} / {total_likes})")
    print(f"    Organic match rate: {organic_rate:.2%} ({total_est_organic:.0f} / {total_likes})")
    print(f"    Correction factor:  {organic_rate / raw_rate:.2f}x" if raw_rate > 0 else "")

    # ---- Volume buckets (corrected) ----
    print(f"\n  VOLUME IMPACT (corrected):")
    buckets = [
        ("1-15 likes", 1, 15),
        ("16-50 likes", 16, 50),
        ("51-100 likes", 51, 100),
        ("101+ likes", 101, 9999),
    ]

    print(f"  {'Bucket':<15} {'Days':>5} {'Likes':>7} {'Raw M':>6} {'Raw %':>7} "
          f"{'Org M':>7} {'Org %':>7} {'LY M':>6} {'LY %':>6}")
    print(f"  {'-'*15} {'-'*5} {'-'*7} {'-'*6} {'-'*7} {'-'*7} {'-'*7} {'-'*6} {'-'*6}")

    for label, lo, hi in buckets:
        b = [d for d in daily_estimates if lo <= d["likes"] <= hi]
        b_likes = sum(d["likes"] for d in b)
        b_matches = sum(d["matches"] for d in b)
        b_organic = sum(d["est_organic"] for d in b)
        b_ly = sum(d["est_ly"] for d in b)

        raw_r = b_matches / b_likes if b_likes > 0 else 0
        org_r = b_organic / b_likes if b_likes > 0 else 0
        ly_pct = b_ly / b_matches if b_matches > 0 else 0

        print(f"  {label:<15} {len(b):>5} {b_likes:>7} {b_matches:>6} {raw_r:>6.2%} "
              f"{b_organic:>7.1f} {org_r:>6.2%} {b_ly:>6.1f} {ly_pct:>5.0%}")

    # ---- Selectivity (like ratio) vs corrected match rate ----
    print(f"\n  SELECTIVITY IMPACT (corrected):")
    sel_buckets = [
        ("Very picky (<30%)", 0, 0.30),
        ("Picky (30-50%)", 0.30, 0.50),
        ("Moderate (50-70%)", 0.50, 0.70),
        ("Generous (70%+)", 0.70, 1.01),
    ]

    print(f"  {'Selectivity':<22} {'Days':>5} {'Likes':>7} {'Raw %':>7} {'Org %':>7} {'LY %ofM':>8}")
    print(f"  {'-'*22} {'-'*5} {'-'*7} {'-'*7} {'-'*7} {'-'*8}")

    for label, lo, hi in sel_buckets:
        b = []
        for d in daily_estimates:
            total_swipes = d["likes"] + d["passes"]
            if total_swipes >= 10:
                ratio = d["likes"] / total_swipes
                if lo <= ratio < hi:
                    b.append(d)

        b_likes = sum(d["likes"] for d in b)
        b_matches = sum(d["matches"] for d in b)
        b_organic = sum(d["est_organic"] for d in b)
        b_ly = sum(d["est_ly"] for d in b)

        raw_r = b_matches / b_likes if b_likes > 0 else 0
        org_r = b_organic / b_likes if b_likes > 0 else 0
        ly_pct = b_ly / b_matches if b_matches > 0 else 0

        print(f"  {label:<22} {len(b):>5} {b_likes:>7} {raw_r:>6.2%} {org_r:>6.2%} {ly_pct:>7.0%}")

    # ---- Day of week (corrected) ----
    print(f"\n  DAY OF WEEK (corrected):")
    dow_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    print(f"  {'Day':<12} {'Days':>5} {'Likes':>7} {'Raw %':>7} {'Org %':>7} {'LY %ofM':>8}")
    print(f"  {'-'*12} {'-'*5} {'-'*7} {'-'*7} {'-'*7} {'-'*8}")

    for dow in range(7):
        b = [d for d in daily_estimates if d["weekday_num"] == dow and d["likes"] > 0]
        b_likes = sum(d["likes"] for d in b)
        b_matches = sum(d["matches"] for d in b)
        b_organic = sum(d["est_organic"] for d in b)
        b_ly = sum(d["est_ly"] for d in b)

        raw_r = b_matches / b_likes if b_likes > 0 else 0
        org_r = b_organic / b_likes if b_likes > 0 else 0
        ly_pct = b_ly / b_matches if b_matches > 0 else 0

        print(f"  {dow_names[dow]:<12} {len(b):>5} {b_likes:>7} {raw_r:>6.2%} {org_r:>6.2%} {ly_pct:>7.0%}")


# ============================================================
# Method 5: Sensitivity Analysis
# ============================================================

def sensitivity_analysis(days):
    """
    Run the estimation with different assumed organic rates to show
    how the Likes You % changes.
    """
    print("\n" + "=" * 72)
    print("SENSITIVITY ANALYSIS: Organic Rate Assumption")
    print("=" * 72)

    total_likes = sum(d["likes"] for d in days if d["likes"] > 0)
    total_matches = sum(d["matches"] for d in days)
    active_days_count = len([d for d in days if d["likes"] > 0])

    print(f"\n  {'Assumed Org Rate':>18} {'Est LY/day':>11} {'Est LY total':>13} {'% from LY':>10} {'Corrected Rate':>15}")
    print(f"  {'-'*18} {'-'*11} {'-'*13} {'-'*10} {'-'*15}")

    for org_rate in [0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.010]:
        # For each day, expected organic = likes * org_rate
        # Remaining matches attributed to LY
        total_org = 0
        total_ly = 0
        for d in days:
            if d["matches"] == 0:
                continue
            expected_org = d["likes"] * org_rate
            if expected_org >= d["matches"]:
                total_org += d["matches"]
            else:
                total_org += expected_org
                total_ly += d["matches"] - expected_org

        ly_pct = total_ly / total_matches if total_matches > 0 else 0
        ly_per_day = total_ly / active_days_count if active_days_count > 0 else 0
        corrected = total_org / total_likes if total_likes > 0 else 0

        print(f"  {org_rate:>17.2%} {ly_per_day:>10.2f} {total_ly:>12.1f} {ly_pct:>9.1%} {corrected:>14.3%}")


# ============================================================
# Final Summary
# ============================================================

def final_summary(days, daily_estimates, organic_rate, ly_rate,
                  anomaly_matches, zero_matches, total_est_organic, total_est_ly):
    print("\n" + "=" * 72)
    print("FINAL SUMMARY: LIKES YOU BIAS ESTIMATION")
    print("=" * 72)

    total_likes = sum(d["likes"] for d in days)
    total_matches = sum(d["matches"] for d in days)
    total_swipes = total_likes + sum(d["passes"] for d in days)
    active_days = len([d for d in days if d["likes"] > 0])

    raw_rate = total_matches / total_likes if total_likes > 0 else 0
    corrected_rate = total_est_organic / total_likes if total_likes > 0 else 0

    print(f"""
  DATASET:
    Period: {days[0]['date']} to {days[-1]['date']} ({len(days)} days, {active_days} active)
    Total swipes: {total_swipes:,} ({total_likes:,} likes + {sum(d['passes'] for d in days):,} passes)
    Like ratio: {total_likes / total_swipes:.1%}
    Total matches: {total_matches}

  RAW vs CORRECTED:
    Raw match rate:              {raw_rate:.3%} ({total_matches} / {total_likes:,})
    Estimated organic rate:      {corrected_rate:.3%} ({total_est_organic:.0f} / {total_likes:,})
    Correction factor:           {corrected_rate / raw_rate:.2f}x (organic is {(1 - corrected_rate/raw_rate):.0%} lower)

  LIKES YOU ESTIMATION:
    Irrefutable minimum (0-like days): {zero_matches} matches = {zero_matches/total_matches:.1%}
    Anomaly method estimate:           {anomaly_matches} matches = {anomaly_matches/total_matches:.1%}
    Bayesian/Poisson estimate:         {total_est_ly:.0f} matches = {total_est_ly/total_matches:.1%}
    Estimated LY rate:                 ~{ly_rate:.2f} matches/active day

  CONCLUSION:
    An estimated {total_est_ly/total_matches:.0%} of matches come from the "Likes You" queue.
    The true ORGANIC match rate (from random swiping) is ~{corrected_rate:.2%},
    not the headline {raw_rate:.2%}.

    This means ~{ly_rate:.1f} of Jonathan's matches per active day come from women
    who already liked him, regardless of his own swiping behavior.
""")

    # Do key findings survive?
    print("  KEY FINDINGS SURVIVAL CHECK:")

    # Check if selectivity still matters after correction
    picky_org = []
    generous_org = []
    for d in daily_estimates:
        total_sw = d["likes"] + d["passes"]
        if total_sw >= 10 and d["likes"] > 0:
            ratio = d["likes"] / total_sw
            if ratio < 0.40:
                picky_org.append(d)
            elif ratio >= 0.60:
                generous_org.append(d)

    picky_likes = sum(d["likes"] for d in picky_org)
    picky_org_matches = sum(d["est_organic"] for d in picky_org)
    generous_likes = sum(d["likes"] for d in generous_org)
    generous_org_matches = sum(d["est_organic"] for d in generous_org)

    picky_rate = picky_org_matches / picky_likes if picky_likes > 0 else 0
    generous_rate = generous_org_matches / generous_likes if generous_likes > 0 else 0

    print(f"    Selectivity effect:  Picky organic={picky_rate:.3%}, Generous organic={generous_rate:.3%}")
    if picky_rate > generous_rate * 1.1:
        print(f"      -> SURVIVES: Being picky still improves ORGANIC rate by {picky_rate/generous_rate:.1f}x")
    else:
        print(f"      -> WEAKENED or GONE after correction")

    # Check volume effect
    lo_vol = [d for d in daily_estimates if 1 <= d["likes"] <= 30]
    hi_vol = [d for d in daily_estimates if d["likes"] > 50]
    lo_likes = sum(d["likes"] for d in lo_vol)
    lo_org = sum(d["est_organic"] for d in lo_vol)
    hi_likes = sum(d["likes"] for d in hi_vol)
    hi_org = sum(d["est_organic"] for d in hi_vol)

    lo_rate = lo_org / lo_likes if lo_likes > 0 else 0
    hi_rate = hi_org / hi_likes if hi_likes > 0 else 0

    print(f"    Volume effect:       Low-vol organic={lo_rate:.3%}, High-vol organic={hi_rate:.3%}")
    if lo_rate > hi_rate * 1.2:
        print(f"      -> PARTIALLY SURVIVES but reduced ({lo_rate/hi_rate:.1f}x vs raw difference)")
    elif abs(lo_rate - hi_rate) / max(lo_rate, hi_rate, 0.001) < 0.2:
        print(f"      -> EXPLAINED AWAY: Volume effect was mostly Likes You contamination!")
    else:
        print(f"      -> MIXED: Some residual effect remains")


# ============================================================
# Main
# ============================================================

def main():
    print("TINDER 'LIKES YOU' BIAS ESTIMATION")
    print("Analyzing Jonathan's RGPD data export")
    print("=" * 72)

    days = load_data()

    total_likes = sum(d["likes"] for d in days)
    total_matches = sum(d["matches"] for d in days)
    print(f"\nLoaded {len(days)} days of data")
    print(f"Total: {total_likes:,} likes, {total_matches} matches ({total_matches/total_likes:.2%} raw rate)")

    # Run all methods
    anomaly_matches = method_anomaly_detection(days)
    organic_rate, ly_per_day, bucket_data = method_volume_stratification(days)
    daily_estimates, ly_rate, total_est_organic, total_est_ly = method_bayesian(
        days, organic_rate if organic_rate > 0 else 0.005
    )
    zero_matches = method_zero_likes_proof(days)
    sensitivity_analysis(days)

    # Re-analyze with correction
    reanalyze_with_correction(days, daily_estimates)

    # Final summary
    final_summary(days, daily_estimates, organic_rate, ly_rate,
                  anomaly_matches, zero_matches, total_est_organic, total_est_ly)


if __name__ == "__main__":
    main()
