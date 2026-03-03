#!/usr/bin/env python3
"""
Detailed Google Trends analysis script.

Reads cached GT CSVs for Tinder, Bumble, Hinge, Happn and produces:
1. Raw yearly averages (growth/decline detection)
2. Detrended seasonal patterns (52-week moving average removal)
3. Raw vs detrended monthly comparison
4. Year-by-year monthly patterns for Tinder (consistency check)
"""

import sys
import calendar
import pandas as pd
import numpy as np
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR / "output"

APPS = {
    "tinder": OUTPUT_DIR / "gt_raw_tinder.csv",
    "bumble": OUTPUT_DIR / "gt_raw_bumble.csv",
    "hinge": OUTPUT_DIR / "gt_raw_hinge.csv",
    "happn": OUTPUT_DIR / "gt_raw_happn.csv",
}

YEARS = [2021, 2022, 2023, 2024, 2025]
MONTHS = list(range(1, 13))
MONTH_NAMES = [calendar.month_abbr[m] for m in MONTHS]


def load_app_data(app_name, csv_path):
    df = pd.read_csv(csv_path, parse_dates=["date"], index_col="date")
    df.columns = [app_name]
    return df.sort_index()


def psep(c="=", w=90):
    print(c * w)


def phdr(title, w=90):
    print()
    psep("=", w)
    print(f"  {title}")
    psep("=", w)


def fmt(val, d=1):
    if pd.isna(val):
        return "   -  "
    return f"{val:6.{d}f}"


def compute_yearly_averages(data):
    rows = []
    for app, df in data.items():
        for year in YEARS:
            mask = df.index.year == year
            avg = df.loc[mask].iloc[:, 0].mean() if mask.any() else np.nan
            rows.append({"app": app, "year": year, "avg": avg})
    return pd.DataFrame(rows)


def print_yearly_averages(yearly):
    phdr("1. RAW YEARLY AVERAGES  (growth / decline detection)")
    pivot = yearly.pivot(index="app", columns="year", values="avg")
    yc = "  ".join(f"{y:>8}" for y in YEARS)
    hdr = "App"
    print(f"{hdr:<10}  {yc}  {'Trend':>10}")
    print("-" * 80)
    for app in APPS:
        vals = [pivot.loc[app, y] if y in pivot.columns else np.nan for y in YEARS]
        vs = "  ".join(fmt(v) for v in vals)
        valid = [(y, v) for y, v in zip(YEARS, vals) if not pd.isna(v)]
        if len(valid) >= 2:
            pct = ((valid[-1][1] - valid[0][1]) / valid[0][1]) * 100
            trend = f"{pct:+.0f}%"
        else:
            trend = "?"
        print(f"{app:<10}  {vs}  {trend:>10}")


def compute_monthly_raw(df, col):
    return df.groupby(df.index.month)[col].mean()


def compute_monthly_detrended(df, col):
    series = df[col].astype(float)
    trend = series.rolling(window=52, center=True, min_periods=26).mean()
    ratio = series / trend
    ratio = ratio.replace([np.inf, -np.inf], np.nan)
    monthly_ratio = ratio.groupby(df.index.month).mean()
    min_r, max_r = monthly_ratio.min(), monthly_ratio.max()
    if max_r - min_r > 0:
        return (monthly_ratio - min_r) / (max_r - min_r) * 100
    return pd.Series(50.0, index=monthly_ratio.index)


def print_monthly_comparison(data):
    phdr("2. RAW MONTHLY AVERAGES  (contaminated by trend)")
    mh = "  ".join(f"{m:>6}" for m in MONTH_NAMES)
    print(f"{'App':<10}  {mh}")
    print("-" * 100)
    for app, df in data.items():
        raw = compute_monthly_raw(df, app)
        vals = "  ".join(fmt(raw.get(m, np.nan)) for m in MONTHS)
        print(f"{app:<10}  {vals}")

    phdr("3. DETRENDED MONTHLY SEASONAL INDEX  (0-100, trend removed)")
    print(f"{'App':<10}  {mh}")
    print("-" * 100)
    for app, df in data.items():
        dt = compute_monthly_detrended(df, app)
        vals = "  ".join(fmt(dt.get(m, np.nan)) for m in MONTHS)
        print(f"{app:<10}  {vals}")

    print()
    print("  Peak & trough months (detrended):")
    for app, df in data.items():
        dt = compute_monthly_detrended(df, app)
        pk = dt.idxmax()
        tr = dt.idxmin()
        print(f"    {app:<10}  Peak: {calendar.month_name[pk]:<12}  "
              f"Trough: {calendar.month_name[tr]:<12}")


