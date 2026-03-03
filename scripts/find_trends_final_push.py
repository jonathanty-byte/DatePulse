"""
FINAL PUSH: We have great pairs at r=0.86/Sp=0.89.
Now optimize triples and quads from the best terms to push past 0.95.

Best terms discovered:
- coco site de rencontre (niche dating site search)
- site de rencontre gratuit (free dating site)
- site de rencontre (dating site)
- tinder gold (premium feature)
- site de rencontre gay (gay dating)
- badoo site de rencontre
- avis tinder (tinder reviews)
- tinder, badoo, couple, rencontre, serie

Best pair: coco(0.41)+site de rencontre gratuit(0.59) = r=0.86, Sp=0.89
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


def pearson_corr(a, b):
    a_m, b_m = a - a.mean(), b - b.mean()
    d = np.sqrt((a_m**2).sum() * (b_m**2).sum())
    return float((a_m * b_m).sum() / d) if d else 0.0

def spearman_corr(a, b):
    r, _ = stats.spearmanr(a, b)
    return float(r) if not np.isnan(r) else 0.0

def normalize_to_100(arr):
    mx = arr.max()
    return arr / mx * 100 if mx else arr


def fetch_batch(pt, keywords, retries=4):
    for attempt in range(retries):
        try:
            pt.build_payload(keywords, timeframe="2024-01-01 2024-12-31", geo="FR")
            df = pt.interest_over_time()
            if df.empty:
                return {}
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
                print(f"\n  429! Wait {wait}s...", end="", flush=True)
                time.sleep(wait)
            else:
                print(f"\n  ERR: {e}", end="")
                return {}
    return {}


def optimize_2(d1, d2, t, steps=200):
    best_c, best_w = -1, 0.5
    for w in np.linspace(0, 1, steps+1):
        c = pearson_corr(t, normalize_to_100(d1*w + d2*(1-w)))
        if c > best_c: best_c, best_w = c, w
    return best_w, best_c

def optimize_3(d1, d2, d3, t, steps=60):
    best_c, best_w = -1, (1/3,1/3,1/3)
    for w1 in np.linspace(0, 1, steps+1):
        for w2 in np.linspace(0, 1-w1, max(2, int(steps*(1-w1))+1)):
            w3 = max(0, 1-w1-w2)
            c = pearson_corr(t, normalize_to_100(d1*w1+d2*w2+d3*w3))
            if c > best_c: best_c, best_w = c, (w1,w2,w3)
    return best_w, best_c

def optimize_4(dl, t, steps=20):
    best_c, best_w = -1, (0.25,)*4
    for w1 in np.linspace(0, 1, steps+1):
        for w2 in np.linspace(0, 1-w1, max(2, int(steps*(1-w1))+1)):
            for w3 in np.linspace(0, 1-w1-w2, max(2, int(steps*(1-w1-w2))+1)):
                w4 = max(0, 1-w1-w2-w3)
                c = pearson_corr(t, normalize_to_100(dl[0]*w1+dl[1]*w2+dl[2]*w3+dl[3]*w4))
                if c > best_c: best_c, best_w = c, (w1,w2,w3,w4)
    return best_w, best_c


def main():
    pt = TrendReq(hl="fr-FR", tz=60)
    data = {}

    print("=" * 70)
    print("FINAL PUSH — Fetching best terms")
    print("=" * 70)

    # Fetch in 3 batches of 5
    batches = [
        ["coco site de rencontre", "site de rencontre gratuit", "site de rencontre", "tinder gold", "site de rencontre gay"],
        ["badoo site de rencontre", "avis tinder", "tinder", "badoo", "rencontre"],
        ["couple", "serie", "meetic", "sexe", "site de rencontre meetic"],
    ]

    for bi, batch in enumerate(batches):
        print(f"\nBatch {bi+1}/{len(batches)}: {batch}")
        r = fetch_batch(pt, batch)
        for kw, d in r.items():
            data[kw] = d
            pc = pearson_corr(TARGET, d)
            sc = spearman_corr(TARGET, d)
            print(f"  {kw:<35} P={pc:.4f} Sp={sc:.4f} | {[int(x) for x in d]}")
        time.sleep(15)

    print(f"\n{len(data)} terms loaded.")

    # ═══ PAIRS ═══
    terms = list(data.keys())
    print(f"\n{'='*70}")
    print("TOP 20 PAIRS")
    print(f"{'='*70}")
    pairs = []
    for t1, t2 in itertools.combinations(terms, 2):
        w, c = optimize_2(data[t1], data[t2], TARGET)
        sc = spearman_corr(TARGET, normalize_to_100(data[t1]*w + data[t2]*(1-w)))
        pairs.append((t1, t2, w, c, sc))
    pairs.sort(key=lambda x: x[3], reverse=True)
    for i, (t1, t2, w, c, sc) in enumerate(pairs[:20]):
        mark = " <<< TARGET!" if c >= 0.95 else " **" if c >= 0.90 else " *" if c >= 0.80 else ""
        print(f"  {i+1:>3}. P={c:.4f} Sp={sc:.4f}{mark}  {t1}({w:.2f})+{t2}({1-w:.2f})")

    # ═══ TRIPLES ═══
    print(f"\n{'='*70}")
    print("TOP 20 TRIPLES")
    print(f"{'='*70}")
    # Use all terms since we only have ~15
    triples = []
    for combo in itertools.combinations(terms, 3):
        w, c = optimize_3(data[combo[0]], data[combo[1]], data[combo[2]], TARGET)
        combo_data = normalize_to_100(sum(data[combo[i]]*w[i] for i in range(3)))
        sc = spearman_corr(TARGET, combo_data)
        triples.append((combo, w, c, sc, combo_data))
    triples.sort(key=lambda x: x[2], reverse=True)
    for i, (combo, w, c, sc, _) in enumerate(triples[:20]):
        mark = " <<< TARGET!" if c >= 0.95 else " **" if c >= 0.90 else " *" if c >= 0.80 else ""
        label = "+".join(f"{t}({w[j]:.2f})" for j, t in enumerate(combo))
        print(f"  {i+1:>3}. P={c:.4f} Sp={sc:.4f}{mark}  {label}")

    # ═══ QUADS ═══
    print(f"\n{'='*70}")
    print("TOP 10 QUADS")
    print(f"{'='*70}")
    # Use terms from top triples
    quad_terms = set()
    for combo, _, _, _, _ in triples[:10]:
        quad_terms.update(combo)
    qt = list(quad_terms)
    quads = []
    for combo in itertools.combinations(qt, 4):
        dl = [data[t] for t in combo]
        w, c = optimize_4(dl, TARGET)
        combo_data = normalize_to_100(sum(dl[i]*w[i] for i in range(4)))
        sc = spearman_corr(TARGET, combo_data)
        quads.append((combo, w, c, sc, combo_data))
    quads.sort(key=lambda x: x[2], reverse=True)
    for i, (combo, w, c, sc, _) in enumerate(quads[:10]):
        mark = " <<< TARGET!" if c >= 0.95 else " **" if c >= 0.90 else ""
        label = "+".join(f"{t}({w[j]:.2f})" for j, t in enumerate(combo))
        print(f"  {i+1:>3}. P={c:.4f} Sp={sc:.4f}{mark}  {label}")

    # ═══ FINAL RESULT ═══
    print(f"\n{'='*70}")
    print("DEFINITIVE RESULT")
    print(f"{'='*70}")
    print(f"\n  Target:      {TARGET.tolist()}")

    if pairs:
        t1, t2, w, c, sc = pairs[0]
        cd = normalize_to_100(data[t1]*w + data[t2]*(1-w))
        print(f"  Best pair:   {[int(x) for x in cd]}  P={c:.4f} Sp={sc:.4f}")
        print(f"               {t1}({w:.2f}) + {t2}({1-w:.2f})")

    if triples:
        combo, w, c, sc, cd = triples[0]
        print(f"  Best triple: {[int(x) for x in cd]}  P={c:.4f} Sp={sc:.4f}")
        print(f"               {' + '.join(f'{t}({w[j]:.2f})' for j,t in enumerate(combo))}")

    if quads:
        combo, w, c, sc, cd = quads[0]
        print(f"  Best quad:   {[int(x) for x in cd]}  P={c:.4f} Sp={sc:.4f}")
        print(f"               {' + '.join(f'{t}({w[j]:.2f})' for j,t in enumerate(combo))}")


if __name__ == "__main__":
    main()
