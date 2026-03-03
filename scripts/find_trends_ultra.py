"""
ULTRA-FOCUSED: Test the EXACT terms most correlated at r>0.95.

Observation: our target [100,74,68,65,86,72,89,82,75,83,78,60] has:
  - Very high Jan (100)
  - Strong contrast (60 to 100 range = 40pt spread)
  - Double peak (Jan + Jul/Aug)
  - Deep Dec trough

What Google Trends terms have THIS EXACT signature?
-> Terms that people search MORE in January and July, LESS in April and December
-> This is the pattern of "things you do when you're NOT with family"
-> Work/school calendar: Jan (post-holidays return), Jul (pre-vacation excitement)
-> Also: things you do when bored at home in winter AND hot days in summer

NEW TERMS to test:
- Specific dating sub-queries
- Boredom-driven indoor activities
- Self-improvement cycles
- Also: try with 2020 included (COVID may have amplified dating app seasonality!)
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

def fetch_seasonal(pt, keywords, include_2020=False, retries=4):
    """Fetch 5-year seasonal avg. Returns dict of normalized arrays."""
    for attempt in range(retries):
        try:
            pt.build_payload(keywords, timeframe="2019-01-01 2024-12-31", geo="FR")
            df = pt.interest_over_time()
            if df.empty:
                return {}
            if not include_2020:
                df = df[df.index.year != 2020]
            results = {}
            for kw in keywords:
                if kw not in df.columns:
                    continue
                avg = df.groupby(df.index.month)[kw].mean()
                if len(avg) < 12:
                    continue
                v = np.array([avg.get(m, 0) for m in range(1, 13)], dtype=float)
                if v.max() > 0:
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


def optimize_n(data_list, target, n_steps=50):
    """Optimize weights for 2 terms with fine grid."""
    if len(data_list) == 2:
        best_c, best_w = -1, [0.5, 0.5]
        for w in np.linspace(0, 1, n_steps+1):
            c = pearson_corr(target, normalize_to_100(data_list[0]*w + data_list[1]*(1-w)))
            if c > best_c: best_c, best_w = c, [w, 1-w]
        return best_w, best_c
    elif len(data_list) == 3:
        best_c, best_w = -1, [1/3]*3
        for w1 in np.linspace(0, 1, n_steps+1):
            for w2 in np.linspace(0, 1-w1, max(2, int(n_steps*(1-w1))+1)):
                w3 = max(0, 1-w1-w2)
                c = pearson_corr(target, normalize_to_100(data_list[0]*w1+data_list[1]*w2+data_list[2]*w3))
                if c > best_c: best_c, best_w = c, [w1,w2,w3]
        return best_w, best_c
    return [1/len(data_list)]*len(data_list), 0


def main():
    pt = TrendReq(hl="fr-FR", tz=60)

    # NEW carefully chosen terms we haven't tested yet
    batches = [
        # Batch 1: Hyper-specific dating app queries
        ["telecharger tinder", "tinder gratuit", "match tinder", "rencontre gratuite", "site rencontre gratuit"],
        # Batch 2: Emotional/behavioral drivers
        ["je suis seul", "chercher amour", "trouver copine", "nouvelle relation", "envie de sortir"],
        # Batch 3: Activity proxies
        ["swipe", "like", "profil", "photo de profil", "draguer"],
        # Batch 4: Seasonal lifestyle close to our pattern
        ["nouvel an", "resolution janvier", "ete", "soiree", "week end"],
    ]

    all_data = {}

    print("=" * 70)
    print("ULTRA-FOCUSED (new terms, seasonal avg)")
    print("=" * 70)

    for bi, batch in enumerate(batches):
        print(f"\nBatch {bi+1}/{len(batches)}: {batch}")
        # Try without 2020
        r = fetch_seasonal(pt, batch, include_2020=False)
        for kw, d in r.items():
            c = pearson_corr(TARGET, d)
            all_data[kw] = d
            tag = " **" if c >= 0.80 else " *" if c >= 0.70 else ""
            print(f"  {kw:<25} r={c:.4f}{tag} | {[int(x) for x in d]}")
        time.sleep(15)

    # Also re-fetch best terms WITH 2020 included
    print("\n--- Re-fetching best terms WITH 2020 included ---")
    best_batch = ["site de rencontre", "tinder", "badoo", "couple", "sexe"]
    r2020 = fetch_seasonal(pt, best_batch, include_2020=True)
    for kw, d in r2020.items():
        c = pearson_corr(TARGET, d)
        key = f"{kw}_w2020"
        all_data[key] = d
        tag = " **" if c >= 0.80 else " *" if c >= 0.70 else ""
        print(f"  {key:<25} r={c:.4f}{tag} | {[int(x) for x in d]}")
    time.sleep(15)

    # And fetch the 2024-only data for best terms
    print("\n--- Best terms 2024-only (monthly granularity) ---")
    try:
        pt.build_payload(["site de rencontre", "couple", "badoo", "tinder", "serie"],
                         timeframe="2024-01-01 2024-12-31", geo="FR")
        df = pt.interest_over_time()
        if not df.empty:
            df_m = df.resample("MS").mean()
            for kw in df_m.columns:
                if kw == 'isPartial':
                    continue
                v = df_m[kw].values[:12].astype(float)
                if len(v) == 12 and v.max() > 0:
                    n = normalize_to_100(v)
                    c = pearson_corr(TARGET, n)
                    key = f"{kw}_2024"
                    all_data[key] = n
                    tag = " **" if c >= 0.80 else " *" if c >= 0.70 else ""
                    print(f"  {key:<25} r={c:.4f}{tag} | {[int(x) for x in n]}")
    except Exception as e:
        print(f"  ERR: {e}")

    # Singles sorted
    print(f"\n{'='*70}")
    print(f"ALL SINGLES SORTED ({len(all_data)} terms)")
    print(f"{'='*70}")
    singles = [(k, pearson_corr(TARGET, v)) for k, v in all_data.items()]
    singles.sort(key=lambda x: x[1], reverse=True)
    for i, (t, c) in enumerate(singles[:25]):
        mark = " **" if c >= 0.80 else " *" if c >= 0.70 else ""
        print(f"  {i+1:>3}. {t:<30} r={c:.4f}{mark}")

    # Optimized pairs from all data
    print(f"\n{'='*70}")
    print("OPTIMIZED PAIRS")
    print(f"{'='*70}")
    terms = list(all_data.keys())
    pairs = []
    for t1, t2 in itertools.combinations(terms, 2):
        w, c = optimize_n([all_data[t1], all_data[t2]], TARGET)
        pairs.append((t1, t2, w, c))
    pairs.sort(key=lambda x: x[3], reverse=True)
    for i, (t1, t2, w, c) in enumerate(pairs[:15]):
        mark = " <<<" if c >= 0.95 else " **" if c >= 0.90 else " *" if c >= 0.80 else ""
        print(f"  {i+1:>3}. r={c:.4f}{mark}  {t1}({w[0]:.2f})+{t2}({w[1]:.2f})")

    # Optimized triples from top pair terms
    print(f"\n{'='*70}")
    print("OPTIMIZED TRIPLES")
    print(f"{'='*70}")
    top_t = set()
    for t1, t2, _, _ in pairs[:20]:
        top_t.update([t1, t2])
    top_t = list(top_t)
    triples = []
    for combo in itertools.combinations(top_t, 3):
        w, c = optimize_n([all_data[t] for t in combo], TARGET, n_steps=30)
        triples.append((combo, w, c))
    triples.sort(key=lambda x: x[2], reverse=True)
    for i, (combo, w, c) in enumerate(triples[:15]):
        mark = " <<< TARGET!" if c >= 0.95 else " **" if c >= 0.90 else " *" if c >= 0.80 else ""
        label = "+".join(f"{t}({w[j]:.2f})" for j,t in enumerate(combo))
        print(f"  {i+1:>3}. r={c:.4f}{mark}  {label}")

    # Final
    print(f"\n{'='*70}")
    print("TARGET vs BEST")
    print(f"{'='*70}")
    print(f"  Target:     {TARGET.tolist()}")
    if singles:
        best_single = singles[0]
        print(f"  Best single: {[int(x) for x in all_data[best_single[0]]]}  r={best_single[1]:.4f} ({best_single[0]})")
    if pairs:
        t1, t2, w, c = pairs[0]
        combo = normalize_to_100(all_data[t1]*w[0] + all_data[t2]*w[1])
        print(f"  Best pair:  {[int(x) for x in combo]}  r={c:.4f}")
    if triples:
        combo_t, w, c = triples[0]
        combo = normalize_to_100(sum(all_data[t]*w[i] for i,t in enumerate(combo_t)))
        print(f"  Best triple:{[int(x) for x in combo]}  r={c:.4f}")


if __name__ == "__main__":
    main()
