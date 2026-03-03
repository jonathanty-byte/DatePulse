"""
DETRENDED approach: The problem with multi-year averaging is variance compression.
Instead of correlating raw values, we use:
1. Z-SCORE seasonal profiles (mean=0, sd=1) — captures the SHAPE regardless of amplitude
2. RANK correlation (Spearman) — captures the ordering of months
3. Single-year 2024 data with weekly->monthly aggregation for higher variance

Also: systematically test the Google Trends "Related topics" and "Related queries"
for our best terms, using the pytrends API.
"""

import sys
import io
import time
import itertools
import numpy as np
from scipy import stats
from pytrends.request import TrendReq

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

TARGET = np.array([100, 74, 68, 65, 86, 72, 89, 82, 75, 83, 78, 60], dtype=float)
TARGET_Z = (TARGET - TARGET.mean()) / TARGET.std()  # Z-scored target


def pearson_corr(a, b):
    a_m, b_m = a - a.mean(), b - b.mean()
    d = np.sqrt((a_m**2).sum() * (b_m**2).sum())
    return float((a_m * b_m).sum() / d) if d else 0.0

def spearman_corr(a, b):
    """Rank-based correlation."""
    r, _ = stats.spearmanr(a, b)
    return float(r) if not np.isnan(r) else 0.0

def normalize_to_100(arr):
    mx = arr.max()
    return arr / mx * 100 if mx else arr

def z_score(arr):
    s = arr.std()
    return (arr - arr.mean()) / s if s > 0 else arr * 0


def fetch_2024_weekly_to_monthly(pt, keywords, retries=4):
    """Fetch 2024 weekly data and aggregate to monthly. Higher variance than multi-year."""
    for attempt in range(retries):
        try:
            pt.build_payload(keywords, timeframe="2024-01-01 2024-12-31", geo="FR")
            df = pt.interest_over_time()
            if df.empty:
                return {}
            # Aggregate weekly -> monthly mean
            monthly = df.resample("MS").mean()
            results = {}
            for kw in keywords:
                if kw not in monthly.columns:
                    continue
                v = monthly[kw].values[:12].astype(float)
                if len(v) == 12 and v.max() > 0:
                    results[kw] = normalize_to_100(v)
            return results
        except Exception as e:
            if "429" in str(e):
                wait = 60 * (attempt + 1)
                print(f"\n  429! Waiting {wait}s...", end="", flush=True)
                time.sleep(wait)
            else:
                print(f"\n  ERR: {e}", end="")
                return {}
    return {}


def fetch_related(pt, keyword, retries=3):
    """Fetch related queries for a keyword to discover new terms."""
    for attempt in range(retries):
        try:
            pt.build_payload([keyword], timeframe="2024-01-01 2024-12-31", geo="FR")
            related = pt.related_queries()
            top_queries = []
            if keyword in related:
                if "top" in related[keyword] and related[keyword]["top"] is not None:
                    top_queries = related[keyword]["top"]["query"].tolist()[:10]
            return top_queries
        except Exception as e:
            if "429" in str(e):
                time.sleep(60 * (attempt + 1))
            else:
                return []
    return []


def optimize_2(d1, d2, target, steps=100):
    best_c, best_w = -1, 0.5
    for w in np.linspace(0, 1, steps+1):
        c = pearson_corr(target, normalize_to_100(d1*w + d2*(1-w)))
        if c > best_c: best_c, best_w = c, w
    return best_w, best_c


