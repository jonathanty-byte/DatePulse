"""
Extract real seasonal patterns from cached Google Trends CSV files.

Reads weekly GT data for tinder, bumble, hinge, happn (FR region, 2021-2025),
computes average monthly and weekly (day-of-week) indices normalized to 0-100,
and compares with the current hardcoded MONTHLY_INDEX in the scoring model.
"""

import pandas as pd
import numpy as np
from pathlib import Path

# -- Configuration ----------------------------------------------------------
BASE_DIR = Path(r"C:\Users\jonat\projects\DatePulse\scripts\output")
APPS = ["tinder", "bumble", "hinge", "happn"]
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# Current model values (month 0=Jan .. 11=Dec)
CURRENT_MODEL = {
    0: 100, 1: 90, 2: 75, 3: 70, 4: 65, 5: 60,
    6: 60, 7: 50, 8: 75, 9: 80, 10: 85, 11: 65
}


def load_csv(app):
    path = BASE_DIR / f"gt_raw_{app}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing: {path}")
    df = pd.read_csv(path, parse_dates=["date"])
    value_col = [c for c in df.columns if c != "date"][0]
    df = df.rename(columns={value_col: "value"})
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    return df


def compute_monthly_index(df, filter_years=range(2021, 2026)):
    mask = df["date"].dt.year.isin(filter_years)
    filtered = df[mask].copy()
    filtered["month"] = filtered["date"].dt.month
    monthly_avg = filtered.groupby("month")["value"].mean()
    max_val = monthly_avg.max()
    if max_val == 0:
        return {m - 1: 0 for m in range(1, 13)}
    normalized = (monthly_avg / max_val * 100).round(1)
    return {m - 1: normalized.get(m, 0) for m in range(1, 13)}


def compute_week_of_year_pattern(df, filter_years=range(2021, 2026)):
    mask = df["date"].dt.year.isin(filter_years)
    filtered = df[mask].copy()
    filtered["isoweek"] = filtered["date"].dt.isocalendar().week.astype(int)
    filtered = filtered[filtered["isoweek"] <= 52]
    weekly_avg = filtered.groupby("isoweek")["value"].mean()
    max_val = weekly_avg.max()
    if max_val == 0:
        return weekly_avg
    return (weekly_avg / max_val * 100).round(1)


