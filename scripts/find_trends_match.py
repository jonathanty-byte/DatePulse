"""
Find Google Trends search terms that correlate >95% with DatePulse's APP_MONTHLY Tinder curve.

Target data (APP_MONTHLY tinder):
  Jan=100, Feb=74, Mar=68, Apr=65, May=86, Jun=72,
  Jul=89, Aug=82, Sep=75, Oct=83, Nov=78, Dec=60

Strategy:
  1. Fetch monthly Google Trends data for France 2024 for candidate terms
  2. Normalize to 0-100 scale
  3. Compute Pearson correlation with target
  4. Report results sorted by correlation
"""

import sys
import io
import time
import numpy as np
from pytrends.request import TrendReq

# Fix Windows console encoding for emoji/unicode
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── Target: our APP_MONTHLY tinder curve (0=Jan ... 11=Dec) ──
TARGET = np.array([100, 74, 68, 65, 86, 72, 89, 82, 75, 83, 78, 60], dtype=float)

# ── Candidate search terms to test ──
# We need terms whose seasonality matches dating app ACTIVITY (not brand search)
# Key pattern: Jan peak, Apr trough, May+Jul rebounds, Dec trough
CANDIDATES = [
    # Direct dating terms
    "tinder",
    "site de rencontre",
    "rencontre en ligne",
    "application rencontre",
    "app de rencontre",
    "dating",
    "dating app",
    "rencontre",
    "célibataire",
    "trouver l'amour",

    # Indirect terms that might follow same pattern
    "chercher copain",
    "premier rendez-vous",
    "premier date",
    "drague",
    "séduire",
    "flirter",
    "match dating",
    "swipe",
    "crush",

    # Loneliness / boredom (psychological drivers)
    "je me sens seul",
    "solitude",
    "ennui",
    "comment rencontrer quelqu'un",

    # Competing apps
    "bumble",
    "hinge",
    "happn",
    "badoo",
    "meetic",

    # Activity patterns that might correlate
    "inscription site rencontre",
    "profil tinder",
    "bio tinder",
    "photo profil",
    "sortir ce soir",
    "bar ce soir",

    # English terms searched in France
    "online dating",
    "love",
    "relationship",
    "single",
]


def pearson_corr(a: np.ndarray, b: np.ndarray) -> float:
    """Pearson correlation coefficient between two arrays."""
    if len(a) != len(b) or len(a) == 0:
        return 0.0
    a_mean = a - a.mean()
    b_mean = b - b.mean()
    denom = np.sqrt((a_mean**2).sum() * (b_mean**2).sum())
    if denom == 0:
        return 0.0
    return float((a_mean * b_mean).sum() / denom)


def normalize_to_100(arr: np.ndarray) -> np.ndarray:
    """Normalize array to 0-100 scale (max = 100)."""
    mx = arr.max()
    if mx == 0:
        return arr
    return arr / mx * 100


def fetch_monthly_data(pytrends: TrendReq, keyword: str) -> np.ndarray | None:
    """
    Fetch monthly Google Trends data for France 2024.
    Returns 12-element array (Jan-Dec) or None on failure.
    """
    try:
        # Use 5-year range to get monthly granularity, then extract 2024
        pytrends.build_payload(
            kw_list=[keyword],
            timeframe="2020-01-01 2024-12-31",
            geo="FR",
        )
        df = pytrends.interest_over_time()

        if df.empty:
            return None

        # Filter to 2024 only
        df_2024 = df[df.index.year == 2024]

        if len(df_2024) < 12:
            # Try shorter range for weekly->monthly aggregation
            pytrends.build_payload(
                kw_list=[keyword],
                timeframe="2024-01-01 2024-12-31",
                geo="FR",
            )
            df = pytrends.interest_over_time()
            if df.empty:
                return None

            # Aggregate weekly to monthly
            df_2024 = df.resample("MS").mean()
            if len(df_2024) < 12:
                return None

        values = df_2024[keyword].values[:12].astype(float)
        if len(values) < 12:
            return None

        return values

    except Exception as e:
        print(f"  ⚠ Error fetching '{keyword}': {e}")
        return None


def main():
    print("=" * 70)
    print("🔍 Google Trends Correlation Finder for DatePulse")
    print("=" * 70)
    print(f"\nTarget (APP_MONTHLY tinder): {TARGET.tolist()}")
    print(f"Testing {len(CANDIDATES)} candidate terms...\n")

    pytrends = TrendReq(hl="fr-FR", tz=60)  # France timezone

    results = []

    for i, term in enumerate(CANDIDATES):
        print(f"[{i+1}/{len(CANDIDATES)}] Testing: '{term}' ... ", end="", flush=True)

        data = fetch_monthly_data(pytrends, term)

        if data is None:
            print("❌ No data")
            continue

        # Normalize to 0-100
        norm_data = normalize_to_100(data)

        # Compute correlation
        corr = pearson_corr(TARGET, norm_data)

        results.append({
            "term": term,
            "correlation": corr,
            "raw_data": data.tolist(),
            "normalized": norm_data.tolist(),
        })

        emoji = "🟢" if corr >= 0.95 else "🟡" if corr >= 0.85 else "🔴"
        print(f"{emoji} r = {corr:.4f}  |  data = {[int(x) for x in norm_data]}")

        # Rate limiting: Google Trends gets upset with too many requests
        time.sleep(2)

    # Sort by correlation
    results.sort(key=lambda x: x["correlation"], reverse=True)

    print("\n" + "=" * 70)
    print("📊 RESULTS (sorted by correlation)")
    print("=" * 70)
    print(f"{'Rank':<5} {'Term':<35} {'Correlation':<15} {'Match?'}")
    print("-" * 70)

    for i, r in enumerate(results):
        corr = r["correlation"]
        match = "✅ >95%" if corr >= 0.95 else "🟡 >85%" if corr >= 0.85 else ""
        print(f"{i+1:<5} {r['term']:<35} {corr:<15.4f} {match}")

    # Show top 5 details
    print("\n" + "=" * 70)
    print("🏆 TOP 5 DETAILED COMPARISON")
    print("=" * 70)

    months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"]

    print(f"\n{'Mois':<8}", end="")
    print(f"{'TARGET':<10}", end="")
    for r in results[:5]:
        print(f"{r['term'][:12]:<14}", end="")
    print()
    print("-" * 80)

    for m in range(12):
        print(f"{months[m]:<8}", end="")
        print(f"{TARGET[m]:<10.0f}", end="")
        for r in results[:5]:
            print(f"{r['normalized'][m]:<14.0f}", end="")
        print()

    print(f"\n{'r=':<8}", end="")
    print(f"{'1.0000':<10}", end="")
    for r in results[:5]:
        print(f"{r['correlation']:<14.4f}", end="")
    print()


if __name__ == "__main__":
    main()
