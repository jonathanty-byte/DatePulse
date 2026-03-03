"""
SMART approach: Minimize API calls by fetching COMPARATIVE data.
Google Trends allows comparing up to 5 terms in ONE request.
Instead of 38 separate requests, we need only ~8 requests.

Then compute seasonal profiles + optimize combinations locally.
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
MONTHS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]


def pearson_corr(a, b):
    a_m, b_m = a - a.mean(), b - b.mean()
    d = np.sqrt((a_m**2).sum() * (b_m**2).sum())
    return float((a_m * b_m).sum() / d) if d else 0.0

def normalize_to_100(arr):
    mx = arr.max()
    return arr / mx * 100 if mx else arr


def fetch_batch_seasonal(pt, keywords, retries=4):
    """
    Fetch up to 5 keywords in ONE request, compute seasonal profiles.
    Returns dict {keyword: 12-value normalized array}.
    """
    for attempt in range(retries):
        try:
            pt.build_payload(
                keywords,
                timeframe="2019-01-01 2024-12-31",
                geo="FR",
            )
            df = pt.interest_over_time()
            if df.empty:
                return {}

            # Skip 2020 (COVID distortion)
            df = df[df.index.year != 2020]

            results = {}
            for kw in keywords:
                if kw not in df.columns:
                    continue
                monthly_avg = df.groupby(df.index.month)[kw].mean()
                if len(monthly_avg) < 12:
                    continue
                values = np.array([monthly_avg.get(m, 0) for m in range(1, 13)], dtype=float)
                if values.max() > 0:
                    results[kw] = normalize_to_100(values)

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


def optimize_2(d1, d2, target, steps=100):
    best_c, best_w = -1, 0.5
    for w in np.linspace(0, 1, steps + 1):
        combo = d1 * w + d2 * (1 - w)
        c = pearson_corr(target, normalize_to_100(combo))
        if c > best_c:
            best_c, best_w = c, w
    return best_w, best_c

def optimize_3(d1, d2, d3, target, steps=40):
    best_c, best_w = -1, (1/3, 1/3, 1/3)
    for w1 in np.linspace(0, 1, steps + 1):
        for w2 in np.linspace(0, 1 - w1, max(2, int(steps * (1 - w1)) + 1)):
            w3 = max(0, 1 - w1 - w2)
            combo = d1 * w1 + d2 * w2 + d3 * w3
            c = pearson_corr(target, normalize_to_100(combo))
            if c > best_c:
                best_c, best_w = c, (w1, w2, w3)
    return best_w, best_c

def optimize_4(d_list, target, steps=15):
    best_c, best_w = -1, tuple([0.25]*4)
    for w1 in np.linspace(0, 1, steps + 1):
        for w2 in np.linspace(0, 1 - w1, max(2, int(steps*(1-w1))+1)):
            for w3 in np.linspace(0, 1-w1-w2, max(2, int(steps*(1-w1-w2))+1)):
                w4 = max(0, 1-w1-w2-w3)
                combo = sum(d*w for d, w in zip(d_list, [w1,w2,w3,w4]))
                c = pearson_corr(target, normalize_to_100(combo))
                if c > best_c:
                    best_c, best_w = c, (w1,w2,w3,w4)
    return best_w, best_c


def main():
    print("=" * 70)
    print("SMART SEASONAL — Batch requests + multi-year averaging")
    print("=" * 70)

    pt = TrendReq(hl="fr-FR", tz=60)

    # Organize terms into batches of 5 (Google Trends max per request)
    batches = [
        ["tinder", "site de rencontre", "couple", "serie", "badoo"],
        ["rencontre", "celibataire", "amour", "sexe", "relation"],
        ["meetic", "film", "netflix", "livre", "cuisine"],
        ["sport", "salle de sport", "regime", "dentiste", "coiffeur"],
        ["soldes", "promotion", "restaurant", "cinema", "ennui"],
        ["sortir", "vacances", "voyage", "shopping", "mode"],
        ["single", "dating", "crush", "confiance en soi", "motivation"],
        ["demenagement", "appartement", "beaute", "lecture", "abonnement"],
    ]

    all_data = {}

    for batch_i, batch in enumerate(batches):
        print(f"\nBatch {batch_i+1}/{len(batches)}: {batch} ...", flush=True)
        result = fetch_batch_seasonal(pt, batch)
        for kw, data in result.items():
            corr = pearson_corr(TARGET, data)
            all_data[kw] = data
            tag = " <<<" if corr >= 0.90 else " **" if corr >= 0.80 else " *" if corr >= 0.70 else ""
            print(f"  {kw:<25} r = {corr:.4f}{tag} | {[int(x) for x in data]}")
        time.sleep(15)  # More generous delay between batches

    print(f"\n\nTotal terms fetched: {len(all_data)}")

    # ═══ SINGLES ═══
    print("\n" + "=" * 70)
    print("SINGLES (seasonal profile, multi-year avg, no COVID)")
    print("=" * 70)
    singles = [(k, pearson_corr(TARGET, v)) for k, v in all_data.items()]
    singles.sort(key=lambda x: x[1], reverse=True)
    for i, (t, c) in enumerate(singles):
        mark = " <<<" if c >= 0.90 else " **" if c >= 0.80 else " *" if c >= 0.70 else ""
        print(f"  {i+1:>3}. {t:<25} r = {c:.4f}{mark}")

    # ═══ PAIRS ═══
    print("\n" + "=" * 70)
    print("OPTIMIZED PAIRS (100-step weight search)")
    print("=" * 70)
    terms = list(all_data.keys())
    pairs = []
    for t1, t2 in itertools.combinations(terms, 2):
        w, c = optimize_2(all_data[t1], all_data[t2], TARGET)
        pairs.append((t1, t2, w, c))
    pairs.sort(key=lambda x: x[3], reverse=True)
    print("Top 20:")
    for i, (t1, t2, w, c) in enumerate(pairs[:20]):
        mark = " <<<" if c >= 0.95 else " **" if c >= 0.90 else " *" if c >= 0.80 else ""
        print(f"  {i+1:>3}. {t1}({w:.2f})+{t2}({1-w:.2f})  r = {c:.4f}{mark}")

    # ═══ TRIPLES ═══
    print("\n" + "=" * 70)
    print("OPTIMIZED TRIPLES")
    print("=" * 70)
    top_pair_terms = set()
    for t1, t2, _, _ in pairs[:20]:
        top_pair_terms.update([t1, t2])
    top_t = list(top_pair_terms)

    triples = []
    for combo in itertools.combinations(top_t, 3):
        w, c = optimize_3(all_data[combo[0]], all_data[combo[1]], all_data[combo[2]], TARGET)
        triples.append((combo, w, c))
    triples.sort(key=lambda x: x[2], reverse=True)
    print(f"Top 15 (from {len(top_t)} best terms):")
    for i, (combo, w, c) in enumerate(triples[:15]):
        mark = " <<< TARGET!" if c >= 0.95 else " **" if c >= 0.90 else " *" if c >= 0.80 else ""
        label = "+".join(f"{t}({w[j]:.2f})" for j, t in enumerate(combo))
        print(f"  {i+1:>3}. r = {c:.4f}{mark}  {label}")

    # ═══ QUADS ═══
    print("\n" + "=" * 70)
    print("OPTIMIZED QUADS (4 terms)")
    print("=" * 70)
    quad_terms = set()
    for combo, _, _ in triples[:10]:
        quad_terms.update(combo)
    qt = list(quad_terms)

    quads = []
    for combo in itertools.combinations(qt, 4):
        d = [all_data[t] for t in combo]
        w, c = optimize_4(d, TARGET)
        quads.append((combo, w, c))
    quads.sort(key=lambda x: x[2], reverse=True)
    print(f"Top 10 (from {len(qt)} best terms):")
    for i, (combo, w, c) in enumerate(quads[:10]):
        mark = " <<< TARGET!" if c >= 0.95 else " **" if c >= 0.90 else ""
        label = "+".join(f"{t}({w[j]:.2f})" for j, t in enumerate(combo))
        print(f"  {i+1:>3}. r = {c:.4f}{mark}  {label}")

    # ═══ GRAND SUMMARY ═══
    print("\n" + "=" * 70)
    print("ABSOLUTE BEST — ALL STRATEGIES")
    print("=" * 70)
    everything = []
    for t, c in singles[:5]:
        everything.append((f"[1 term]  {t}", c))
    for t1, t2, w, c in pairs[:5]:
        everything.append((f"[2 terms] {t1}({w:.2f})+{t2}({1-w:.2f})", c))
    for combo, w, c in triples[:5]:
        label = "+".join(f"{t}({w[j]:.2f})" for j, t in enumerate(combo))
        everything.append((f"[3 terms] {label}", c))
    for combo, w, c in quads[:3]:
        label = "+".join(f"{t}({w[j]:.2f})" for j, t in enumerate(combo))
        everything.append((f"[4 terms] {label}", c))

    everything.sort(key=lambda x: x[1], reverse=True)
    print("\nTHE DEFINITIVE TOP 20:")
    for i, (name, c) in enumerate(everything[:20]):
        mark = " <<< TARGET!" if c >= 0.95 else " <<<" if c >= 0.90 else " **" if c >= 0.80 else ""
        print(f"  {i+1:>3}. r = {c:.4f}{mark}  {name}")

    # Best match detailed view
    if singles:
        best_t = singles[0][0]
        print(f"\n  Target:     {TARGET.tolist()}")
        print(f"  Best match: {[int(x) for x in all_data[best_t]]}  ('{best_t}')")

    if pairs:
        t1, t2, w, c = pairs[0]
        combo_data = normalize_to_100(all_data[t1]*w + all_data[t2]*(1-w))
        print(f"  Best pair:  {[int(x) for x in combo_data]}  ('{t1}'({w:.2f})+'{t2}'({1-w:.2f}))")

    if triples:
        combo, w, c = triples[0]
        combo_data = normalize_to_100(sum(all_data[t]*w[i] for i, t in enumerate(combo)))
        print(f"  Best triple:{[int(x) for x in combo_data]}")


if __name__ == "__main__":
    main()
