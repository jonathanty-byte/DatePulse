"""
Round 6 — TWO NEW STRATEGIES:

Strategy A: Use Google Trends CATEGORIES instead of individual terms.
  Google Trends has predefined categories like "Dating & Personals" (cat=55).
  These aggregate MANY search terms and might match app activity better.

Strategy B: Compute OPTIMAL WEIGHTED COMBINATIONS of our best terms.
  If no single term reaches r>0.95, maybe a weighted average of 2-3 terms does.

Category IDs from Google Trends:
  55 = People & Society > Social Sciences > Relationships > Dating & Personals
  7 = Internet & Telecom
  5 = Computers & Electronics > Software > Mobile Apps & Add-Ons
  71 = Beauty & Fitness
  174 = Arts & Entertainment
  456 = People & Society > Social Sciences > Relationships
  316 = Online Communities > Social Networks
"""

import sys
import io
import time
import itertools
import numpy as np
from pytrends.request import TrendReq

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

TARGET = np.array([100, 74, 68, 65, 86, 72, 89, 82, 75, 83, 78, 60], dtype=float)


def pearson_corr(a, b):
    a_m, b_m = a - a.mean(), b - b.mean()
    d = np.sqrt((a_m**2).sum() * (b_m**2).sum())
    return float((a_m * b_m).sum() / d) if d else 0.0

def normalize_to_100(arr):
    mx = arr.max()
    return arr / mx * 100 if mx else arr


def fetch_category_monthly(pt, cat_id, retries=3):
    """Fetch monthly data for a Google Trends CATEGORY (no keyword needed)."""
    for attempt in range(retries):
        try:
            pt.build_payload(
                kw_list=[""],
                timeframe="2020-01-01 2024-12-31",
                geo="FR",
                cat=cat_id,
            )
            df = pt.interest_over_time()
            if df.empty:
                return None
            df24 = df[df.index.year == 2024]
            if len(df24) < 12:
                return None
            v = df24.iloc[:, 0].values[:12].astype(float)
            return v if len(v) >= 12 else None
        except Exception as e:
            if "429" in str(e):
                wait = 30 * (attempt + 1)
                print(f"\n  429! Waiting {wait}s...", end="", flush=True)
                time.sleep(wait)
            else:
                print(f"\n  ERR: {e}", end="")
                return None
    return None


def fetch_kw_monthly(pt, kw, retries=3):
    for attempt in range(retries):
        try:
            pt.build_payload([kw], timeframe="2020-01-01 2024-12-31", geo="FR")
            df = pt.interest_over_time()
            if df.empty:
                return None
            df24 = df[df.index.year == 2024]
            if len(df24) < 12:
                pt.build_payload([kw], timeframe="2024-01-01 2024-12-31", geo="FR")
                df = pt.interest_over_time()
                if df.empty:
                    return None
                df24 = df.resample("MS").mean()
            v = df24[kw].values[:12].astype(float)
            return v if len(v) >= 12 else None
        except Exception as e:
            if "429" in str(e):
                wait = 30 * (attempt + 1)
                print(f"\n  429! Waiting {wait}s...", end="", flush=True)
                time.sleep(wait)
            else:
                print(f"\n  ERR: {e}", end="")
                return None
    return None


