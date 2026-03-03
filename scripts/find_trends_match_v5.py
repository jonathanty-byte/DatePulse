"""
Round 5 — FINAL APPROACH: Longer delays to avoid 429 + smarter term selection.

After 3 rounds (~140 terms), best so far:
  1. "serie" r=0.71
  2. "vacances ete" r=0.61
  3. "premier date" r=0.54
  4. "abonnement" r=0.52

The target curve [100,74,68,65,86,72,89,82,75,83,78,60] has a very specific
"bimodal with winter peak" pattern. Let me analyze what this means:
- Strong Jan (100), weak spring (65), strong summer (86-89), moderate fall (75-83), weak Dec (60)
- The key differentiator: May REBOUNDS from Apr trough, Oct is HIGHER than Sep

New strategy: Focus on terms related to:
1. Things people DO in January and summer but NOT December
2. Self-improvement / lifestyle change patterns
3. Consumer behavior patterns
4. Also try: averaging multiple terms together (virtual composite)

Also using longer delays (5s) to avoid rate limiting.
"""

import sys
import io
import time
import numpy as np
from pytrends.request import TrendReq

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

TARGET = np.array([100, 74, 68, 65, 86, 72, 89, 82, 75, 83, 78, 60], dtype=float)

# Carefully curated candidates from domains we haven't tested
CANDIDATES = [
    # Job search (classic Jan + Sep bimodal)
    "offre emploi",
    "pole emploi",
    "indeed",
    "cv",
    "linkedin",

    # Real estate (Jan + summer)
    "immobilier",
    "appartement a louer",
    "location",
    "demenagement",

    # Education
    "formation",
    "cours",

    # Sport/outdoor (Jan resolution + summer)
    "running",
    "randonnee",
    "velo",
    "piscine",
    "natation",

    # Beauty (dating adjacent)
    "coiffeur",
    "parfum",
    "maquillage",

    # Social
    "restaurant",
    "cinema",
    "sortie",
    "concert",

    # Consumer / tech
    "iphone",
    "samsung",
    "smartphone",
    "application",

    # Health
    "medecin",
    "dentiste",
    "pharmacie",

    # Misc with potential bimodal patterns
    "voiture",
    "auto ecole",
    "permis de conduire",
    "deco",
    "bricolage",
    "jardinage",
    "cuisine",
    "recette",
    "livre",
    "lecture",
]


def pearson_corr(a, b):
    a_m, b_m = a - a.mean(), b - b.mean()
    d = np.sqrt((a_m**2).sum() * (b_m**2).sum())
    return float((a_m * b_m).sum() / d) if d else 0.0

def normalize_to_100(arr):
    mx = arr.max()
    return arr / mx * 100 if mx else arr

def fetch_monthly(pt, kw, retries=3):
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
                print(f"\n  429 rate limit! Waiting {wait}s...", end="", flush=True)
                time.sleep(wait)
            else:
                print(f"\n  ERR: {e}", end="")
                return None
    return None


def main():
    print("=" * 70)
    print("ROUND 5 - Smart search with longer delays")
    print("=" * 70)
    print(f"Target: {TARGET.tolist()}")
    print(f"Testing {len(CANDIDATES)} terms (5s delay between each)...\n")

    pt = TrendReq(hl="fr-FR", tz=60)
    results = []

    for i, term in enumerate(CANDIDATES):
        print(f"[{i+1}/{len(CANDIDATES)}] '{term}' ... ", end="", flush=True)
        data = fetch_monthly(pt, term)
        if data is None:
            print("NO DATA")
            time.sleep(5)
            continue
        norm = normalize_to_100(data)
        corr = pearson_corr(TARGET, norm)
        results.append({"term": term, "corr": corr, "norm": norm.tolist()})
        tag = " <<<" if corr >= 0.85 else " **" if corr >= 0.70 else ""
        print(f"r = {corr:.4f}{tag}  | {[int(x) for x in norm]}")
        time.sleep(5)  # Longer delay to be safe

    results.sort(key=lambda x: x["corr"], reverse=True)

    print("\n" + "=" * 70)
    print("RESULTS (sorted)")
    print("=" * 70)
    for i, r in enumerate(results):
        mark = " <<<" if r["corr"] >= 0.85 else " **" if r["corr"] >= 0.70 else ""
        print(f"{i+1:>3}. {r['term']:<35} r = {r['corr']:.4f}{mark}")

    # === GRAND TOTAL across all rounds ===
    print("\n" + "=" * 70)
    print("CUMULATIVE BEST (all rounds)")
    print("=" * 70)

    # Hardcode best from previous rounds
    all_best = [
        ("serie", 0.7059),
        ("vacances ete", 0.6114),
        ("premier date", 0.5353),
        ("abonnement", 0.5204),
        ("nouvelle annee", 0.5051),
        ("rencontre", 0.5008),
        ("photo profil", 0.4999),
        ("developpement personnel", 0.4999),
        ("single", 0.4912),
        ("promotion", 0.4840),
        ("amazon", 0.4834),
    ]
    # Add current round results
    for r in results:
        all_best.append((r["term"], r["corr"]))

    all_best.sort(key=lambda x: x[1], reverse=True)

    print(f"\nTop 15 across ALL rounds:")
    for i, (term, corr) in enumerate(all_best[:15]):
        mark = " <<<" if corr >= 0.85 else " **" if corr >= 0.70 else ""
        print(f"{i+1:>3}. {term:<35} r = {corr:.4f}{mark}")


if __name__ == "__main__":
    main()
