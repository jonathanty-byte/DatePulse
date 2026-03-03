"""
SEASONAL APPROACH — Average Google Trends data over MULTIPLE YEARS to extract
the pure seasonal pattern, then compare with our APP_MONTHLY curve.

Key insight: Our APP_MONTHLY was built from multi-year benchmarks (Adjust 2023-2024,
Sensor Tower FR, SwipeStats). A single year has too much noise. Averaging 5 years
of Google Trends data extracts the same kind of stable seasonal signal.

Method:
  1. Fetch 5 years of monthly data (2019-2024) for each term
  2. Average same months across years -> 12-value seasonal profile
  3. Normalize to 0-100
  4. Compute Pearson correlation with target
  5. Optimize weighted combinations
"""

import sys
import io
import time
import itertools
import numpy as np
from pytrends.request import TrendReq

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Target: APP_MONTHLY tinder
TARGET = np.array([100, 74, 68, 65, 86, 72, 89, 82, 75, 83, 78, 60], dtype=float)
MONTHS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]


def pearson_corr(a, b):
    a_m, b_m = a - a.mean(), b - b.mean()
    d = np.sqrt((a_m**2).sum() * (b_m**2).sum())
    return float((a_m * b_m).sum() / d) if d else 0.0

def normalize_to_100(arr):
    mx = arr.max()
    return arr / mx * 100 if mx else arr


def fetch_seasonal_profile(pt, keyword, years=(2019, 2020, 2021, 2022, 2023, 2024), retries=3):
    """
    Fetch multi-year data and compute the average seasonal profile.
    Uses 5-year range which gives monthly granularity on Google Trends.
    Returns 12-value array (Jan-Dec average) or None.
    """
    for attempt in range(retries):
        try:
            start_year = min(years)
            end_year = max(years)
            pt.build_payload(
                [keyword],
                timeframe=f"{start_year}-01-01 {end_year}-12-31",
                geo="FR",
            )
            df = pt.interest_over_time()
            if df.empty:
                return None

            # Filter to requested years only (exclude COVID-weird 2020 optionally)
            valid_years = [y for y in years if y != 2020]  # Skip COVID year
            df_filtered = df[df.index.year.isin(valid_years)]

            if len(df_filtered) < 12:
                return None

            # Group by month and average across years
            monthly_avg = df_filtered.groupby(df_filtered.index.month)[keyword].mean()

            if len(monthly_avg) < 12:
                return None

            # Ensure we have months 1-12 in order
            values = np.array([monthly_avg.get(m, 0) for m in range(1, 13)], dtype=float)
            return values

        except Exception as e:
            if "429" in str(e):
                wait = 30 * (attempt + 1)
                print(f"\n  429! Waiting {wait}s...", end="", flush=True)
                time.sleep(wait)
            else:
                print(f"\n  ERR: {e}", end="")
                return None
    return None


def optimize_weights_2(data_list, target, n_steps=50):
    """Optimize weights for 2 terms."""
    best_corr, best_w = -1, [0.5, 0.5]
    for w in np.linspace(0, 1, n_steps + 1):
        combo = data_list[0] * w + data_list[1] * (1 - w)
        norm = normalize_to_100(combo)
        c = pearson_corr(target, norm)
        if c > best_corr:
            best_corr, best_w = c, [w, 1 - w]
    return best_w, best_corr


def optimize_weights_3(data_list, target, n_steps=30):
    """Optimize weights for 3 terms."""
    best_corr, best_w = -1, [1/3, 1/3, 1/3]
    for w1 in np.linspace(0, 1, n_steps + 1):
        for w2 in np.linspace(0, 1 - w1, max(2, int(n_steps * (1 - w1)) + 1)):
            w3 = 1 - w1 - w2
            if w3 < -0.001:
                continue
            w3 = max(0, w3)
            combo = data_list[0] * w1 + data_list[1] * w2 + data_list[2] * w3
            norm = normalize_to_100(combo)
            c = pearson_corr(target, norm)
            if c > best_corr:
                best_corr, best_w = c, [w1, w2, w3]
    return best_w, best_corr


