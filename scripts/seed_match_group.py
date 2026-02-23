"""
Seed Match Group quarterly financial metrics into the database.

Data sourced from Match Group earnings releases and call transcripts:
- Q1-Q4 2025 quarterly results
- FY 2025 & FY 2024 annual totals
- 2026 guidance
- Seasonality patterns

Sources:
  https://www.prnewswire.com/news-releases/match-group-announces-fourth-quarter-and-full-year-results-302678116.html
  https://www.fool.com/earnings/call-transcripts/2026/02/03/match-group-mtch-q4-2025-earnings-transcript/
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import logging

from engine.storage import db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)

# All metrics to seed: (report_date, quarter, metric_type, value, region, notes)
METRICS = [
    # =========================================================================
    # Q4 2025 (reported 2026-02-03)
    # =========================================================================
    # -- Total company --
    ("2026-02-03", "Q4 2025", "total_revenue", 878.0, "global", "Up 2% YoY, flat FX-neutral"),
    ("2026-02-03", "Q4 2025", "total_payers", 13.8, "global", "Down 5% YoY, in millions"),
    ("2026-02-03", "Q4 2025", "total_rpp", 20.72, "global", "Up 7% YoY"),
    ("2026-02-03", "Q4 2025", "net_income", 210.0, "global", "Up 32% YoY"),
    ("2026-02-03", "Q4 2025", "adjusted_ebitda", 370.0, "global", "Up 14% YoY, 42% margin"),
    ("2026-02-03", "Q4 2025", "ebitda_margin", 42.0, "global", None),
    # -- Tinder --
    ("2026-02-03", "Q4 2025", "tinder_revenue", 464.0, "global", "Down 3% YoY, -5% FX-neutral"),
    ("2026-02-03", "Q4 2025", "tinder_payers", 8.8, "global", "Down 8% YoY, in millions"),
    ("2026-02-03", "Q4 2025", "tinder_rpp", 17.63, "global", "Up 5% YoY"),
    ("2026-02-03", "Q4 2025", "tinder_ebitda_margin", 55.0, "global", None),
    ("2026-02-03", "Q4 2025", "tinder_new_registrations_yoy", -5.0, "global", "Improved from -12% in Q2"),
    # -- Hinge --
    ("2026-02-03", "Q4 2025", "hinge_revenue", 186.0, "global", "Up 26% YoY, +24% FX-neutral"),
    ("2026-02-03", "Q4 2025", "hinge_payers", 1.9, "global", "Up 17% YoY, in millions"),
    ("2026-02-03", "Q4 2025", "hinge_rpp", 32.96, "global", "Up 8% YoY"),
    ("2026-02-03", "Q4 2025", "hinge_ebitda", 67.0, "global", "Up 54% YoY, 36% margin"),
    ("2026-02-03", "Q4 2025", "hinge_mau", 3.3, "europe", "Up from 200K at EU launch, in millions"),
    ("2026-02-03", "Q4 2025", "hinge_india_mau", 1.0, "india", "40% YoY growth, organic, in millions"),

    # =========================================================================
    # Q3 2025 (reported 2025-10)
    # =========================================================================
    ("2025-10-29", "Q3 2025", "total_revenue", 914.0, "global", "Up 2% YoY"),
    ("2025-10-29", "Q3 2025", "total_payers", 14.5, "global", "Down 5% YoY, in millions"),
    ("2025-10-29", "Q3 2025", "total_rpp", 20.58, "global", "Up 7% YoY"),

    # =========================================================================
    # Q2 2025 (reported 2025-07)
    # =========================================================================
    ("2025-07-30", "Q2 2025", "total_revenue", 864.0, "global", "Flat YoY, -1% FX-neutral"),
    ("2025-07-30", "Q2 2025", "total_payers", 14.1, "global", "Down 5% YoY, in millions"),
    ("2025-07-30", "Q2 2025", "total_rpp", 20.00, "global", "Up 5% YoY"),

    # =========================================================================
    # Q1 2025 (reported 2025-04)
    # =========================================================================
    ("2025-04-30", "Q1 2025", "total_revenue", 812.4, "global", "Down 4% YoY, -2% FX-neutral"),
    ("2025-04-30", "Q1 2025", "total_payers", 14.2, "global", "Down 5% YoY, in millions"),

    # =========================================================================
    # Full Year 2025
    # =========================================================================
    ("2026-02-03", "FY 2025", "total_revenue", 3487.0, "global", "Flat YoY"),
    ("2026-02-03", "FY 2025", "total_payers", 14.2, "global", "Down 5% YoY avg, in millions"),
    ("2026-02-03", "FY 2025", "total_rpp", 20.09, "global", "Up 5% YoY"),
    ("2026-02-03", "FY 2025", "net_income", 613.0, "global", "Up 11% YoY, 18% margin"),
    ("2026-02-03", "FY 2025", "adjusted_ebitda", 1236.0, "global", "Down 1% YoY, 35% margin excl discrete: 38%"),
    ("2026-02-03", "FY 2025", "free_cash_flow", 1024.0, "global", None),
    ("2026-02-03", "FY 2025", "operating_cash_flow", 1100.0, "global", None),
    ("2026-02-03", "FY 2025", "share_buybacks", 789.0, "global", "24.7M shares at $32 avg"),
    ("2026-02-03", "FY 2025", "dividends_paid", 186.0, "global", None),
    ("2026-02-03", "FY 2025", "shares_outstanding_reduction", 7.0, "global", "Percent YoY reduction"),
    # -- Tinder FY --
    ("2026-02-03", "FY 2025", "tinder_revenue", 1900.0, "global", "Down 4% YoY, -5% FX-neutral"),
    ("2026-02-03", "FY 2025", "tinder_ebitda_margin", 49.0, "global", None),
    # -- Hinge FY --
    ("2026-02-03", "FY 2025", "hinge_revenue", 691.0, "global", "Up 26% YoY"),

    # =========================================================================
    # Full Year 2024 (for comparison)
    # =========================================================================
    ("2025-02-04", "FY 2024", "total_revenue", 3479.0, "global", "Up 3% YoY, +6% FXN"),
    ("2025-02-04", "FY 2024", "total_payers", 14.9, "global", "Down 5% YoY, in millions"),
    ("2025-02-04", "FY 2024", "total_rpp", 19.12, "global", "Up 8% YoY"),
    ("2025-02-04", "FY 2024", "net_income", 552.0, "global", None),
    ("2025-02-04", "FY 2024", "adjusted_ebitda", 1252.0, "global", "36% margin"),
    ("2025-02-04", "FY 2024", "free_cash_flow", 882.0, "global", None),
    ("2025-02-04", "FY 2024", "tinder_revenue", 1941.0, "global", "Up 1% YoY, +4% FXN"),
    ("2025-02-04", "FY 2024", "tinder_payers", 9.7, "global", "Down 7% YoY, in millions"),
    ("2025-02-04", "FY 2024", "tinder_rpp", 16.68, "global", "Up 8% YoY"),
    ("2025-02-04", "FY 2024", "hinge_revenue", 550.0, "global", "Up 39% YoY"),
    ("2025-02-04", "FY 2024", "hinge_payers", 1.5, "global", "Up 23% YoY, in millions"),
    ("2025-02-04", "FY 2024", "hinge_rpp", 29.94, "global", "Up 13% YoY"),

    # =========================================================================
    # Q4 2024 (for comparison)
    # =========================================================================
    ("2025-02-04", "Q4 2024", "total_revenue", 860.0, "global", "Down 1% YoY, +1% FXN"),
    ("2025-02-04", "Q4 2024", "tinder_revenue", 476.0, "global", "Down 3% YoY, -1% FXN"),
    ("2025-02-04", "Q4 2024", "hinge_revenue", 148.0, "global", "Up 27% YoY"),

    # =========================================================================
    # 2026 Guidance
    # =========================================================================
    ("2026-02-03", "Q1 2026 guidance", "total_revenue_low", 850.0, "global", "+2% YoY"),
    ("2026-02-03", "Q1 2026 guidance", "total_revenue_high", 860.0, "global", "+3% YoY"),
    ("2026-02-03", "Q1 2026 guidance", "adjusted_ebitda_low", 315.0, "global", "+15% YoY at midpoint"),
    ("2026-02-03", "Q1 2026 guidance", "adjusted_ebitda_high", 320.0, "global", "37% margin"),
    ("2026-02-03", "FY 2026 guidance", "total_revenue_low", 3410.0, "global", "Approx flat YoY"),
    ("2026-02-03", "FY 2026 guidance", "total_revenue_high", 3535.0, "global", None),
    ("2026-02-03", "FY 2026 guidance", "adjusted_ebitda_low", 1280.0, "global", "37.5% margin"),
    ("2026-02-03", "FY 2026 guidance", "adjusted_ebitda_high", 1325.0, "global", None),
    ("2026-02-03", "FY 2026 guidance", "free_cash_flow_low", 1085.0, "global", "Up 8%"),
    ("2026-02-03", "FY 2026 guidance", "free_cash_flow_high", 1135.0, "global", None),
    ("2026-02-03", "FY 2026 guidance", "tinder_revenue_trend", -4.0, "global", "Expected decline similar to 2025, percent"),
    ("2026-02-03", "FY 2026 guidance", "hinge_revenue_growth", 22.5, "global", "Low to mid-20% growth expected, percent"),

    # =========================================================================
    # Seasonality patterns (stored as reference data)
    # =========================================================================
    ("2026-02-03", "seasonality", "peak_start_month", 12.0, "global", "Dec 26 — start of peak dating season"),
    ("2026-02-03", "seasonality", "peak_end_month", 2.0, "global", "Feb 14 — end of peak season (Valentine's Day)"),
    ("2026-02-03", "seasonality", "dating_sunday_month", 1.0, "global", "1st Sunday of January, busiest single day"),
    ("2026-02-03", "seasonality", "summer_peak_start", 7.0, "global", "July-August secondary peak"),
    ("2026-02-03", "seasonality", "summer_peak_end", 8.0, "global", None),
    ("2026-02-03", "seasonality", "trough_start", 9.0, "global", "Sept-Nov quiet period"),
    ("2026-02-03", "seasonality", "trough_end", 11.0, "global", None),

    # =========================================================================
    # Hinge Europe expansion (key for DatePulse FR focus)
    # =========================================================================
    ("2026-02-03", "Q4 2025", "hinge_eu_expansion_mau_growth", 50.0, "europe", "Nearly 50% MAU growth in EU expansion markets FY25, percent"),
    ("2026-02-03", "Q4 2025", "hinge_most_downloaded", 1.0, "europe", "Most downloaded dating app in EU expansion markets Dec 2025"),
    ("2026-02-03", "Q4 2025", "hinge_france_active", 1.0, "france", "France is an active Hinge expansion market"),
]


def seed():
    """Insert all Match Group metrics into the database."""
    db.init_db()
    inserted = 0
    skipped = 0

    for row in METRICS:
        report_date, quarter, metric_type, value, region, notes = row
        ok = db.insert_match_group_metric(
            report_date=report_date,
            quarter=quarter,
            metric_type=metric_type,
            value=value,
            region=region,
            notes=notes,
        )
        if ok:
            inserted += 1
        else:
            skipped += 1

    print(f"\nMatch Group seed complete:")
    print(f"  {inserted} metrics inserted")
    print(f"  {skipped} duplicates skipped")
    print(f"  {len(METRICS)} total")


if __name__ == "__main__":
    seed()
