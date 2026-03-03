#!/usr/bin/env python3
"""
DatePulse Correlation Validation Script
========================================

Validates the DatePulse scoring hypothesis against 5 years of real Google Trends
data (2021-2026). The hypothesis: dating app activity follows predictable patterns
encoded in static lookup tables (hourly, weekly, monthly indices).

Methodology:
1. Export Google Trends weekly data for dating-related search terms in France
2. Build theoretical predictions using DatePulse's lookup tables
3. Compute Pearson/Spearman correlations and R-squared
4. Perform out-of-sample validation (train 2021-2023, test 2024-2025)
5. Run statistical rigor tests (ADF, cross-correlation, Granger causality)
6. Optimize term combinations for maximum out-of-sample correlation
7. Analyze per-app differences

Usage:
    pip install -r scripts/requirements-validation.txt
    python scripts/validate_correlation.py

Output:
    scripts/output_us/correlation_report.json
    scripts/output_us/overlay_trends_vs_prediction.png
    scripts/output_us/per_app_correlation.png
    scripts/output_us/residuals.png
    scripts/output_us/cross_correlation.png
    scripts/output_us/*.csv (raw data exports)

Author: DatePulse Team
"""

import json
import os
import sys
import time
import warnings
from datetime import datetime, timedelta
from itertools import combinations
from pathlib import Path
from typing import Any, Optional

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for server/CI environments
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import pandas as pd
from scipy import stats as scipy_stats
from scipy.signal import detrend
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from statsmodels.tsa.stattools import adfuller, grangercausalitytests

# Suppress warnings from statsmodels during Granger tests
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

# ═══════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════

OUTPUT_DIR = Path(__file__).parent / "output_us"

# Google Trends query configuration
GEO = "US"  # United States
START_YEAR = 2021
END_YEAR = 2026

# Primary search terms — one per dating app
PRIMARY_TERMS = ["tinder", "bumble", "hinge", "happn"]

# Variant search terms — English phrasings for US market
VARIANT_TERMS = [
    "tinder app",
    "bumble app",
    "hinge app",
    "dating app",
    "online dating",
    "dating apps",
]

# pytrends category for dating/personals
DATING_CATEGORY = 55

# Rate limiting: seconds to wait between pytrends API calls
# Google is strict about rate limiting; 15-20s is the safe range
MIN_SLEEP = 15
MAX_SLEEP = 20

# Retry configuration for flaky pytrends API
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # Exponential backoff: 2^attempt * base_sleep

# Train/test split for out-of-sample validation
TRAIN_END = "2023-12-31"
TEST_START = "2024-01-01"

# ═══════════════════════════════════════════════════════════════════════════
# DatePulse Lookup Tables (mirrored from frontend/src/lib/data.ts)
# ═══════════════════════════════════════════════════════════════════════════

# Hourly activity index (0-23h). Peak at 21h = 100.
HOURLY_INDEX = {
    0: 8, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 10, 7: 15,
    8: 25, 9: 28, 10: 30, 11: 35, 12: 42, 13: 45, 14: 40,
    15: 28, 16: 25, 17: 30, 18: 55, 19: 70, 20: 85, 21: 100,
    22: 75, 23: 45,
}

# Weekly activity index (0=Sunday, JS convention). Peak on Sunday = 100.
WEEKLY_INDEX = {
    0: 100,  # Dimanche (Sunday) — peak
    1: 90,   # Lundi (Monday)
    2: 75,   # Mardi (Tuesday)
    3: 75,   # Mercredi (Wednesday)
    4: 85,   # Jeudi (Thursday)
    5: 55,   # Vendredi (Friday)
    6: 60,   # Samedi (Saturday)
}

# Monthly activity index (0=January). Peak in January = 100.
MONTHLY_INDEX = {
    0: 100,   # Janvier
    1: 90,    # Fevrier
    2: 75,    # Mars
    3: 70,    # Avril
    4: 65,    # Mai
    5: 60,    # Juin
    6: 60,    # Juillet
    7: 50,    # Aout
    8: 75,    # Septembre
    9: 80,    # Octobre
    10: 85,   # Novembre
    11: 65,   # Decembre
}


# ═══════════════════════════════════════════════════════════════════════════
# Step 1 — Export Google Trends Data
# ═══════════════════════════════════════════════════════════════════════════

def _sleep_between_requests():
    """Sleep a random duration between MIN_SLEEP and MAX_SLEEP to avoid rate limiting."""
    duration = MIN_SLEEP + (MAX_SLEEP - MIN_SLEEP) * np.random.random()
    print(f"  [rate-limit] Sleeping {duration:.1f}s...")
    time.sleep(duration)


def fetch_trends_single_term(
    term: str,
    timeframe: str,
    geo: str = GEO,
    category: int = 0,
) -> Optional[pd.DataFrame]:
    """
    Fetch Google Trends interest-over-time for a single term with retries.

    Args:
        term: Search term (e.g., "tinder")
        timeframe: pytrends timeframe string (e.g., "2021-01-01 2026-02-24")
        geo: Geographic region code
        category: pytrends category ID (0 = all categories, 55 = dating)

    Returns:
        DataFrame with weekly interest values, or None on failure.
    """
    from pytrends.request import TrendReq

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"  [attempt {attempt}/{MAX_RETRIES}] Fetching '{term}' ({timeframe}, cat={category})...")
            pytrends = TrendReq(hl="fr-FR", tz=60)  # tz=60 => UTC+1 (Paris)
            pytrends.build_payload(
                kw_list=[term],
                cat=category,
                timeframe=timeframe,
                geo=geo,
            )
            df = pytrends.interest_over_time()

            if df is not None and not df.empty:
                # Drop the 'isPartial' column if present
                if "isPartial" in df.columns:
                    df = df.drop(columns=["isPartial"])
                print(f"  [OK] Got {len(df)} data points for '{term}'")
                return df
            else:
                print(f"  [WARN] Empty response for '{term}'")
                return None

        except Exception as e:
            wait = RETRY_BACKOFF_BASE ** attempt * MIN_SLEEP
            print(f"  [ERROR] Attempt {attempt} failed: {e}")
            if attempt < MAX_RETRIES:
                print(f"  [retry] Waiting {wait:.0f}s before retry...")
                time.sleep(wait)
            else:
                print(f"  [FAIL] All {MAX_RETRIES} attempts failed for '{term}'")
                return None

    return None


