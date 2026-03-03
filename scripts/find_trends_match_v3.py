"""
Round 3 — Focus on the EXACT curve shape.

Target: [100, 74, 68, 65, 86, 72, 89, 82, 75, 83, 78, 60]
Shape: Jan high -> spring trough -> May rebound -> Jul peak -> gradual decline -> Dec trough

Key insight: This matches "INSTALL" patterns from Adjust benchmarks.
The pattern has:
  1. Winter peak (Jan)
  2. Spring trough (Mar-Apr)
  3. Summer rebound (May, Jul)
  4. Oct bump (cuffing)
  5. Dec decline (holidays)

This is very similar to:
- App install patterns (most app categories)
- Gym/fitness enrollment (Jan resolution + summer body)
- Job search (Jan + rentrée Sep)
- Real estate search (Jan + summer)

Also testing: weighted combinations & long-tail queries
"""

import sys
import io
import time
import numpy as np
from pytrends.request import TrendReq

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

TARGET = np.array([100, 74, 68, 65, 86, 72, 89, 82, 75, 83, 78, 60], dtype=float)

CANDIDATES = [
    # Job search (Jan spike + Sep rentrée = similar double pattern?)
    "offre emploi",
    "recherche emploi",
    "pole emploi",
    "recrutement",
    "cv",
    "lettre de motivation",
    "entretien embauche",
    "indeed",
    "linkedin",

    # Real estate (Jan + summer pattern)
    "appartement",
    "location appartement",
    "immobilier",
    "louer appartement",
    "demenagement",

    # Education / back to school
    "formation",
    "cours en ligne",
    "apprendre",

    # Seasonal hobbies matching our pattern
    "running",
    "course a pied",
    "jogging",
    "marche",
    "randonnee",
    "velo",

    # Beauty / self-care (dating adjacent, Jan + summer pattern)
    "coiffeur",
    "coupe de cheveux",
    "maquillage",
    "soin visage",
    "beaute",
    "parfum",

    # Social / going out
    "restaurant",
    "cinema",
    "concert",
    "spectacle",
    "theatre",
    "sortie",

    # Dating-adjacent specific
    "comment draguer",
    "seduction",
    "attirance",
    "plaire",
    "charme",

    # Consumer tech (app install proxy)
    "iphone",
    "samsung",
    "smartphone",
    "telephone",
    "forfait",

    # Misc that might have the right seasonal shape
    "assurance",
    "banque",
    "credit",
    "mutuelle",
    "abonnement",
    "inscription",
]


def pearson_corr(a, b):
    a_m, b_m = a - a.mean(), b - b.mean()
    d = np.sqrt((a_m**2).sum() * (b_m**2).sum())
    return float((a_m * b_m).sum() / d) if d else 0.0


def normalize_to_100(arr):
    mx = arr.max()
    return arr / mx * 100 if mx else arr


def fetch_monthly(pt, kw):
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
        print(f"  ERR: {e}")
        return None


def main():
    print("=" * 70)
    print("ROUND 3 - Expanded Search")
    print("=" * 70)
    print(f"Target: {TARGET.tolist()}")
    print(f"Testing {len(CANDIDATES)} terms...\n")

    pt = TrendReq(hl="fr-FR", tz=60)
    results = []

    for i, term in enumerate(CANDIDATES):
        print(f"[{i+1}/{len(CANDIDATES)}] '{term}' ... ", end="", flush=True)
        data = fetch_monthly(pt, term)
        if data is None:
            print("NO DATA")
            continue
        norm = normalize_to_100(data)
        corr = pearson_corr(TARGET, norm)
        results.append({"term": term, "corr": corr, "norm": norm.tolist()})
        tag = " <<<" if corr >= 0.85 else " **" if corr >= 0.70 else ""
        print(f"r = {corr:.4f}{tag}  | {[int(x) for x in norm]}")
        time.sleep(2)

    results.sort(key=lambda x: x["corr"], reverse=True)

    print("\n" + "=" * 70)
    print("RESULTS (sorted)")
    print("=" * 70)
    for i, r in enumerate(results):
        mark = " <<<" if r["corr"] >= 0.85 else " **" if r["corr"] >= 0.70 else ""
        print(f"{i+1:>3}. {r['term']:<35} r = {r['corr']:.4f}{mark}")

    months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]
    print(f"\n{'Mois':<6} {'TARGET':<8}", end="")
    for r in results[:8]:
        print(f"{r['term'][:10]:<12}", end="")
    print()
    for m in range(12):
        print(f"{months[m]:<6} {TARGET[m]:<8.0f}", end="")
        for r in results[:8]:
            print(f"{r['norm'][m]:<12.0f}", end="")
        print()

    print(f"\n{'r=':<6} {'1.000':<8}", end="")
    for r in results[:8]:
        print(f"{r['corr']:<12.4f}", end="")
    print()


if __name__ == "__main__":
    main()
