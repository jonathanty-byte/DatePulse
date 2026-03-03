"""
FINAL ROUND — Optimized combo search.

Best so far: r=0.82 with "site de rencontre(0.3) + serie(0.7)"

Strategy:
1. Fetch more high-potential terms
2. Try ALL pairs/triples with fine-grained weight optimization
3. Use scipy.optimize to find optimal weights for N terms
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

def fetch_kw(pt, kw, retries=3):
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


def optimize_weights(term_data_list, target, n_steps=20):
    """Find optimal weights for N terms to maximize correlation with target."""
    n = len(term_data_list)
    if n == 1:
        return [1.0], pearson_corr(target, normalize_to_100(term_data_list[0]))

    best_corr = -1
    best_weights = [1/n] * n

    if n == 2:
        for w in np.linspace(0, 1, n_steps + 1):
            weights = [w, 1 - w]
            combo = sum(term_data_list[i] * weights[i] for i in range(n))
            norm = normalize_to_100(combo)
            corr = pearson_corr(target, norm)
            if corr > best_corr:
                best_corr = corr
                best_weights = weights
    elif n == 3:
        for w1 in np.linspace(0, 1, n_steps + 1):
            for w2 in np.linspace(0, 1 - w1, max(2, int(n_steps * (1 - w1)) + 1)):
                w3 = 1 - w1 - w2
                if w3 < 0:
                    continue
                weights = [w1, w2, w3]
                combo = sum(term_data_list[i] * weights[i] for i in range(n))
                norm = normalize_to_100(combo)
                corr = pearson_corr(target, norm)
                if corr > best_corr:
                    best_corr = corr
                    best_weights = weights

    return best_weights, best_corr


def main():
    pt = TrendReq(hl="fr-FR", tz=60)

    # Terms to fetch (best performers + new untested high-potential)
    terms_to_fetch = [
        # Previous best
        "serie",
        "site de rencontre",
        "tinder",
        "badoo",
        # New high-potential terms (untested or need fresh data)
        "celibataire",
        "amour",
        "couple",
        "relation",
        "sexe",
        "seduction",
        "drague",
        "flirt",
        "rencontre",
        "coeur",
        # Broader lifestyle
        "gym",
        "sport",
        "regime",
        "shopping",
        "mode",
        "sortir",
    ]

    print("=" * 70)
    print("FINAL ROUND - Fetching terms")
    print("=" * 70)

    term_data = {}
    for term in terms_to_fetch:
        print(f"  '{term}' ... ", end="", flush=True)
        data = fetch_kw(pt, term)
        if data is not None:
            norm = normalize_to_100(data)
            corr = pearson_corr(TARGET, norm)
            term_data[term] = norm
            print(f"r = {corr:.4f}  | {[int(x) for x in norm]}")
        else:
            print("FAIL")
        time.sleep(5)

    print(f"\nFetched {len(term_data)} terms successfully.")

    # ═══════════════════════════════════════════════════════
    # Optimize ALL pairs
    # ═══════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("OPTIMIZING PAIRS (fine-grained weights)")
    print("=" * 70)

    terms = list(term_data.keys())
    pair_results = []

    for t1, t2 in itertools.combinations(terms, 2):
        weights, corr = optimize_weights(
            [term_data[t1], term_data[t2]], TARGET, n_steps=50
        )
        pair_results.append({
            "terms": f"{t1}({weights[0]:.2f}) + {t2}({weights[1]:.2f})",
            "corr": corr,
            "weights": weights,
            "keys": (t1, t2),
        })

    pair_results.sort(key=lambda x: x["corr"], reverse=True)

    print(f"\nTop 15 pairs:")
    for i, r in enumerate(pair_results[:15]):
        mark = " <<<" if r["corr"] >= 0.90 else " **" if r["corr"] >= 0.80 else ""
        print(f"  {i+1:>3}. {r['terms']:<55} r = {r['corr']:.4f}{mark}")

    # ═══════════════════════════════════════════════════════
    # Optimize TOP 10 triples from best-pair terms
    # ═══════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("OPTIMIZING TRIPLES")
    print("=" * 70)

    # Get unique terms from top 10 pairs
    top_pair_terms = set()
    for r in pair_results[:10]:
        top_pair_terms.update(r["keys"])

    triple_results = []
    top_terms = list(top_pair_terms)

    for combo in itertools.combinations(top_terms, 3):
        weights, corr = optimize_weights(
            [term_data[t] for t in combo], TARGET, n_steps=15
        )
        triple_results.append({
            "terms": " + ".join(f"{t}({w:.2f})" for t, w in zip(combo, weights)),
            "corr": corr,
        })

    triple_results.sort(key=lambda x: x["corr"], reverse=True)

    print(f"\nTop 10 triples:")
    for i, r in enumerate(triple_results[:10]):
        mark = " <<<" if r["corr"] >= 0.90 else " **" if r["corr"] >= 0.80 else ""
        print(f"  {i+1:>3}. {r['terms']:<65} r = {r['corr']:.4f}{mark}")

    # ═══════════════════════════════════════════════════════
    # FINAL SUMMARY
    # ═══════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("ABSOLUTE BEST RESULTS")
    print("=" * 70)

    all_results = []
    for r in pair_results[:5]:
        all_results.append((f"[PAIR] {r['terms']}", r["corr"]))
    for r in triple_results[:5]:
        all_results.append((f"[TRIPLE] {r['terms']}", r["corr"]))
    # Single terms
    for term, norm in term_data.items():
        corr = pearson_corr(TARGET, norm)
        all_results.append((f"[SINGLE] {term}", corr))

    all_results.sort(key=lambda x: x[1], reverse=True)

    print("\nOverall Top 20:")
    for i, (name, corr) in enumerate(all_results[:20]):
        mark = " <<< TARGET!" if corr >= 0.95 else " <<<" if corr >= 0.90 else " **" if corr >= 0.80 else ""
        print(f"  {i+1:>3}. {name:<65} r = {corr:.4f}{mark}")

    # Show the best match data
    if all_results:
        print(f"\n  Target:   {TARGET.tolist()}")


if __name__ == "__main__":
    main()
