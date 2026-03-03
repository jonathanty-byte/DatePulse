"""
Round 4 — Creative / niche terms + Google Trends TOPICS (not just search terms).

Key: our target [100,74,68,65,86,72,89,82,75,83,78,60] has r=0.995 with
Adjust mobile app install benchmarks. Let's find Google Trends equivalents.

Also testing: broader categories and topics that follow app lifecycle patterns.
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
    # Direct mobile app terms
    "application mobile",
    "app store",
    "google play",
    "application gratuite",
    "telecharger",
    "installer",
    "desinstaller",
    "mise a jour",

    # EXACT dating funnel terms
    "comment seduire une fille",
    "comment plaire",
    "comment aborder une fille",
    "comment parler a une fille",
    "message tinder",
    "match tinder",
    "super like",
    "phrase d'accroche",
    "phrase d'accroche tinder",

    # Lifestyle that might match install curve
    "mincir",
    "maigrir",
    "abdos",
    "ete corps",
    "plage",
    "maillot de bain",
    "bronzer",

    # Calendar-driven (Jan, rentree patterns)
    "inscription",
    "agenda",
    "planning",
    "organisation",
    "to do list",

    # Nightlife / social
    "boite de nuit",
    "club",
    "soiree",
    "after work",
    "aperitif",
    "apero",

    # Emotional states
    "deprime",
    "moral",
    "blues",
    "envie",
    "desir",
    "passion",
    "romantique",

    # Specific patterns
    "nouvel an celibataire",
    "saint valentin",
    "ete celibataire",
    "rentree celibataire",

    # Misc high-volume
    "meteo",
    "recette",
    "sport",
    "musique",
    "film",
    "livre",
    "mode",
    "shopping",
    "cadeau",
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
    print("ROUND 4 - Creative & Niche Terms")
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
