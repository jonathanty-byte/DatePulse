"""
Find Google Trends terms matching APP_MONTHLY Tinder curve - Round 2.

Key insight from Round 1: direct dating terms don't match well (r<0.54).
Our target curve follows INSTALL/DOWNLOAD patterns, not search patterns.
The curve signature: Jan peak (100), spring trough (65), summer rebound (89), Dec trough (60).

Strategy: Test terms that follow seasonal install/engagement patterns:
- New Year resolutions (Jan spike)
- Summer activity (Jul spike)
- Year-end decline (Dec trough)
"""

import sys
import io
import time
import numpy as np
from pytrends.request import TrendReq

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Target: APP_MONTHLY tinder
TARGET = np.array([100, 74, 68, 65, 86, 72, 89, 82, 75, 83, 78, 60], dtype=float)

# Round 2 candidates — more creative, focusing on SEASONAL BEHAVIOR patterns
CANDIDATES = [
    # New Year resolution behavior (Jan spike pattern)
    "resolution",
    "bonnes resolutions",
    "nouvelle annee",
    "recommencer",
    "changement",
    "nouveau depart",

    # Download/install related
    "telecharger application",
    "nouvelle application",
    "meilleures applications",
    "top application",
    "play store",

    # Self-improvement (follows install curves)
    "regime",
    "perdre du poids",
    "salle de sport",
    "musculation",
    "fitness",
    "coach sportif",
    "abonnement salle",

    # Seasonal social activities
    "vacances ete",
    "vacances",
    "voyage",
    "weekend",
    "activite",

    # Emotional/behavioral patterns
    "se remettre en forme",
    "motivation",
    "objectif",
    "confiance en soi",
    "estime de soi",
    "developpement personnel",

    # Weather-influenced indoor activities
    "netflix",
    "serie",
    "jeux video",
    "lire un livre",

    # Specific dating sub-terms
    "tinder france",
    "speed dating",
    "soiree celibataire",
    "rencontrer des gens",

    # Commerce patterns (similar seasonal curves)
    "promotion",
    "soldes",
    "achat en ligne",
    "amazon",
    "livraison",

    # Health / wellbeing (Jan+Sep spikes)
    "medecin",
    "psychologue",
    "therapie",
    "bien-etre",

    # Social media patterns
    "instagram",
    "tiktok",
    "snapchat",
    "reseaux sociaux",
]


def pearson_corr(a, b):
    if len(a) != len(b) or len(a) == 0:
        return 0.0
    a_m = a - a.mean()
    b_m = b - b.mean()
    d = np.sqrt((a_m**2).sum() * (b_m**2).sum())
    return float((a_m * b_m).sum() / d) if d else 0.0


def normalize_to_100(arr):
    mx = arr.max()
    return arr / mx * 100 if mx else arr


def fetch_monthly(pytrends, keyword):
    try:
        pytrends.build_payload([keyword], timeframe="2020-01-01 2024-12-31", geo="FR")
        df = pytrends.interest_over_time()
        if df.empty:
            return None
        df_2024 = df[df.index.year == 2024]
        if len(df_2024) < 12:
            pytrends.build_payload([keyword], timeframe="2024-01-01 2024-12-31", geo="FR")
            df = pytrends.interest_over_time()
            if df.empty:
                return None
            df_2024 = df.resample("MS").mean()
        values = df_2024[keyword].values[:12].astype(float)
        return values if len(values) >= 12 else None
    except Exception as e:
        print(f"  ERR: {e}")
        return None


def main():
    print("=" * 70)
    print("ROUND 2 - Google Trends Correlation Finder")
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
        tag = ">>>" if corr >= 0.85 else "**" if corr >= 0.70 else ""
        print(f"r = {corr:.4f} {tag}  | {[int(x) for x in norm]}")
        time.sleep(2)

    results.sort(key=lambda x: x["corr"], reverse=True)

    print("\n" + "=" * 70)
    print("RESULTS (sorted)")
    print("=" * 70)
    for i, r in enumerate(results):
        mark = " <<<" if r["corr"] >= 0.85 else " **" if r["corr"] >= 0.70 else ""
        print(f"{i+1:>3}. {r['term']:<35} r = {r['corr']:.4f}{mark}")

    # Top 5 detail
    months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]
    print(f"\n{'Mois':<6} {'TARGET':<8}", end="")
    for r in results[:5]:
        print(f"{r['term'][:10]:<12}", end="")
    print()
    for m in range(12):
        print(f"{months[m]:<6} {TARGET[m]:<8.0f}", end="")
        for r in results[:5]:
            print(f"{r['norm'][m]:<12.0f}", end="")
        print()


if __name__ == "__main__":
    main()