def optimize_weights_4(data_list, target, n_steps=12):
    """Optimize weights for 4 terms."""
    best_corr, best_w = -1, [0.25] * 4
    for w1 in np.linspace(0, 1, n_steps + 1):
        for w2 in np.linspace(0, 1 - w1, max(2, int(n_steps * (1 - w1)) + 1)):
            for w3 in np.linspace(0, 1 - w1 - w2, max(2, int(n_steps * (1 - w1 - w2)) + 1)):
                w4 = 1 - w1 - w2 - w3
                if w4 < -0.001:
                    continue
                w4 = max(0, w4)
                combo = sum(data_list[i] * w for i, w in enumerate([w1, w2, w3, w4]))
                norm = normalize_to_100(combo)
                c = pearson_corr(target, norm)
                if c > best_corr:
                    best_corr, best_w = c, [w1, w2, w3, w4]
    return best_w, best_corr


def main():
    pt = TrendReq(hl="fr-FR", tz=60)

    # Comprehensive term list — best from all previous rounds + new ideas
    terms = [
        # Dating core
        "tinder", "site de rencontre", "rencontre", "couple", "badoo", "meetic",
        "celibataire", "amour", "sexe", "relation",
        # Best correlators from previous rounds
        "serie", "livre", "cuisine",
        # Lifestyle with potential seasonal match
        "sport", "salle de sport", "regime",
        "film", "netflix",
        # New ideas — seasonal behaviors
        "soldes", "promotion", "dentiste",
        "appartement", "demenagement",
        "coiffeur", "restaurant", "cinema",
        # Broad behavioral
        "sortir", "vacances", "voyage",
        "shopping", "mode", "beaute",
        # Emotional
        "motivation", "confiance en soi", "ennui",
        # English in FR
        "single", "dating", "crush",
    ]

    print("=" * 70)
    print("SEASONAL PROFILE APPROACH (multi-year average, skip COVID)")
    print("=" * 70)
    print(f"Target: {TARGET.tolist()}")
    print(f"Testing {len(terms)} terms (seasonal avg 2019+2021-2024)...\n")

    term_data = {}
    single_results = []

    for i, term in enumerate(terms):
        print(f"[{i+1}/{len(terms)}] '{term}' ... ", end="", flush=True)
        data = fetch_seasonal_profile(pt, term)
        if data is None:
            print("FAIL")
            time.sleep(5)
            continue
        norm = normalize_to_100(data)
        corr = pearson_corr(TARGET, norm)
        term_data[term] = norm
        single_results.append({"term": term, "corr": corr, "norm": norm.tolist()})
        tag = " <<<" if corr >= 0.90 else " **" if corr >= 0.80 else " *" if corr >= 0.70 else ""
        print(f"r = {corr:.4f}{tag}  | {[int(x) for x in norm]}")
        time.sleep(5)

    single_results.sort(key=lambda x: x["corr"], reverse=True)

    print(f"\nFetched {len(term_data)} terms.")
    print("\n" + "=" * 70)
    print("SINGLE TERMS (sorted)")
    print("=" * 70)
    for i, r in enumerate(single_results[:20]):
        mark = " <<<" if r["corr"] >= 0.90 else " **" if r["corr"] >= 0.80 else " *" if r["corr"] >= 0.70 else ""
        print(f"  {i+1:>3}. {r['term']:<30} r = {r['corr']:.4f}{mark}")

    # ═══ PAIRS ═══
    print("\n" + "=" * 70)
    print("OPTIMIZED PAIRS")
    print("=" * 70)
    tnames = list(term_data.keys())
    pair_results = []
    for t1, t2 in itertools.combinations(tnames, 2):
        w, c = optimize_weights_2([term_data[t1], term_data[t2]], TARGET)
        pair_results.append({"terms": f"{t1}({w[0]:.2f})+{t2}({w[1]:.2f})", "corr": c, "keys": (t1, t2), "w": w})
    pair_results.sort(key=lambda x: x["corr"], reverse=True)
    print("Top 15 pairs:")
    for i, r in enumerate(pair_results[:15]):
        mark = " <<<" if r["corr"] >= 0.95 else " **" if r["corr"] >= 0.90 else " *" if r["corr"] >= 0.80 else ""
        print(f"  {i+1:>3}. {r['terms']:<55} r = {r['corr']:.4f}{mark}")

    # ═══ TRIPLES (from top pair terms) ═══
    print("\n" + "=" * 70)
    print("OPTIMIZED TRIPLES")
    print("=" * 70)
    top_terms = set()
    for r in pair_results[:15]:
        top_terms.update(r["keys"])
    top_terms = list(top_terms)

    triple_results = []
    for combo in itertools.combinations(top_terms, 3):
        w, c = optimize_weights_3([term_data[t] for t in combo], TARGET)
        label = "+".join(f"{t}({w[i]:.2f})" for i, t in enumerate(combo))
        triple_results.append({"terms": label, "corr": c, "keys": combo, "w": w})
    triple_results.sort(key=lambda x: x["corr"], reverse=True)
    print(f"Top 15 triples (from {len(top_terms)} best terms):")
    for i, r in enumerate(triple_results[:15]):
        mark = " <<< TARGET!" if r["corr"] >= 0.95 else " **" if r["corr"] >= 0.90 else " *" if r["corr"] >= 0.80 else ""
        print(f"  {i+1:>3}. r = {r['corr']:.4f}{mark}  {r['terms']}")

    # ═══ QUADS (from top triple terms) ═══
    if triple_results:
        print("\n" + "=" * 70)
        print("OPTIMIZED QUADS (4 terms)")
        print("=" * 70)
        quad_terms = set()
        for r in triple_results[:10]:
            quad_terms.update(r["keys"])
        quad_terms = list(quad_terms)

        quad_results = []
        for combo in itertools.combinations(quad_terms, 4):
            w, c = optimize_weights_4([term_data[t] for t in combo], TARGET)
            label = "+".join(f"{t}({w[i]:.2f})" for i, t in enumerate(combo))
            quad_results.append({"terms": label, "corr": c})
        quad_results.sort(key=lambda x: x["corr"], reverse=True)
        print(f"Top 10 quads (from {len(quad_terms)} best terms):")
        for i, r in enumerate(quad_results[:10]):
            mark = " <<< TARGET!" if r["corr"] >= 0.95 else " **" if r["corr"] >= 0.90 else ""
            print(f"  {i+1:>3}. r = {r['corr']:.4f}{mark}  {r['terms']}")

    # ═══ GRAND SUMMARY ═══
    print("\n" + "=" * 70)
    print("GRAND SUMMARY — SEASONAL APPROACH")
    print("=" * 70)
    all_res = []
    for r in single_results[:5]:
        all_res.append((f"[1] {r['term']}", r["corr"], r["norm"]))
    for r in pair_results[:5]:
        all_res.append((f"[2] {r['terms']}", r["corr"], None))
    for r in triple_results[:5]:
        all_res.append((f"[3] {r['terms']}", r["corr"], None))
    if triple_results:
        for r in quad_results[:3]:
            all_res.append((f"[4] {r['terms']}", r["corr"], None))
    all_res.sort(key=lambda x: x[1], reverse=True)

    print("\nOverall Top 20:")
    for i, (name, corr, _) in enumerate(all_res[:20]):
        mark = " <<< TARGET!" if corr >= 0.95 else " <<<" if corr >= 0.90 else " **" if corr >= 0.80 else ""
        print(f"  {i+1:>3}. r = {corr:.4f}{mark}  {name}")

    # Show detailed comparison for best match
    if single_results:
        print(f"\n  Target:          {TARGET.tolist()}")
        print(f"  Best single:     {single_results[0]['norm']}  ({single_results[0]['term']})")
        if pair_results:
            # Recompute best pair data
            t1, t2 = pair_results[0]["keys"]
            w = pair_results[0]["w"]
            combo = term_data[t1] * w[0] + term_data[t2] * w[1]
            norm = normalize_to_100(combo)
            print(f"  Best pair combo: {[int(x) for x in norm]}")


if __name__ == "__main__":
    main()