def main():
    pt = TrendReq(hl="fr-FR", tz=60)

    # ═══════════════════════════════════════════════════════
    # Strategy A: Test Google Trends Categories
    # ═══════════════════════════════════════════════════════
    print("=" * 70)
    print("STRATEGY A: Google Trends CATEGORIES")
    print("=" * 70)

    categories = {
        55: "Dating & Personals",
        456: "Relationships",
        7: "Internet & Telecom",
        5: "Software > Mobile Apps",
        71: "Beauty & Fitness",
        174: "Arts & Entertainment",
        316: "Social Networks",
        18: "Shopping",
        44: "Food & Drink",
        107: "Health",
        958: "People & Society > Social Sciences",
        # More categories
        3: "Computers & Electronics",
        8: "Internet & Telecom > Email",
        12: "Beauty & Fitness > Face & Body Care",
        185: "Autos & Vehicles",
        29: "Sports",
        34: "Travel",
        179: "Real Estate",
        60: "Jobs & Education",
    }

    cat_results = []
    for cat_id, cat_name in categories.items():
        print(f"  Category {cat_id}: {cat_name} ... ", end="", flush=True)
        data = fetch_category_monthly(pt, cat_id)
        if data is None:
            print("NO DATA")
            time.sleep(5)
            continue
        norm = normalize_to_100(data)
        corr = pearson_corr(TARGET, norm)
        cat_results.append({"id": cat_id, "name": cat_name, "corr": corr, "norm": norm.tolist()})
        tag = " <<<" if corr >= 0.85 else " **" if corr >= 0.70 else ""
        print(f"r = {corr:.4f}{tag}  | {[int(x) for x in norm]}")
        time.sleep(5)

    cat_results.sort(key=lambda x: x["corr"], reverse=True)
    print("\nCategories sorted by correlation:")
    for r in cat_results:
        mark = " <<<" if r["corr"] >= 0.85 else " **" if r["corr"] >= 0.70 else ""
        print(f"  {r['name']:<35} (cat={r['id']}) r = {r['corr']:.4f}{mark}")

    # ═══════════════════════════════════════════════════════
    # Strategy B: Test keyword combinations
    # ═══════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("STRATEGY B: Keyword COMBINATIONS (weighted averages)")
    print("=" * 70)

    # Best terms from previous rounds (their normalized data)
    best_terms = [
        "site de rencontre",
        "tinder",
        "badoo",
        "meetic",
        "serie",
    ]

    # Fetch fresh data for combination
    term_data = {}
    for term in best_terms:
        print(f"  Fetching '{term}' ... ", end="", flush=True)
        data = fetch_kw_monthly(pt, term)
        if data is not None:
            term_data[term] = normalize_to_100(data)
            print(f"OK | {[int(x) for x in term_data[term]]}")
        else:
            print("FAIL")
        time.sleep(5)

    # Try all pairs and triples with different weights
    print("\n  Testing combinations...")
    combo_results = []

    terms = list(term_data.keys())
    for n in [2, 3]:
        for combo in itertools.combinations(terms, n):
            # Try equal weights
            avg = np.mean([term_data[t] for t in combo], axis=0)
            norm = normalize_to_100(avg)
            corr = pearson_corr(TARGET, norm)
            combo_results.append({
                "terms": " + ".join(combo),
                "corr": corr,
                "norm": norm.tolist(),
            })

            # Try weighted: emphasize first term 2x
            if n == 2:
                for w1 in [0.3, 0.5, 0.7]:
                    w2 = 1 - w1
                    wavg = term_data[combo[0]] * w1 + term_data[combo[1]] * w2
                    wnorm = normalize_to_100(wavg)
                    wcorr = pearson_corr(TARGET, wnorm)
                    combo_results.append({
                        "terms": f"{combo[0]}({w1:.1f}) + {combo[1]}({w2:.1f})",
                        "corr": wcorr,
                        "norm": wnorm.tolist(),
                    })

    combo_results.sort(key=lambda x: x["corr"], reverse=True)
    print(f"\n  Top 10 combinations:")
    for i, r in enumerate(combo_results[:10]):
        mark = " <<<" if r["corr"] >= 0.85 else " **" if r["corr"] >= 0.70 else ""
        print(f"  {i+1:>3}. {r['terms']:<55} r = {r['corr']:.4f}{mark}")

    # ═══════════════════════════════════════════════════════
    # GRAND SUMMARY
    # ═══════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("GRAND SUMMARY - BEST ACROSS ALL STRATEGIES")
    print("=" * 70)

    all_results = []
    for r in cat_results:
        all_results.append((f"[CAT] {r['name']}", r["corr"]))
    for r in combo_results[:5]:
        all_results.append((f"[COMBO] {r['terms']}", r["corr"]))
    # Add hardcoded bests from previous rounds
    prev_bests = [
        ("serie", 0.7059), ("vacances ete", 0.6114), ("livre", 0.5790),
        ("appartement a louer", 0.5641), ("dentiste", 0.5462),
        ("premier date", 0.5353), ("cuisine", 0.5383),
    ]
    for term, corr in prev_bests:
        all_results.append((f"[TERM] {term}", corr))

    all_results.sort(key=lambda x: x[1], reverse=True)
    for i, (name, corr) in enumerate(all_results[:20]):
        mark = " <<<" if corr >= 0.85 else " **" if corr >= 0.70 else ""
        print(f"  {i+1:>3}. {name:<55} r = {corr:.4f}{mark}")


if __name__ == "__main__":
    main()