def print_raw_vs_detrended(data):
    phdr("4. COMPARISON: RAW vs DETRENDED monthly index (both 0-100)")
    for app, df in data.items():
        raw = compute_monthly_raw(df, app)
        rn = (raw - raw.min()) / (raw.max() - raw.min()) * 100
        dt = compute_monthly_detrended(df, app)
        print()
        print(f"  --- {app.upper()} ---")
        print(f"  {'Month':<10} {'Raw(0-100)':>12} {'Detrended(0-100)':>18} {'Delta':>10}")
        print(f"  {'-'*55}")
        for m in MONTHS:
            r = rn.get(m, np.nan)
            d = dt.get(m, np.nan)
            delta = d - r if not (pd.isna(r) or pd.isna(d)) else np.nan
            print(f"  {calendar.month_abbr[m]:<10} {fmt(r):>12} {fmt(d):>18} {fmt(delta):>10}")


def print_tinder_yearly_monthly(df_tinder):
    phdr("5. TINDER: YEAR-BY-YEAR MONTHLY AVERAGES  (consistency check)")
    mh = "  ".join(f"{m:>6}" for m in MONTH_NAMES)
    print(f"{'Year':<8}  {mh}  {'StdDev':>8}")
    print("-" * 110)

    ym = {}
    for year in YEARS:
        mask = df_tinder.index.year == year
        sub = df_tinder.loc[mask]
        if sub.empty:
            continue
        monthly = sub.groupby(sub.index.month)["tinder"].mean()
        ym[year] = monthly
        vals = "  ".join(fmt(monthly.get(m, np.nan)) for m in MONTHS)
        vv = [monthly.get(m, np.nan) for m in MONTHS if not pd.isna(monthly.get(m, np.nan))]
        std = np.std(vv) if vv else np.nan
        print(f"{year:<8}  {vals}  {fmt(std):>8}")

    print()
    print("  Cross-year consistency (std deviation across years for each month):")
    print(f"  {'Month':<10} {'Mean':>8} {'StdDev':>8} {'CV%':>8}  {'Assessment':<20}")
    print(f"  {'-'*60}")
    for m in MONTHS:
        vals = []
        for year in YEARS:
            if year in ym:
                v = ym[year].get(m, np.nan)
                if not pd.isna(v):
                    vals.append(v)
        if vals:
            mean_v = np.mean(vals)
            std_v = np.std(vals)
            cv = (std_v / mean_v * 100) if mean_v > 0 else np.nan
            label = "STABLE" if cv < 10 else ("MODERATE" if cv < 20 else "VARIABLE")
            print(f"  {calendar.month_abbr[m]:<10} {mean_v:8.1f} {std_v:8.1f}"
                  f" {cv:7.1f}%  {label:<20}")

    print()
    print("  Year-by-year NORMALISED to 0-100 (isolates seasonal shape):")
    print(f"  {'Year':<8}  {mh}")
    print(f"  {'-'*100}")
    for year, monthly in ym.items():
        mi, ma = monthly.min(), monthly.max()
        if ma - mi > 0:
            normed = (monthly - mi) / (ma - mi) * 100
        else:
            normed = pd.Series(50, index=monthly.index)
        vals = "  ".join(fmt(normed.get(m, np.nan)) for m in MONTHS)
        print(f"  {year:<8}  {vals}")


def main():
    data = {}
    for app, path in APPS.items():
        if not path.exists():
            print(f"WARNING: {path} not found, skipping {app}")
            continue
        data[app] = load_app_data(app, path)
        print(f"Loaded {app}: {len(data[app])} rows, "
              f"{data[app].index.min().date()} to {data[app].index.max().date()}")

    if not data:
        print("ERROR: No data files found. Exiting.")
        sys.exit(1)

    yearly = compute_yearly_averages(data)
    print_yearly_averages(yearly)
    print_monthly_comparison(data)
    print_raw_vs_detrended(data)

    if "tinder" in data:
        print_tinder_yearly_monthly(data["tinder"])
    else:
        print("Skipping Tinder year-by-year analysis (data not available).")
    phdr("SUMMARY")
    print()
    print("  Key takeaways to look for:")
    print("  - If yearly averages show a strong trend (e.g. Hinge growing, Happn declining),")
    print("    then raw monthly averages are CONTAMINATED by that trend.")
    print("  - Detrended seasonal indices isolate the TRUE seasonal pattern regardless of")
    print("    overall growth/decline.")
    print("  - For Tinder (mature app), year-by-year patterns should be CONSISTENT.")
    print("    If they are, the seasonal pattern is reliable for forecasting.")
    print("  - High CV% (>20%) on a month means that month pattern is unreliable.")
    print()


if __name__ == "__main__":
    main()