def fetch_trends_overlapping_windows(
    term: str,
    start_year: int = START_YEAR,
    end_year: int = END_YEAR,
    geo: str = GEO,
    category: int = 0,
) -> Optional[pd.DataFrame]:
    """
    Fetch Google Trends data in overlapping 12-month windows and stitch together.

    Google Trends returns weekly data for periods up to ~5 years, but longer
    periods may produce monthly granularity. To ensure weekly resolution, we
    fetch in 12-month overlapping windows and rescale using the overlap regions.

    The stitching algorithm:
    1. Fetch each 12-month window independently
    2. For each consecutive pair, find the overlap period
    3. Compute a scaling factor from the overlap to normalize values
    4. Chain-multiply scaling factors to put everything on the first window's scale
    5. Concatenate and deduplicate (keeping the earliest window's value)

    Args:
        term: Search term
        start_year: First year to fetch
        end_year: Last year to fetch (up to current date)
        geo: Geographic region
        category: pytrends category

    Returns:
        Stitched DataFrame with weekly data, or None on failure.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    windows = []

    # Build overlapping 12-month windows with 3-month overlap
    current_start = datetime(start_year, 1, 1)
    end_date = datetime.now()

    while current_start < end_date:
        window_end = min(current_start + timedelta(days=365 + 90), end_date)
        timeframe = f"{current_start.strftime('%Y-%m-%d')} {window_end.strftime('%Y-%m-%d')}"

        df = fetch_trends_single_term(term, timeframe, geo, category)
        if df is not None and not df.empty:
            windows.append(df)

        _sleep_between_requests()
        # Advance by 12 months (with 3-month overlap)
        current_start += timedelta(days=365)

    if not windows:
        print(f"  [FAIL] No data windows retrieved for '{term}'")
        return None

    if len(windows) == 1:
        return windows[0]

    # Stitch windows together using overlap normalization
    stitched = windows[0].copy()

    for i in range(1, len(windows)):
        prev = stitched
        curr = windows[i]

        # Find overlapping dates
        overlap_dates = prev.index.intersection(curr.index)

        if len(overlap_dates) > 2:
            # Compute scaling factor from overlap region
            prev_overlap = prev.loc[overlap_dates, term].mean()
            curr_overlap = curr.loc[overlap_dates, term].mean()

            if curr_overlap > 0 and prev_overlap > 0:
                scale = prev_overlap / curr_overlap
            else:
                scale = 1.0

            # Scale current window and append non-overlapping portion
            curr_scaled = curr.copy()
            curr_scaled[term] = curr_scaled[term] * scale
            new_dates = curr_scaled.index.difference(prev.index)
            if len(new_dates) > 0:
                stitched = pd.concat([stitched, curr_scaled.loc[new_dates]])
        else:
            # No meaningful overlap — just concatenate
            new_dates = curr.index.difference(prev.index)
            if len(new_dates) > 0:
                stitched = pd.concat([stitched, curr.loc[new_dates]])

    stitched = stitched.sort_index()
    return stitched


def fetch_all_trends_data(use_windows: bool = False) -> dict[str, pd.DataFrame]:
    """
    Fetch Google Trends data for all terms (primary + variant + category).

    Strategy:
    - First try a single 5-year request (pytrends supports up to 5 years of weekly data)
    - If that fails or returns monthly data, fall back to overlapping windows

    Args:
        use_windows: If True, always use overlapping window strategy

    Returns:
        Dict mapping term names to their DataFrames.
    """
    all_terms = PRIMARY_TERMS + VARIANT_TERMS
    results = {}

    # Standard timeframe for full 5-year range
    timeframe = f"{START_YEAR}-01-01 {datetime.now().strftime('%Y-%m-%d')}"

    print("\n" + "=" * 70)
    print("STEP 1: Fetching Google Trends Data")
    print("=" * 70)

    # Fetch each term individually (pytrends compares terms when queried together,
    # which changes the relative scaling — we want absolute values per term)
    for term in all_terms:
        print(f"\n--- Fetching: '{term}' ---")

        if use_windows:
            df = fetch_trends_overlapping_windows(term)
        else:
            df = fetch_trends_single_term(term, timeframe)
            # If we got very few points, it might be monthly — retry with windows
            if df is not None and len(df) < 100:
                print(f"  [WARN] Only {len(df)} points (may be monthly). Retrying with windows...")
                _sleep_between_requests()
                df_windows = fetch_trends_overlapping_windows(term)
                if df_windows is not None and len(df_windows) > len(df):
                    df = df_windows

        if df is not None:
            results[term] = df
            # Save raw data to CSV
            csv_path = OUTPUT_DIR / f"gt_raw_{term.replace(' ', '_')}.csv"
            df.to_csv(csv_path)
            print(f"  [SAVED] {csv_path}")
        else:
            print(f"  [SKIP] No data for '{term}'")

        _sleep_between_requests()

    # Also fetch category-level data (dating category = 55)
    print(f"\n--- Fetching category-level data (category={DATING_CATEGORY}) ---")
    cat_term = "dating_category"
    # For category search, we use an empty-ish broad term
    # pytrends requires at least one keyword, so we use a broad one
    df_cat = fetch_trends_single_term(
        "rencontre", timeframe, category=DATING_CATEGORY
    )
    if df_cat is not None:
        df_cat = df_cat.rename(columns={"rencontre": cat_term})
        results[cat_term] = df_cat
        csv_path = OUTPUT_DIR / f"gt_raw_{cat_term}.csv"
        df_cat.to_csv(csv_path)
        print(f"  [SAVED] {csv_path}")

    print(f"\n[SUMMARY] Successfully fetched {len(results)}/{len(all_terms)+1} terms")
    return results


def load_cached_trends_data() -> dict[str, pd.DataFrame]:
    """
    Load previously exported Google Trends CSVs from the output directory.
    Useful for re-running analysis without re-fetching (avoiding rate limits).

    Returns:
        Dict mapping term names to DataFrames, or empty dict if no cached data.
    """
    results = {}
    csv_files = list(OUTPUT_DIR.glob("gt_raw_*.csv"))

    if not csv_files:
        return results

    print(f"[CACHE] Found {len(csv_files)} cached CSV files in {OUTPUT_DIR}")

    for csv_path in csv_files:
        term = csv_path.stem.replace("gt_raw_", "").replace("_", " ")
        try:
            df = pd.read_csv(csv_path, index_col=0, parse_dates=True)
            results[term] = df
            print(f"  [LOADED] {term}: {len(df)} data points")
        except Exception as e:
            print(f"  [ERROR] Failed to load {csv_path}: {e}")

    return results


# ═══════════════════════════════════════════════════════════════════════════
# Step 2 — Build Theoretical Predictions
# ═══════════════════════════════════════════════════════════════════════════

def compute_weekly_theoretical_score(week_start: datetime) -> float:
    """
    Compute the theoretical DatePulse weekly score for a given week.

    Since Google Trends gives us weekly data, we need a weekly aggregate of
    our hourly model. We compute the average score across all 168 hourly slots
    in the week, weighted by typical usage patterns (evening hours matter more).

    The formula per hour: score(h, d, m) = hourly[h] * weekly[d] / 100 * monthly[m] / 100

    For a weekly aggregate, we average across all 7 days x 24 hours = 168 slots.
    The hourly weighting naturally gives more importance to peak hours.

    Args:
        week_start: The Monday (or Sunday) starting the week

    Returns:
        Average weekly theoretical score (0-100)
    """
    month = week_start.month - 1  # Convert to 0-indexed
    monthly = MONTHLY_INDEX[month]

    total_score = 0.0
    n_slots = 0

    # Iterate through all 7 days and 24 hours in the week
    for day_offset in range(7):
        day_date = week_start + timedelta(days=day_offset)
        js_day = day_date.weekday()  # Python: 0=Monday
        # Convert Python weekday to JS convention: 0=Sunday
        js_day_converted = (js_day + 1) % 7

        weekly = WEEKLY_INDEX[js_day_converted]

        for hour in range(24):
            hourly = HOURLY_INDEX[hour]
            # DatePulse formula: raw = (hourly * weekly * monthly) / 10000
            slot_score = (hourly * weekly * monthly) / 10000.0
            total_score += slot_score
            n_slots += 1

    return total_score / n_slots


def compute_simple_weekly_score(week_start: datetime) -> float:
    """
    Simplified weekly score using only monthly * weekly-average indices.

    This is a faster approximation: monthly_index * avg_weekly_index / 100.
    Since all weeks in a month share the same monthly index, the variation
    within a month comes only from the weekly index averaging.

    Args:
        week_start: Start of the week

    Returns:
        Simplified weekly score
    """
    month = week_start.month - 1
    monthly = MONTHLY_INDEX[month]

    # Average weekly index across the 7 days in this specific week
    weekly_sum = 0
    for day_offset in range(7):
        day_date = week_start + timedelta(days=day_offset)
        js_day = (day_date.weekday() + 1) % 7  # Python to JS day convention
        weekly_sum += WEEKLY_INDEX[js_day]
    avg_weekly = weekly_sum / 7.0

    # Average hourly index (constant, same every week)
    avg_hourly = sum(HOURLY_INDEX.values()) / 24.0

    return (avg_hourly * avg_weekly * monthly) / 10000.0


def build_theoretical_series(dates: pd.DatetimeIndex) -> pd.Series:
    """
    Build a theoretical prediction series aligned with Google Trends dates.

    Args:
        dates: DatetimeIndex of weekly dates from Google Trends

    Returns:
        Series of theoretical scores indexed by the same dates
    """
    scores = []
    for date in dates:
        dt = date.to_pydatetime()
        score = compute_weekly_theoretical_score(dt)
        scores.append(score)

    series = pd.Series(scores, index=dates, name="theoretical")

    # Normalize to 0-100 scale to match Google Trends relative scale
    if series.max() > series.min():
        series = (series - series.min()) / (series.max() - series.min()) * 100
    return series


def build_sinusoid_baseline(dates: pd.DatetimeIndex) -> pd.Series:
    """
    Build a simple 12-month sinusoidal baseline for comparison.

    This represents the naive hypothesis: dating activity follows a pure
    annual cycle with peak in January and trough in July/August.

    The sinusoid: y(t) = 50 + 50 * cos(2*pi*(day_of_year - 1) / 365.25)
    This peaks on Jan 1 and troughs around July 2.

    Args:
        dates: DatetimeIndex

    Returns:
        Series of sinusoidal baseline values (0-100)
    """
    day_of_year = dates.dayofyear
    # Cosine wave: peak at day 1 (Jan 1), trough at day ~183 (July 2)
    values = 50 + 50 * np.cos(2 * np.pi * (day_of_year - 1) / 365.25)
    return pd.Series(values, index=dates, name="sinusoid_baseline")


# ═══════════════════════════════════════════════════════════════════════════
# Step 3 — Correlation Analysis
# ═══════════════════════════════════════════════════════════════════════════

def compute_correlations(
    actual: pd.Series,
    predicted: pd.Series,
    label: str = "",
) -> dict[str, Any]:
    """
    Compute comprehensive correlation metrics between two aligned series.

    Metrics computed:
    - Pearson r: Linear correlation (assumes normal distribution)
    - Spearman rho: Rank correlation (more robust to outliers/non-linearity)
    - R-squared: Proportion of variance explained
    - p-values: Statistical significance

    Args:
        actual: Google Trends values
        predicted: Theoretical DatePulse values
        label: Descriptive label for this comparison

    Returns:
        Dict with all correlation metrics
    """
    # Drop any NaN rows
    mask = actual.notna() & predicted.notna()
    a = actual[mask].values
    p = predicted[mask].values

    if len(a) < 10:
        return {
            "label": label,
            "n_points": len(a),
            "error": "Insufficient data points (< 10)",
        }

    # Pearson correlation (parametric, assumes linearity + normality)
    pearson_r, pearson_p = scipy_stats.pearsonr(a, p)

    # Spearman rank correlation (non-parametric, robust)
    spearman_rho, spearman_p = scipy_stats.spearmanr(a, p)

    # R-squared (coefficient of determination)
    r_squared = pearson_r ** 2

    return {
        "label": label,
        "n_points": int(len(a)),
        "pearson_r": round(float(pearson_r), 4),
        "pearson_p": float(pearson_p),
        "pearson_significant": pearson_p < 0.05,
        "spearman_rho": round(float(spearman_rho), 4),
        "spearman_p": float(spearman_p),
        "spearman_significant": spearman_p < 0.05,
        "r_squared": round(float(r_squared), 4),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Step 4 — Out-of-Sample Validation
# ═══════════════════════════════════════════════════════════════════════════

def out_of_sample_validation(
    actual: pd.Series,
    predicted: pd.Series,
    baseline: pd.Series,
    label: str = "",
) -> dict[str, Any]:
    """
    Train on 2021-2023, test on 2024-2025. Compare to sinusoidal baseline.

    Approach:
    1. Fit a simple linear regression: actual ~ predicted (on training data)
    2. Apply the fitted model to test data
    3. Report r, R-squared, RMSE on both train and test sets
    4. Do the same for the sinusoidal baseline
    5. Compare: does the DatePulse model beat the naive baseline?

    Args:
        actual: Full actual series
        predicted: Full theoretical series
        baseline: Full sinusoidal baseline series
        label: Descriptive label

    Returns:
        Dict with out-of-sample metrics for model and baseline
    """
    # Align all three series
    df = pd.DataFrame({
        "actual": actual,
        "predicted": predicted,
        "baseline": baseline,
    }).dropna()

    if len(df) < 20:
        return {"label": label, "error": "Insufficient data for train/test split"}

    # Split into train and test
    train = df[df.index <= TRAIN_END]
    test = df[df.index >= TEST_START]

    if len(train) < 10 or len(test) < 5:
        return {
            "label": label,
            "error": f"Insufficient split: train={len(train)}, test={len(test)}",
        }

    # --- DatePulse Model ---
    model = LinearRegression()
    X_train = train["predicted"].values.reshape(-1, 1)
    y_train = train["actual"].values
    model.fit(X_train, y_train)

    X_test = test["predicted"].values.reshape(-1, 1)
    y_test = test["actual"].values
    y_pred_test = model.predict(X_test)
    y_pred_train = model.predict(X_train)

    model_train_r = float(np.corrcoef(y_train, y_pred_train)[0, 1])
    model_test_r = float(np.corrcoef(y_test, y_pred_test)[0, 1])
    model_test_r2 = float(r2_score(y_test, y_pred_test))
    model_test_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_test)))

    # --- Sinusoidal Baseline ---
    baseline_model = LinearRegression()
    X_train_bl = train["baseline"].values.reshape(-1, 1)
    baseline_model.fit(X_train_bl, y_train)

    X_test_bl = test["baseline"].values.reshape(-1, 1)
    y_pred_test_bl = baseline_model.predict(X_test_bl)

    baseline_test_r = float(np.corrcoef(y_test, y_pred_test_bl)[0, 1])
    baseline_test_r2 = float(r2_score(y_test, y_pred_test_bl))
    baseline_test_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_test_bl)))

    return {
        "label": label,
        "train_n": int(len(train)),
        "test_n": int(len(test)),
        "model": {
            "train_r": round(model_train_r, 4),
            "test_r": round(model_test_r, 4),
            "test_r2": round(model_test_r2, 4),
            "test_rmse": round(model_test_rmse, 2),
            "coefficient": round(float(model.coef_[0]), 4),
            "intercept": round(float(model.intercept_), 4),
        },
        "baseline_sinusoid": {
            "test_r": round(baseline_test_r, 4),
            "test_r2": round(baseline_test_r2, 4),
            "test_rmse": round(baseline_test_rmse, 2),
        },
        "model_beats_baseline": model_test_r2 > baseline_test_r2,
        "improvement_r2": round(model_test_r2 - baseline_test_r2, 4),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Step 5 — Statistical Rigor Tests
# ═══════════════════════════════════════════════════════════════════════════

def test_stationarity(series: pd.Series, name: str) -> dict[str, Any]:
    """
    Augmented Dickey-Fuller test for stationarity.

    A stationary series has constant mean and variance over time. Non-stationary
    series (unit root) can produce spurious correlations. If both series are
    non-stationary, we need to difference or detrend before correlating.

    Null hypothesis: The series has a unit root (non-stationary).
    If p < 0.05, we reject H0 and conclude the series is stationary.

    Args:
        series: Time series to test
        name: Descriptive name for reporting

    Returns:
        Dict with ADF test results
    """
    clean = series.dropna().values
    if len(clean) < 20:
        return {"name": name, "error": "Insufficient data for ADF test"}

    try:
        result = adfuller(clean, autolag="AIC")
        return {
            "name": name,
            "adf_statistic": round(float(result[0]), 4),
            "p_value": round(float(result[1]), 6),
            "is_stationary": result[1] < 0.05,
            "n_lags_used": int(result[2]),
            "n_observations": int(result[3]),
            "critical_values": {k: round(v, 4) for k, v in result[4].items()},
        }
    except Exception as e:
        return {"name": name, "error": str(e)}


def cross_correlation_analysis(
    actual: pd.Series,
    predicted: pd.Series,
    max_lag: int = 12,
) -> dict[str, Any]:
    """
    Cross-correlation function to detect lag between series.

    Tests whether the theoretical prediction leads or lags the actual data.
    A positive lag means the prediction leads reality (good for forecasting).
    A negative lag means the prediction lags reality (it's reactive, not predictive).

    Args:
        actual: Actual Google Trends values
        predicted: Theoretical DatePulse values
        max_lag: Maximum number of weeks to test in each direction

    Returns:
        Dict with cross-correlation results and optimal lag
    """
    # Align and clean
    df = pd.DataFrame({"actual": actual, "predicted": predicted}).dropna()
    if len(df) < 2 * max_lag:
        return {"error": "Insufficient data for cross-correlation"}

    a = df["actual"].values
    p = df["predicted"].values

    # Normalize (subtract mean, divide by std) for proper cross-correlation
    a_norm = (a - a.mean()) / (a.std() + 1e-10)
    p_norm = (p - p.mean()) / (p.std() + 1e-10)

    lags = range(-max_lag, max_lag + 1)
    correlations = {}

    for lag in lags:
        if lag >= 0:
            corr = np.corrcoef(a_norm[lag:], p_norm[:len(a_norm) - lag])[0, 1]
        else:
            corr = np.corrcoef(a_norm[:len(a_norm) + lag], p_norm[-lag:])[0, 1]
        correlations[int(lag)] = round(float(corr), 4)

    # Find optimal lag (maximum absolute correlation)
    optimal_lag = max(correlations, key=lambda k: abs(correlations[k]))

    return {
        "correlations_by_lag": correlations,
        "optimal_lag_weeks": optimal_lag,
        "optimal_correlation": correlations[optimal_lag],
        "zero_lag_correlation": correlations[0],
        "interpretation": (
            "Prediction leads reality"
            if optimal_lag > 0
            else "Prediction lags reality"
            if optimal_lag < 0
            else "No lag detected"
        ),
    }


def granger_causality_analysis(
    actual: pd.Series,
    predicted: pd.Series,
    max_lag: int = 8,
) -> dict[str, Any]:
    """
    Granger causality test: does the theoretical prediction help forecast actual values?

    Granger causality does NOT imply true causality. It tests whether past values
    of the prediction series contain information useful for forecasting the actual
    series, beyond what's contained in the actual series' own past values.

    We test both directions:
    1. Does theoretical -> actual? (prediction helps forecast reality)
    2. Does actual -> theoretical? (reality helps forecast prediction — shouldn't be true)

    Args:
        actual: Actual Google Trends values
        predicted: Theoretical DatePulse values
        max_lag: Maximum lag order to test

    Returns:
        Dict with Granger causality results
    """
    df = pd.DataFrame({"actual": actual, "predicted": predicted}).dropna()

    if len(df) < 3 * max_lag:
        return {"error": "Insufficient data for Granger causality test"}

    results = {}

    # Test: does predicted Granger-cause actual?
    try:
        test_data = df[["actual", "predicted"]].values
        gc_result = grangercausalitytests(test_data, maxlag=max_lag, verbose=False)

        # Extract p-values for each lag from the F-test (ssr_ftest)
        p_values = {}
        for lag in range(1, max_lag + 1):
            ftest = gc_result[lag][0]["ssr_ftest"]
            p_values[lag] = round(float(ftest[1]), 6)

        results["predicted_causes_actual"] = {
            "p_values_by_lag": p_values,
            "significant_at_any_lag": any(p < 0.05 for p in p_values.values()),
            "best_lag": min(p_values, key=p_values.get),
            "best_p_value": min(p_values.values()),
        }
    except Exception as e:
        results["predicted_causes_actual"] = {"error": str(e)}

    # Test: does actual Granger-cause predicted? (reverse direction)
    try:
        test_data_rev = df[["predicted", "actual"]].values
        gc_result_rev = grangercausalitytests(test_data_rev, maxlag=max_lag, verbose=False)

        p_values_rev = {}
        for lag in range(1, max_lag + 1):
            ftest = gc_result_rev[lag][0]["ssr_ftest"]
            p_values_rev[lag] = round(float(ftest[1]), 6)

        results["actual_causes_predicted"] = {
            "p_values_by_lag": p_values_rev,
            "significant_at_any_lag": any(p < 0.05 for p in p_values_rev.values()),
        }
    except Exception as e:
        results["actual_causes_predicted"] = {"error": str(e)}

    return results


def detrended_correlation(
    actual: pd.Series,
    predicted: pd.Series,
) -> dict[str, Any]:
    """
    Detrend both series and re-correlate to check if the correlation
    survives after removing shared seasonality.

    This is a crucial test: if two series both have annual seasonality,
    they will correlate even if the underlying processes are unrelated.
    By removing the trend and seasonality, we test whether the residuals
    still correlate — which would indicate a genuine relationship.

    Detrending methods:
    1. Linear detrend: Remove linear trend
    2. First-differencing: d(t) = x(t) - x(t-1), removes unit root
    3. 52-week differencing: d(t) = x(t) - x(t-52), removes annual seasonality

    Args:
        actual: Actual Google Trends values
        predicted: Theoretical DatePulse values

    Returns:
        Dict with detrended correlation results
    """
    df = pd.DataFrame({"actual": actual, "predicted": predicted}).dropna()

    if len(df) < 60:
        return {"error": "Insufficient data for detrending analysis"}

    a = df["actual"].values
    p = df["predicted"].values

    results = {}

    # Method 1: Linear detrend (scipy)
    a_detrended = detrend(a)
    p_detrended = detrend(p)
    r_linear, pval_linear = scipy_stats.pearsonr(a_detrended, p_detrended)
    results["linear_detrend"] = {
        "pearson_r": round(float(r_linear), 4),
        "p_value": float(pval_linear),
        "significant": pval_linear < 0.05,
    }

    # Method 2: First-differencing (removes unit root / trend)
    a_diff = np.diff(a)
    p_diff = np.diff(p)
    r_diff, pval_diff = scipy_stats.pearsonr(a_diff, p_diff)
    results["first_difference"] = {
        "pearson_r": round(float(r_diff), 4),
        "p_value": float(pval_diff),
        "significant": pval_diff < 0.05,
    }

    # Method 3: 52-week seasonal differencing (removes annual cycle)
    if len(a) > 52:
        a_seasonal = a[52:] - a[:-52]
        p_seasonal = p[52:] - p[:-52]
        r_seasonal, pval_seasonal = scipy_stats.pearsonr(a_seasonal, p_seasonal)
        results["seasonal_difference_52w"] = {
            "pearson_r": round(float(r_seasonal), 4),
            "p_value": float(pval_seasonal),
            "significant": pval_seasonal < 0.05,
        }
    else:
        results["seasonal_difference_52w"] = {"error": "Less than 52 weeks of data"}

    return results


def run_statistical_rigor_tests(
    actual: pd.Series,
    predicted: pd.Series,
    label: str = "",
) -> dict[str, Any]:
    """
    Run all statistical rigor tests for a term.

    Args:
        actual: Actual Google Trends series
        predicted: Theoretical DatePulse series
        label: Term label

    Returns:
        Dict with all statistical test results
    """
    return {
        "label": label,
        "stationarity_actual": test_stationarity(actual, f"actual ({label})"),
        "stationarity_predicted": test_stationarity(predicted, f"predicted ({label})"),
        "cross_correlation": cross_correlation_analysis(actual, predicted),
        "granger_causality": granger_causality_analysis(actual, predicted),
        "detrended_correlations": detrended_correlation(actual, predicted),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Step 6 — Term Optimization
# ═══════════════════════════════════════════════════════════════════════════

def optimize_term_combinations(
    trends_data: dict[str, pd.DataFrame],
    theoretical: pd.Series,
) -> dict[str, Any]:
    """
    Find the optimal search term or combination of terms that maximizes
    out-of-sample correlation with the theoretical DatePulse prediction.

    Strategy:
    1. Test each individual term
    2. Test all pairs and triples of terms (weighted average)
    3. For each combination, optimize weights using OLS on training data
    4. Report the combination that maximizes test-set r

    Args:
        trends_data: Dict of term -> DataFrame with Google Trends data
        theoretical: Theoretical prediction series

    Returns:
        Dict with optimization results and rankings
    """
    print("\n" + "=" * 70)
    print("STEP 6: Term Optimization")
    print("=" * 70)

    # Build a unified DataFrame with all terms aligned to theoretical dates
    all_series = {}
    for term, df in trends_data.items():
        if df is not None and len(df) > 0:
            # Get the first data column (term name)
            col = [c for c in df.columns if c != "isPartial"]
            if col:
                s = df[col[0]].copy()
                s.name = term
                all_series[term] = s

    if not all_series:
        return {"error": "No terms available for optimization"}

    # Align everything to a common index
    combined_df = pd.DataFrame(all_series)
    combined_df["theoretical"] = theoretical
    combined_df = combined_df.dropna()

    if len(combined_df) < 30:
        return {"error": f"Only {len(combined_df)} aligned data points — insufficient"}

    # Split into train/test
    train = combined_df[combined_df.index <= TRAIN_END]
    test = combined_df[combined_df.index >= TEST_START]

    term_names = [t for t in all_series.keys()]
    single_results = []
    combo_results = []

    # --- Test individual terms ---
    for term in term_names:
        if term not in train.columns or train[term].isna().all():
            continue

        # OLS on training: actual_term ~ theoretical
        t_train = train[term].dropna()
        p_train = train.loc[t_train.index, "theoretical"]

        if len(t_train) < 10:
            continue

        model = LinearRegression()
        model.fit(p_train.values.reshape(-1, 1), t_train.values)

        # Evaluate on test
        t_test = test[term].dropna()
        p_test = test.loc[t_test.index, "theoretical"]

        if len(t_test) < 5:
            continue

        y_pred = model.predict(p_test.values.reshape(-1, 1))
        test_r = float(np.corrcoef(t_test.values, y_pred)[0, 1])
        test_r2 = float(r2_score(t_test.values, y_pred))

        single_results.append({
            "term": term,
            "test_r": round(test_r, 4),
            "test_r2": round(test_r2, 4),
            "train_n": len(t_train),
            "test_n": len(t_test),
        })

    # --- Test pairs of terms (weighted average) ---
    # We combine terms by fitting: combined = w1*term1 + w2*term2 ~ theoretical
    for combo_size in [2, 3]:
        if len(term_names) < combo_size:
            break

        for combo in combinations(term_names, combo_size):
            # Check all terms have data
            combo_cols = list(combo)
            train_sub = train[combo_cols + ["theoretical"]].dropna()
            test_sub = test[combo_cols + ["theoretical"]].dropna()

            if len(train_sub) < 15 or len(test_sub) < 5:
                continue

            # Fit: theoretical ~ term1 + term2 + ... (reverse direction)
            # Actually: we want to find weights for combining terms to best
            # match the theoretical. Then test if this combined signal correlates
            # with theoretical on test set.
            X_train = train_sub[combo_cols].values
            y_train = train_sub["theoretical"].values
            X_test = test_sub[combo_cols].values
            y_test = test_sub["theoretical"].values

            model = LinearRegression()
            model.fit(X_train, y_train)

            y_pred = model.predict(X_test)
            test_r = float(np.corrcoef(y_test, y_pred)[0, 1])
            test_r2 = float(r2_score(y_test, y_pred))

            weights = {term: round(float(w), 4) for term, w in zip(combo, model.coef_)}

            combo_results.append({
                "terms": list(combo),
                "weights": weights,
                "test_r": round(test_r, 4),
                "test_r2": round(test_r2, 4),
                "train_n": len(train_sub),
                "test_n": len(test_sub),
            })

    # Sort by test_r descending
    single_results.sort(key=lambda x: abs(x["test_r"]), reverse=True)
    combo_results.sort(key=lambda x: abs(x["test_r"]), reverse=True)

    return {
        "individual_terms": single_results,
        "combinations": combo_results[:20],  # Top 20 combos
        "best_single": single_results[0] if single_results else None,
        "best_combo": combo_results[0] if combo_results else None,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Step 7 — Per-App Analysis
# ═══════════════════════════════════════════════════════════════════════════

def per_app_analysis(
    trends_data: dict[str, pd.DataFrame],
    theoretical: pd.Series,
    baseline: pd.Series,
) -> dict[str, Any]:
    """
    Separate analysis for each dating app to identify app-specific patterns.

    Some apps may have different seasonal patterns:
    - Bumble: May peak differently due to "women message first" positioning
    - Hinge: "Designed to be deleted" — may have different retention patterns
    - Happn: Location-based — may correlate more with urban mobility/weather
    - Tinder: Largest user base — likely closest to the general trend

    Args:
        trends_data: Dict of term -> DataFrame
        theoretical: Theoretical prediction series
        baseline: Sinusoidal baseline series

    Returns:
        Dict with per-app analysis results
    """
    print("\n" + "=" * 70)
    print("STEP 7: Per-App Analysis")
    print("=" * 70)

    app_results = {}

    for app in PRIMARY_TERMS:
        if app not in trends_data:
            print(f"  [SKIP] No data for {app}")
            continue

        df = trends_data[app]
        col = [c for c in df.columns if c != "isPartial"]
        if not col:
            continue

        actual = df[col[0]]
        actual.name = app

        # Align with theoretical
        aligned = pd.DataFrame({
            "actual": actual,
            "theoretical": theoretical,
            "baseline": baseline,
        }).dropna()

        if len(aligned) < 20:
            app_results[app] = {"error": f"Only {len(aligned)} aligned points"}
            continue

        print(f"\n  --- {app.upper()} ({len(aligned)} weeks) ---")

        # Correlations
        corr = compute_correlations(
            aligned["actual"], aligned["theoretical"], label=app
        )

        # Out-of-sample
        oos = out_of_sample_validation(
            aligned["actual"], aligned["theoretical"], aligned["baseline"], label=app
        )

        # Monthly pattern analysis: compute per-month average GT value
        monthly_actual = aligned["actual"].groupby(aligned.index.month).mean()
        monthly_theoretical = aligned["theoretical"].groupby(aligned.index.month).mean()

        # Which month peaks? (1-indexed)
        peak_month_actual = int(monthly_actual.idxmax())
        peak_month_theoretical = int(monthly_theoretical.idxmax())
        month_names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]

        app_results[app] = {
            "correlation": corr,
            "out_of_sample": oos,
            "peak_month_actual": month_names[peak_month_actual - 1],
            "peak_month_theoretical": month_names[peak_month_theoretical - 1],
            "peak_alignment": peak_month_actual == peak_month_theoretical,
            "monthly_pattern_actual": {
                month_names[m - 1]: round(float(v), 1) for m, v in monthly_actual.items()
            },
        }

        print(f"    Pearson r: {corr.get('pearson_r', 'N/A')}")
        print(f"    Peak month (actual): {month_names[peak_month_actual - 1]}")
        print(f"    Peak month (model):  {month_names[peak_month_theoretical - 1]}")

    return app_results


# ═══════════════════════════════════════════════════════════════════════════
# Step 8 — Plotting
# ═══════════════════════════════════════════════════════════════════════════

def plot_overlay_trends_vs_prediction(
    trends_data: dict[str, pd.DataFrame],
    theoretical: pd.Series,
    output_path: Path,
):
    """
    Main correlation chart: overlay Google Trends data with DatePulse prediction.

    Shows the primary terms (tinder, bumble, etc.) as thin colored lines,
    with the theoretical prediction as a thick dashed black line.
    """
    fig, axes = plt.subplots(2, 1, figsize=(16, 10), sharex=True)

    # Top panel: Raw overlay
    ax1 = axes[0]
    ax1.set_title("Google Trends vs DatePulse Theoretical Prediction (France)", fontsize=14, pad=10)

    colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"]
    color_idx = 0

    for term in PRIMARY_TERMS:
        if term not in trends_data:
            continue
        df = trends_data[term]
        col = [c for c in df.columns if c != "isPartial"]
        if col:
            ax1.plot(df.index, df[col[0]], label=f"GT: {term}", alpha=0.7,
                     linewidth=1.5, color=colors[color_idx % len(colors)])
            color_idx += 1

    # Normalize theoretical to 0-100 for visual comparison
    ax1.plot(theoretical.index, theoretical.values, label="DatePulse Model",
             linewidth=2.5, linestyle="--", color="black", alpha=0.9)

    ax1.set_ylabel("Interest / Score (0-100)", fontsize=11)
    ax1.legend(loc="upper right", fontsize=9)
    ax1.grid(True, alpha=0.3)
    ax1.set_ylim(0, 110)

    # Bottom panel: Scatter plot of model vs best single term
    ax2 = axes[1]
    best_term = None
    best_r = 0

    for term in PRIMARY_TERMS:
        if term not in trends_data:
            continue
        df = trends_data[term]
        col = [c for c in df.columns if c != "isPartial"]
        if not col:
            continue

        aligned = pd.DataFrame({
            "actual": df[col[0]],
            "theoretical": theoretical,
        }).dropna()

        if len(aligned) > 10:
            r, _ = scipy_stats.pearsonr(aligned["actual"], aligned["theoretical"])
            if abs(r) > abs(best_r):
                best_r = r
                best_term = term

    if best_term:
        df = trends_data[best_term]
        col = [c for c in df.columns if c != "isPartial"][0]
        aligned = pd.DataFrame({
            "actual": df[col],
            "theoretical": theoretical,
        }).dropna()

        ax2.scatter(aligned["theoretical"], aligned["actual"], alpha=0.5,
                    s=20, color="#FF6B6B", edgecolors="none")

        # Regression line
        z = np.polyfit(aligned["theoretical"], aligned["actual"], 1)
        p = np.poly1d(z)
        x_line = np.linspace(aligned["theoretical"].min(), aligned["theoretical"].max(), 100)
        ax2.plot(x_line, p(x_line), "k--", linewidth=1.5, alpha=0.7)

        ax2.set_title(
            f"Scatter: DatePulse Model vs GT '{best_term}' (r={best_r:.3f})",
            fontsize=13, pad=10
        )
        ax2.set_xlabel("DatePulse Theoretical Score", fontsize=11)
        ax2.set_ylabel(f"Google Trends '{best_term}'", fontsize=11)
        ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [PLOT] Saved: {output_path}")


def plot_per_app_correlation(
    trends_data: dict[str, pd.DataFrame],
    theoretical: pd.Series,
    output_path: Path,
):
    """
    Per-app correlation chart: 2x2 grid showing each app's monthly pattern
    compared to the theoretical prediction.
    """
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    axes = axes.flatten()
    month_names = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

    for idx, app in enumerate(PRIMARY_TERMS):
        ax = axes[idx]

        if app not in trends_data:
            ax.set_title(f"{app.capitalize()} — No Data", fontsize=12)
            ax.text(0.5, 0.5, "No data available", ha="center", va="center",
                    transform=ax.transAxes, fontsize=11, color="gray")
            continue

        df = trends_data[app]
        col = [c for c in df.columns if c != "isPartial"]
        if not col:
            continue

        actual = df[col[0]]

        # Align with theoretical
        aligned = pd.DataFrame({
            "actual": actual,
            "theoretical": theoretical,
        }).dropna()

        if len(aligned) < 12:
            ax.set_title(f"{app.capitalize()} — Insufficient Data", fontsize=12)
            continue

        # Monthly averages
        monthly_actual = aligned["actual"].groupby(aligned.index.month).mean()
        monthly_theo = aligned["theoretical"].groupby(aligned.index.month).mean()

        # Normalize both to 0-100 for visual comparison
        if monthly_actual.max() > monthly_actual.min():
            monthly_actual_norm = (
                (monthly_actual - monthly_actual.min())
                / (monthly_actual.max() - monthly_actual.min()) * 100
            )
        else:
            monthly_actual_norm = monthly_actual

        if monthly_theo.max() > monthly_theo.min():
            monthly_theo_norm = (
                (monthly_theo - monthly_theo.min())
                / (monthly_theo.max() - monthly_theo.min()) * 100
            )
        else:
            monthly_theo_norm = monthly_theo

        x = np.arange(12) + 1
        width = 0.35

        ax.bar(x - width / 2, monthly_actual_norm.reindex(x).values,
               width, label="Google Trends", color="#FF6B6B", alpha=0.8)
        ax.bar(x + width / 2, monthly_theo_norm.reindex(x).values,
               width, label="DatePulse Model", color="#4ECDC4", alpha=0.8)

        # Compute correlation
        r_val = "N/A"
        try:
            r, _ = scipy_stats.pearsonr(
                monthly_actual_norm.reindex(x).values,
                monthly_theo_norm.reindex(x).values,
            )
            r_val = f"{r:.3f}"
        except Exception:
            pass

        ax.set_title(f"{app.capitalize()} (monthly r = {r_val})", fontsize=12)
        ax.set_xticks(x)
        ax.set_xticklabels(month_names)
        ax.set_ylabel("Normalized Score")
        ax.legend(fontsize=8)
        ax.grid(True, alpha=0.2, axis="y")

    fig.suptitle("Per-App Monthly Patterns: Google Trends vs DatePulse Model",
                 fontsize=14, y=1.02)
    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [PLOT] Saved: {output_path}")


def plot_residuals(
    trends_data: dict[str, pd.DataFrame],
    theoretical: pd.Series,
    output_path: Path,
):
    """
    Residuals analysis plot: shows the difference between actual and predicted
    over time, plus residual distribution histogram.
    """
    # Use the best-correlated primary term
    best_term = None
    best_r = 0
    best_aligned = None

    for term in PRIMARY_TERMS:
        if term not in trends_data:
            continue
        df = trends_data[term]
        col = [c for c in df.columns if c != "isPartial"]
        if not col:
            continue

        aligned = pd.DataFrame({
            "actual": df[col[0]],
            "theoretical": theoretical,
        }).dropna()

        if len(aligned) > 10:
            r, _ = scipy_stats.pearsonr(aligned["actual"], aligned["theoretical"])
            if abs(r) > abs(best_r):
                best_r = r
                best_term = term
                best_aligned = aligned

    if best_aligned is None or len(best_aligned) < 10:
        print("  [SKIP] Not enough data for residuals plot")
        return

    # Fit linear model to compute residuals
    model = LinearRegression()
    X = best_aligned["theoretical"].values.reshape(-1, 1)
    y = best_aligned["actual"].values
    model.fit(X, y)
    y_pred = model.predict(X)
    residuals = y - y_pred

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # Top-left: Residuals over time
    ax1 = axes[0, 0]
    ax1.plot(best_aligned.index, residuals, color="#FF6B6B", alpha=0.7, linewidth=1)
    ax1.axhline(y=0, color="black", linestyle="--", alpha=0.5)
    ax1.fill_between(best_aligned.index, residuals, 0, alpha=0.2, color="#FF6B6B")
    ax1.set_title(f"Residuals Over Time ({best_term})", fontsize=12)
    ax1.set_ylabel("Residual (Actual - Predicted)")
    ax1.grid(True, alpha=0.3)
    ax1.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    ax1.xaxis.set_major_locator(mdates.MonthLocator(interval=6))
    plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45)

    # Top-right: Residual histogram
    ax2 = axes[0, 1]
    ax2.hist(residuals, bins=30, color="#4ECDC4", alpha=0.7, edgecolor="white")
    ax2.axvline(x=0, color="black", linestyle="--", alpha=0.5)
    ax2.set_title("Residual Distribution", fontsize=12)
    ax2.set_xlabel("Residual Value")
    ax2.set_ylabel("Frequency")

    # Normality test
    if len(residuals) > 8:
        _, normality_p = scipy_stats.shapiro(residuals[:5000])  # Shapiro limit
        ax2.text(0.05, 0.95, f"Shapiro-Wilk p={normality_p:.4f}",
                 transform=ax2.transAxes, fontsize=9, verticalalignment="top")

    # Bottom-left: QQ plot
    ax3 = axes[1, 0]
    scipy_stats.probplot(residuals, dist="norm", plot=ax3)
    ax3.set_title("Q-Q Plot (Normality Check)", fontsize=12)
    ax3.grid(True, alpha=0.3)

    # Bottom-right: Residuals vs predicted (heteroscedasticity check)
    ax4 = axes[1, 1]
    ax4.scatter(y_pred, residuals, alpha=0.4, s=15, color="#45B7D1", edgecolors="none")
    ax4.axhline(y=0, color="black", linestyle="--", alpha=0.5)
    ax4.set_title("Residuals vs Predicted (Heteroscedasticity)", fontsize=12)
    ax4.set_xlabel("Predicted Value")
    ax4.set_ylabel("Residual")
    ax4.grid(True, alpha=0.3)

    fig.suptitle(f"Residual Analysis: DatePulse Model vs GT '{best_term}' (r={best_r:.3f})",
                 fontsize=14, y=1.02)
    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [PLOT] Saved: {output_path}")


def plot_cross_correlation(
    trends_data: dict[str, pd.DataFrame],
    theoretical: pd.Series,
    output_path: Path,
    max_lag: int = 12,
):
    """
    Cross-correlation function plot for each primary app.
    Shows the correlation at different lag values (in weeks).
    """
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    axes = axes.flatten()

    for idx, app in enumerate(PRIMARY_TERMS):
        ax = axes[idx]

        if app not in trends_data:
            ax.set_title(f"{app.capitalize()} — No Data", fontsize=12)
            continue

        df = trends_data[app]
        col = [c for c in df.columns if c != "isPartial"]
        if not col:
            continue

        aligned = pd.DataFrame({
            "actual": df[col[0]],
            "theoretical": theoretical,
        }).dropna()

        if len(aligned) < 2 * max_lag:
            ax.set_title(f"{app.capitalize()} — Insufficient Data", fontsize=12)
            continue

        a = aligned["actual"].values
        p = aligned["theoretical"].values

        # Normalize
        a_norm = (a - a.mean()) / (a.std() + 1e-10)
        p_norm = (p - p.mean()) / (p.std() + 1e-10)

        lags = list(range(-max_lag, max_lag + 1))
        correlations = []

        for lag in lags:
            if lag >= 0:
                corr = np.corrcoef(a_norm[lag:], p_norm[:len(a_norm) - lag])[0, 1]
            else:
                corr = np.corrcoef(a_norm[:len(a_norm) + lag], p_norm[-lag:])[0, 1]
            correlations.append(corr)

        # Plot bars
        colors_bar = ["#4ECDC4" if c >= 0 else "#FF6B6B" for c in correlations]
        ax.bar(lags, correlations, color=colors_bar, alpha=0.7, edgecolor="white")
        ax.axhline(y=0, color="black", linewidth=0.5)
        ax.axvline(x=0, color="black", linewidth=0.5, linestyle="--")

        # Mark the optimal lag
        opt_idx = np.argmax(np.abs(correlations))
        ax.bar(lags[opt_idx], correlations[opt_idx], color="#FFD700",
               edgecolor="black", linewidth=1.5)

        # Significance bounds (approximate 95% CI for white noise)
        n = len(aligned)
        sig_bound = 1.96 / np.sqrt(n)
        ax.axhline(y=sig_bound, color="gray", linestyle=":", alpha=0.5)
        ax.axhline(y=-sig_bound, color="gray", linestyle=":", alpha=0.5)

        ax.set_title(f"{app.capitalize()} (optimal lag: {lags[opt_idx]}w)", fontsize=12)
        ax.set_xlabel("Lag (weeks)")
        ax.set_ylabel("Cross-Correlation")
        ax.grid(True, alpha=0.2, axis="y")

    fig.suptitle("Cross-Correlation: DatePulse Model vs Google Trends (by App)",
                 fontsize=14, y=1.02)
    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [PLOT] Saved: {output_path}")


# ═══════════════════════════════════════════════════════════════════════════
# Report Generation
# ═══════════════════════════════════════════════════════════════════════════

def print_report(report: dict[str, Any]):
    """Print a human-readable summary of the validation results to stdout."""

    print("\n")
    print("=" * 70)
    print("DATEPULSE CORRELATION VALIDATION REPORT")
    print("=" * 70)
    print(f"Generated: {datetime.now().isoformat()}")
    print(f"Period: {START_YEAR}-01 to {END_YEAR}-02")
    print(f"Geography: France (FR)")
    print()

    # --- Overall Correlations ---
    print("-" * 70)
    print("OVERALL CORRELATIONS (Full Period)")
    print("-" * 70)
    print(f"{'Term':<30} {'Pearson r':>10} {'Spearman rho':>14} {'R-squared':>10} {'N':>6}")
    print("-" * 70)

    for result in report.get("correlations", []):
        if "error" in result:
            print(f"{result['label']:<30} {'ERROR':>10}")
            continue
        print(
            f"{result['label']:<30} "
            f"{result['pearson_r']:>10.4f} "
            f"{result['spearman_rho']:>14.4f} "
            f"{result['r_squared']:>10.4f} "
            f"{result['n_points']:>6d}"
        )

    # --- Out-of-Sample Results ---
    print()
    print("-" * 70)
    print("OUT-OF-SAMPLE VALIDATION (Train: 2021-2023, Test: 2024-2025)")
    print("-" * 70)
    print(f"{'Term':<25} {'Model r':>9} {'Model R2':>10} {'RMSE':>8} {'Baseline R2':>12} {'Beats?':>8}")
    print("-" * 70)

    for result in report.get("out_of_sample", []):
        if "error" in result:
            print(f"{result['label']:<25} {'ERROR':>9}")
            continue
        m = result["model"]
        b = result["baseline_sinusoid"]
        beats = "YES" if result["model_beats_baseline"] else "no"
        print(
            f"{result['label']:<25} "
            f"{m['test_r']:>9.4f} "
            f"{m['test_r2']:>10.4f} "
            f"{m['test_rmse']:>8.2f} "
            f"{b['test_r2']:>12.4f} "
            f"{beats:>8}"
        )

    # --- Per-App Analysis ---
    print()
    print("-" * 70)
    print("PER-APP ANALYSIS")
    print("-" * 70)

    for app, data in report.get("per_app", {}).items():
        if "error" in data:
            print(f"  {app.upper()}: {data['error']}")
            continue

        corr = data.get("correlation", {})
        print(f"\n  {app.upper()}:")
        print(f"    Pearson r:     {corr.get('pearson_r', 'N/A')}")
        print(f"    Spearman rho:  {corr.get('spearman_rho', 'N/A')}")
        print(f"    Peak month (actual):      {data.get('peak_month_actual', 'N/A')}")
        print(f"    Peak month (theoretical): {data.get('peak_month_theoretical', 'N/A')}")
        print(f"    Peak aligned:  {data.get('peak_alignment', 'N/A')}")

    # --- Statistical Rigor ---
    print()
    print("-" * 70)
    print("STATISTICAL RIGOR TESTS")
    print("-" * 70)

    for test_result in report.get("statistical_tests", []):
        label = test_result.get("label", "unknown")
        print(f"\n  {label.upper()}:")

        # Stationarity
        for key in ["stationarity_actual", "stationarity_predicted"]:
            st = test_result.get(key, {})
            name = st.get("name", key)
            if "error" in st:
                print(f"    ADF ({name}): ERROR - {st['error']}")
            else:
                status = "STATIONARY" if st.get("is_stationary") else "NON-STATIONARY"
                print(f"    ADF ({name}): p={st.get('p_value', 'N/A')} -> {status}")

        # Cross-correlation
        cc = test_result.get("cross_correlation", {})
        if "error" not in cc:
            print(f"    Cross-corr optimal lag: {cc.get('optimal_lag_weeks', 'N/A')} weeks")
            print(f"    Cross-corr at lag 0:    {cc.get('zero_lag_correlation', 'N/A')}")
            print(f"    Interpretation:         {cc.get('interpretation', 'N/A')}")

        # Granger causality
        gc = test_result.get("granger_causality", {})
        pred_cause = gc.get("predicted_causes_actual", {})
        if "error" not in pred_cause:
            sig = "YES" if pred_cause.get("significant_at_any_lag") else "no"
            print(f"    Granger (model -> actual): significant = {sig}")
            print(f"      Best lag: {pred_cause.get('best_lag', 'N/A')}, "
                  f"p={pred_cause.get('best_p_value', 'N/A')}")

        # Detrended correlations
        dt = test_result.get("detrended_correlations", {})
        if "error" not in dt:
            for method, vals in dt.items():
                if isinstance(vals, dict) and "pearson_r" in vals:
                    sig = "*" if vals.get("significant") else ""
                    print(f"    Detrended ({method}): r={vals['pearson_r']}{sig}")

    # --- Term Optimization ---
    opt = report.get("term_optimization", {})
    if opt and "error" not in opt:
        print()
        print("-" * 70)
        print("TERM OPTIMIZATION")
        print("-" * 70)

        best_single = opt.get("best_single")
        if best_single:
            print(f"\n  Best single term: '{best_single['term']}'")
            print(f"    Test r:  {best_single['test_r']}")
            print(f"    Test R2: {best_single['test_r2']}")

        best_combo = opt.get("best_combo")
        if best_combo:
            print(f"\n  Best combination: {best_combo['terms']}")
            print(f"    Weights: {best_combo['weights']}")
            print(f"    Test r:  {best_combo['test_r']}")
            print(f"    Test R2: {best_combo['test_r2']}")

    # --- Conclusion ---
    print()
    print("=" * 70)
    print("CONCLUSION")
    print("=" * 70)

    # Summarize findings
    all_correlations = report.get("correlations", [])
    valid_corrs = [r for r in all_correlations if "pearson_r" in r]

    if valid_corrs:
        avg_r = np.mean([r["pearson_r"] for r in valid_corrs])
        max_r = max(r["pearson_r"] for r in valid_corrs)
        best_term_label = next(r["label"] for r in valid_corrs if r["pearson_r"] == max_r)

        print(f"  Average Pearson r across all terms: {avg_r:.4f}")
        print(f"  Best correlation: r={max_r:.4f} ('{best_term_label}')")

        if avg_r > 0.7:
            print("  VERDICT: STRONG correlation. The DatePulse model captures real patterns.")
        elif avg_r > 0.4:
            print("  VERDICT: MODERATE correlation. The model captures broad trends but misses details.")
        elif avg_r > 0.2:
            print("  VERDICT: WEAK correlation. The model needs significant refinement.")
        else:
            print("  VERDICT: NO meaningful correlation. The hypothesis is not supported.")
    else:
        print("  No valid correlation data available.")

    print()
    print(f"Full report saved to: {OUTPUT_DIR / 'correlation_report.json'}")
    print("=" * 70)


# ═══════════════════════════════════════════════════════════════════════════
# Main Entry Point
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """
    Main entry point for the DatePulse correlation validation script.

    Workflow:
    1. Check for cached data (skip re-fetching if available)
    2. Fetch Google Trends data (with rate limiting and retries)
    3. Build theoretical predictions
    4. Run full correlation analysis
    5. Run out-of-sample validation
    6. Run statistical rigor tests
    7. Optimize term combinations
    8. Per-app analysis
    9. Generate plots and JSON report
    """
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("DatePulse Correlation Validation")
    print(f"Started: {datetime.now().isoformat()}")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 70)

    # ── Step 1: Fetch or load Google Trends data ──

    # Check for cached data first (to avoid unnecessary API calls)
    trends_data = load_cached_trends_data()

    if not trends_data:
        print("\n[INFO] No cached data found. Fetching from Google Trends...")
        print("[WARN] This will take several minutes due to rate limiting.")
        print("[HINT] Cached CSVs will be saved for future re-runs.\n")

        try:
            trends_data = fetch_all_trends_data()
        except ImportError:
            print("\n[ERROR] pytrends is not installed. Install it with:")
            print("  pip install -r scripts/requirements-validation.txt")
            sys.exit(1)
        except Exception as e:
            print(f"\n[ERROR] Failed to fetch Google Trends data: {e}")
            print("[HINT] This might be due to rate limiting. Wait a few minutes and retry.")
            print("[HINT] If you have cached CSVs, place them in scripts/output_us/gt_raw_*.csv")
            sys.exit(1)
    else:
        print(f"\n[INFO] Using {len(trends_data)} cached datasets. "
              "Delete scripts/output_us/gt_raw_*.csv to force re-fetch.")

    if not trends_data:
        print("\n[FATAL] No data available. Cannot proceed with validation.")
        sys.exit(1)

    # ── Step 2: Build theoretical predictions ──

    print("\n" + "=" * 70)
    print("STEP 2: Building Theoretical Predictions")
    print("=" * 70)

    # Get the union of all date indices from the trends data
    all_dates = pd.DatetimeIndex([])
    for term, df in trends_data.items():
        all_dates = all_dates.union(df.index)
    all_dates = all_dates.sort_values()

    theoretical = build_theoretical_series(all_dates)
    baseline = build_sinusoid_baseline(all_dates)

    print(f"  Theoretical series: {len(theoretical)} weekly points")
    print(f"  Date range: {all_dates[0].strftime('%Y-%m-%d')} to {all_dates[-1].strftime('%Y-%m-%d')}")
    print(f"  Score range: {theoretical.min():.1f} to {theoretical.max():.1f}")

    # Save theoretical series to CSV
    theo_df = pd.DataFrame({
        "theoretical": theoretical,
        "baseline_sinusoid": baseline,
    })
    theo_df.to_csv(OUTPUT_DIR / "theoretical_predictions.csv")
    print(f"  [SAVED] {OUTPUT_DIR / 'theoretical_predictions.csv'}")

    # ── Step 3: Correlation Analysis ──

    print("\n" + "=" * 70)
    print("STEP 3: Correlation Analysis")
    print("=" * 70)

    all_correlations = []

    for term, df in trends_data.items():
        col = [c for c in df.columns if c != "isPartial"]
        if not col:
            continue

        actual = df[col[0]]
        actual.name = term

        # Align actual with theoretical using the intersection of indices
        aligned = pd.DataFrame({
            "actual": actual,
            "theoretical": theoretical,
        }).dropna()

        if len(aligned) < 10:
            print(f"  [SKIP] '{term}': only {len(aligned)} aligned points")
            continue

        corr = compute_correlations(
            aligned["actual"], aligned["theoretical"], label=term
        )
        all_correlations.append(corr)
        print(f"  '{term}': r={corr.get('pearson_r', 'N/A')}, "
              f"rho={corr.get('spearman_rho', 'N/A')}, "
              f"R2={corr.get('r_squared', 'N/A')}, "
              f"n={corr.get('n_points', 0)}")

    # ── Step 4: Out-of-Sample Validation ──

    print("\n" + "=" * 70)
    print("STEP 4: Out-of-Sample Validation")
    print("=" * 70)

    all_oos = []

    for term, df in trends_data.items():
        col = [c for c in df.columns if c != "isPartial"]
        if not col:
            continue

        actual = df[col[0]]
        aligned = pd.DataFrame({
            "actual": actual,
            "theoretical": theoretical,
            "baseline": baseline,
        }).dropna()

        if len(aligned) < 30:
            continue

        oos = out_of_sample_validation(
            aligned["actual"],
            aligned["theoretical"],
            aligned["baseline"],
            label=term,
        )
        all_oos.append(oos)

        if "error" not in oos:
            m = oos["model"]
            beats = "BEATS baseline" if oos["model_beats_baseline"] else "loses to baseline"
            print(f"  '{term}': test_r={m['test_r']}, test_R2={m['test_r2']}, "
                  f"RMSE={m['test_rmse']} ({beats})")

    # ── Step 5: Statistical Rigor Tests ──

    print("\n" + "=" * 70)
    print("STEP 5: Statistical Rigor Tests")
    print("=" * 70)

    all_stat_tests = []

    # Run detailed tests only for primary terms to keep runtime reasonable
    for term in PRIMARY_TERMS:
        if term not in trends_data:
            continue

        df = trends_data[term]
        col = [c for c in df.columns if c != "isPartial"]
        if not col:
            continue

        actual = df[col[0]]
        aligned = pd.DataFrame({
            "actual": actual,
            "theoretical": theoretical,
        }).dropna()

        if len(aligned) < 30:
            continue

        print(f"\n  --- {term.upper()} ---")
        tests = run_statistical_rigor_tests(
            aligned["actual"], aligned["theoretical"], label=term
        )
        all_stat_tests.append(tests)

        # Print summary
        st_a = tests["stationarity_actual"]
        st_p = tests["stationarity_predicted"]
        if "error" not in st_a:
            status = "stationary" if st_a["is_stationary"] else "NON-STATIONARY"
            print(f"    ADF (actual):    p={st_a['p_value']:.6f} -> {status}")
        if "error" not in st_p:
            status = "stationary" if st_p["is_stationary"] else "NON-STATIONARY"
            print(f"    ADF (predicted): p={st_p['p_value']:.6f} -> {status}")

        cc = tests["cross_correlation"]
        if "error" not in cc:
            print(f"    Optimal lag: {cc['optimal_lag_weeks']} weeks "
                  f"(r={cc['optimal_correlation']})")

        dt = tests["detrended_correlations"]
        if "error" not in dt:
            for method, vals in dt.items():
                if isinstance(vals, dict) and "pearson_r" in vals:
                    print(f"    Detrended ({method}): r={vals['pearson_r']}")

    # ── Step 6: Term Optimization ──

    term_optimization = optimize_term_combinations(trends_data, theoretical)

    # ── Step 7: Per-App Analysis ──

    app_results = per_app_analysis(trends_data, theoretical, baseline)

    # ── Step 8: Generate Outputs ──

    print("\n" + "=" * 70)
    print("STEP 8: Generating Outputs")
    print("=" * 70)

    # Build the complete report
    report = {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "period": f"{START_YEAR}-01 to {END_YEAR}-02",
            "geography": "France (FR)",
            "n_terms_fetched": len(trends_data),
            "terms": list(trends_data.keys()),
        },
        "lookup_tables": {
            "hourly_index": HOURLY_INDEX,
            "weekly_index": WEEKLY_INDEX,
            "monthly_index": MONTHLY_INDEX,
        },
        "correlations": all_correlations,
        "out_of_sample": all_oos,
        "statistical_tests": all_stat_tests,
        "term_optimization": term_optimization,
        "per_app": app_results,
    }

    # Save JSON report
    report_path = OUTPUT_DIR / "correlation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str, ensure_ascii=False)
    print(f"  [SAVED] {report_path}")

    # Generate plots
    print("\n  Generating plots...")

    plot_overlay_trends_vs_prediction(
        trends_data, theoretical,
        OUTPUT_DIR / "overlay_trends_vs_prediction.png",
    )

    plot_per_app_correlation(
        trends_data, theoretical,
        OUTPUT_DIR / "per_app_correlation.png",
    )

    plot_residuals(
        trends_data, theoretical,
        OUTPUT_DIR / "residuals.png",
    )

    plot_cross_correlation(
        trends_data, theoretical,
        OUTPUT_DIR / "cross_correlation.png",
    )

    # Print human-readable report to stdout
    print_report(report)

    print(f"\nCompleted: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