def main():
    print("=" * 80)
    print("  DATEPULSE - Real Google Trends Seasonal Patterns (FR, 2021-2025)")
    print("=" * 80)

    all_monthly = {}
    all_weekly_year = {}

    for app in APPS:
        print(f"\n{'~' * 80}")
        print(f"  Loading: gt_raw_{app}.csv")
        df = load_csv(app)
        date_range = f"{df['date'].min().date()} to {df['date'].max().date()}"
        print(f"  Date range: {date_range}  |  Data points: {len(df)}")
        monthly = compute_monthly_index(df)
        all_monthly[app] = monthly
        woy = compute_week_of_year_pattern(df)
        all_weekly_year[app] = woy

    # Monthly indices per app
    print(f"\n\n{'=' * 80}")
    print("  MONTHLY INDEX (0-100, normalized per app, max month = 100)")
    print("=" * 80)

    header = f"{'Month':<6}" + "".join(f"{app:>10}" for app in APPS) + f"{'  AVG':>10}"
    print(f"\n  {header}")
    print(f"  {'-' * len(header)}")

    avg_monthly = {}
    for m in range(12):
        values = [all_monthly[app][m] for app in APPS]
        avg = round(np.mean(values), 1)
        avg_monthly[m] = avg
        row = f"  {MONTH_NAMES[m]:<6}"
        for v in values:
            row += f"{v:>10.1f}"
        row += f"{avg:>10.1f}"
        print(row)

    # Peak months
    print(f"\n\n{'=' * 80}")
    print("  PEAK MONTHS PER APP")
    print("=" * 80)

    for app in APPS:
        monthly = all_monthly[app]
        peak_m = max(monthly, key=monthly.get)
        print(f"  {app:<10} -> {MONTH_NAMES[peak_m]} (month {peak_m}) = {monthly[peak_m]:.1f}")

    avg_peak = max(avg_monthly, key=avg_monthly.get)
    print(f"  {'AVERAGE':<10} -> {MONTH_NAMES[avg_peak]} (month {avg_peak}) = {avg_monthly[avg_peak]:.1f}")

    # Comparison
    print(f"\n\n{'=' * 80}")
    print("  COMPARISON: Current Model vs Real GT Average")
    print("=" * 80)

    max_avg = max(avg_monthly.values())
    avg_normalized = {m: round(v / max_avg * 100, 1) for m, v in avg_monthly.items()}

    header2 = f"{'Month':<6}{'Model':>10}{'Real GT':>10}{'Delta':>10}"
    print(f"\n  {header2}")
    print(f"  {'-' * len(header2)}")

    for m in range(12):
        model_v = CURRENT_MODEL[m]
        real_v = avg_normalized[m]
        delta = round(real_v - model_v, 1)
        sign = "+" if delta > 0 else ""
        print(f"  {MONTH_NAMES[m]:<6}{model_v:>10.0f}{real_v:>10.1f}{sign + str(delta):>10}")

    # Proposed new MONTHLY_INDEX
    print(f"\n\n{'=' * 80}")
    print("  PROPOSED NEW MONTHLY_INDEX (based on real GT data, rounded)")
    print("=" * 80)

    proposed = {m: int(round(avg_normalized[m])) for m in range(12)}
    print("\n  MONTHLY_INDEX = {")
    for m in range(12):
        comma = "," if m < 11 else ""
        print(f"      {m}: {proposed[m]:>3}{comma}  # {MONTH_NAMES[m]}")
    print("  }")

    # Week-of-year highlights
    print(f"\n\n{'=' * 80}")
    print("  WEEK-OF-YEAR HIGHLIGHTS (averaged across all apps)")
    print("=" * 80)

    all_weeks = pd.DataFrame(all_weekly_year)
    avg_woy = all_weeks.mean(axis=1)
    max_woy = avg_woy.max()
    avg_woy_norm = (avg_woy / max_woy * 100).round(1)

    print(f"\n  TOP 5 WEEKS (highest activity):")
    for week, val in avg_woy_norm.nlargest(5).items():
        approx_month = MONTH_NAMES[min(11, (int(week) - 1) * 12 // 52)]
        print(f"    Week {int(week):>2} (~{approx_month}) = {val:.1f}")

    print(f"\n  BOTTOM 5 WEEKS (lowest activity):")
    for week, val in avg_woy_norm.nsmallest(5).items():
        approx_month = MONTH_NAMES[min(11, (int(week) - 1) * 12 // 52)]
        print(f"    Week {int(week):>2} (~{approx_month}) = {val:.1f}")

    # Day-of-week note
    print(f"\n\n{'=' * 80}")
    print("  NOTE ON DAY-OF-WEEK PATTERNS")
    print("=" * 80)
    print("\n  Google Trends weekly data provides one data point per week (always on Sunday).")
    print("  Therefore, we CANNOT extract day-of-week patterns from this data.")
    print("  For day-of-week patterns, you would need:")
    print("  - Google Trends daily resolution (only available for <90 day ranges)")
    print("  - Or another data source (App Store reviews, Wikipedia daily pageviews, etc.)")

    # Raw monthly averages
    print(f"\n\n{'=' * 80}")
    print("  RAW MONTHLY AVERAGES (before normalization)")
    print("=" * 80)

    for app in APPS:
        df = load_csv(app)
        mask = df["date"].dt.year.isin(range(2021, 2026))
        filtered = df[mask].copy()
        filtered["month"] = filtered["date"].dt.month
        monthly_raw = filtered.groupby("month")["value"].mean().round(1)
        print(f"\n  {app}:")
        for m in range(1, 13):
            bar = "#" * int(monthly_raw.get(m, 0) / 2)
            print(f"    {MONTH_NAMES[m-1]}: {monthly_raw.get(m, 0):>6.1f}  {bar}")


if __name__ == "__main__":
    main()