def main():
    pt = TrendReq(hl="fr-FR", tz=60)

    # ═══ Step 1: Discover related queries for our best terms ═══
    print("=" * 70)
    print("STEP 1: Discovering related queries")
    print("=" * 70)

    seed_terms = ["site de rencontre", "tinder", "celibataire"]
    discovered = set()

    for seed in seed_terms:
        print(f"\n  Related to '{seed}':")
        related = fetch_related(pt, seed)
        for q in related:
            print(f"    - {q}")
            discovered.add(q)
        time.sleep(10)

    print(f"\n  Discovered {len(discovered)} related queries")

    # ═══ Step 2: Fetch 2024 weekly->monthly for ALL terms ═══
    print(f"\n{'='*70}")
    print("STEP 2: Fetch 2024 data (weekly->monthly) for all terms")
    print(f"{'='*70}")

    # Combine discovered + our best terms
    all_terms = list(discovered)
    # Add our known best performers
    all_terms.extend([
        "site de rencontre", "badoo", "tinder", "couple",
        "serie", "sexe", "rencontre", "meetic",
        "site rencontre gratuit", "nouvelle relation",
    ])
    # Remove duplicates
    all_terms = list(dict.fromkeys(all_terms))

    # Batch in groups of 5
    all_data = {}
    batches = [all_terms[i:i+5] for i in range(0, len(all_terms), 5)]

    for bi, batch in enumerate(batches):
        print(f"\n  Batch {bi+1}/{len(batches)}: {batch}")
        r = fetch_2024_weekly_to_monthly(pt, batch)
        for kw, d in r.items():
            pc = pearson_corr(TARGET, d)
            sc = spearman_corr(TARGET, d)
            all_data[kw] = d
            mark_p = " **" if pc >= 0.80 else " *" if pc >= 0.70 else ""
            mark_s = " **" if sc >= 0.80 else " *" if sc >= 0.70 else ""
            print(f"    {kw:<35} Pearson={pc:.4f}{mark_p}  Spearman={sc:.4f}{mark_s}")
        time.sleep(15)

    # ═══ Step 3: Rank by Pearson AND Spearman ═══
    print(f"\n{'='*70}")
    print(f"RANKINGS ({len(all_data)} terms)")
    print(f"{'='*70}")

    results = []
    for t, d in all_data.items():
        pc = pearson_corr(TARGET, d)
        sc = spearman_corr(TARGET, d)
        combined = (pc + sc) / 2  # Average of both correlations
        results.append({"term": t, "pearson": pc, "spearman": sc, "combined": combined, "data": d})

    # Sort by Pearson
    results.sort(key=lambda x: x["pearson"], reverse=True)
    print("\nBy Pearson:")
    for i, r in enumerate(results[:15]):
        mark = " **" if r["pearson"] >= 0.80 else " *" if r["pearson"] >= 0.70 else ""
        print(f"  {i+1:>3}. {r['term']:<35} r={r['pearson']:.4f}{mark}  (Sp={r['spearman']:.4f})")

    # Sort by Spearman
    results.sort(key=lambda x: x["spearman"], reverse=True)
    print("\nBy Spearman (rank-order):")
    for i, r in enumerate(results[:15]):
        mark = " **" if r["spearman"] >= 0.80 else " *" if r["spearman"] >= 0.70 else ""
        print(f"  {i+1:>3}. {r['term']:<35} Sp={r['spearman']:.4f}{mark}  (r={r['pearson']:.4f})")

    # Sort by combined
    results.sort(key=lambda x: x["combined"], reverse=True)
    print("\nBy Combined (Pearson+Spearman)/2:")
    for i, r in enumerate(results[:15]):
        mark = " **" if r["combined"] >= 0.80 else " *" if r["combined"] >= 0.70 else ""
        print(f"  {i+1:>3}. {r['term']:<35} comb={r['combined']:.4f}{mark}")

    # ═══ Step 4: Optimized pairs ═══
    print(f"\n{'='*70}")
    print("OPTIMIZED PAIRS (Pearson)")
    print(f"{'='*70}")
    terms = list(all_data.keys())
    pairs = []
    for t1, t2 in itertools.combinations(terms, 2):
        w, c = optimize_2(all_data[t1], all_data[t2], TARGET)
        sp = spearman_corr(TARGET, normalize_to_100(all_data[t1]*w + all_data[t2]*(1-w)))
        pairs.append((t1, t2, w, c, sp))
    pairs.sort(key=lambda x: x[3], reverse=True)
    print("Top 20:")
    for i, (t1, t2, w, c, sp) in enumerate(pairs[:20]):
        mark = " <<< TARGET!" if c >= 0.95 else " **" if c >= 0.90 else " *" if c >= 0.80 else ""
        print(f"  {i+1:>3}. r={c:.4f} Sp={sp:.4f}{mark}  {t1}({w:.2f})+{t2}({1-w:.2f})")

    # ═══ Final ═══
    print(f"\n{'='*70}")
    print("TARGET vs BEST")
    print(f"{'='*70}")
    print(f"  Target: {TARGET.tolist()}")
    results.sort(key=lambda x: x["pearson"], reverse=True)
    if results:
        best = results[0]
        print(f"  Best:   {[int(x) for x in best['data']]}  r={best['pearson']:.4f}  ({best['term']})")
    if pairs:
        t1, t2, w, c, sp = pairs[0]
        combo = normalize_to_100(all_data[t1]*w + all_data[t2]*(1-w))
        print(f"  Best P: {[int(x) for x in combo]}  r={c:.4f}  Sp={sp:.4f}")


if __name__ == "__main__":
    main()
