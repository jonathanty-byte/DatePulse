import { motion } from "framer-motion";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay },
});

function Section({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section className="space-y-4" {...fade(delay)}>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {children}
    </motion.section>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-semibold text-gray-300">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-gray-400">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Methodology() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-white/5 px-4 py-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <a
            href="/"
            className="text-sm font-medium text-gray-400 transition hover:text-white"
          >
            &larr; Retour au dashboard
          </a>
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-lg font-bold text-transparent">
            DatePulse
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-12 px-4 py-12">
        {/* Title */}
        <motion.div {...fade(0)}>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Methodologie
          </h1>
          <p className="mt-3 text-lg text-gray-400">
            Comment DatePulse calcule le score d'activite de chaque app de
            rencontre, heure par heure.
          </p>
        </motion.div>

        {/* ── Principe ──────────────────────────────────── */}
        <Section title="Principe general" delay={0.05}>
          <p className="text-gray-400">
            L'activite sur les apps de rencontre suit des patterns temporels
            previsibles : les utilisateurs swipent plus le dimanche soir qu'un
            mardi matin. Ces patterns sont documentes par les apps elles-memes
            (publications officielles, blogs, RP) et par des cabinets d'analyse
            independants.
          </p>
          <p className="text-gray-400">
            DatePulse agrege ces donnees publiques et les traduit en un score
            0-100 calcule <strong className="text-white">100% cote client</strong>.
            Aucune donnee utilisateur n'est collectee, aucune API externe n'est
            appelee. Le calcul est deterministe et reproductible.
          </p>
        </Section>

        {/* ── Formule ───────────────────────────────────── */}
        <Section title="Formule de scoring" delay={0.1}>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <code className="text-base font-semibold text-brand-400">
              score(t) = hourly[h] &times; weekly[d] &times; monthly[m] / 10 000
              &times; event_multiplier
            </code>
          </div>
          <p className="text-gray-400">
            Le score combine 4 facteurs independants :
          </p>
          <ul className="list-inside list-disc space-y-1 text-gray-400">
            <li>
              <strong className="text-gray-200">Indice horaire (0-100)</strong>{" "}
              — pic a 21h, creux entre 1h-5h
            </li>
            <li>
              <strong className="text-gray-200">Indice journalier (0-100)</strong>{" "}
              — pic le dimanche, creux le vendredi
            </li>
            <li>
              <strong className="text-gray-200">Indice mensuel (0-100)</strong>{" "}
              — pic en janvier, creux en decembre
            </li>
            <li>
              <strong className="text-gray-200">Multiplicateur evenementiel</strong>{" "}
              — boost ou reduction pour les periodes speciales
            </li>
          </ul>
          <p className="text-gray-400">
            Le resultat est borne entre 0 et 100, puis converti en label
            contextuel : Mort plat, Calme, Moyen, Actif, Tres actif, En feu.
          </p>
        </Section>

        {/* ── Sources per factor ─────────────────────────── */}
        <Section title="Sources de donnees" delay={0.15}>
          <h3 className="font-semibold text-gray-200">
            Indice horaire — Pic d'activite dans la soiree
          </h3>
          <Table
            headers={["Source", "Donnee cle", "Impact"]}
            rows={[
              [
                "Tinder Year in Swipe (2023)",
                "Pic d'activite a 21h",
                "Baseline Tinder : 21h = 100",
              ],
              [
                "Nielsen Mobile Panel",
                "Duree moyenne de session par tranche horaire",
                "Confirme le pic 20h-22h tous apps confondus",
              ],
              [
                "Bumble PR Blog",
                "\"Peak hours are 7-9 PM\"",
                "Bumble : pic avance a 19-20h",
              ],
              [
                "Hinge Blog (2024)",
                "\"Most active between 7pm-10pm\"",
                "Hinge : fenetre elargie 19h-22h",
              ],
              [
                "Ogury (2023)",
                "Usage geo-localise, pics aux heures de trajet",
                "Happn : pics 8h et 18h (trajets domicile-travail)",
              ],
            ]}
          />

          <h3 className="mt-6 font-semibold text-gray-200">
            Indice journalier — Le dimanche domine
          </h3>
          <Table
            headers={["Source", "Donnee cle", "Impact"]}
            rows={[
              [
                "Tinder Year in Swipe",
                "Dimanche = jour avec le plus de swipes",
                "Tinder/Hinge : dimanche = 100",
              ],
              [
                "Bumble PR",
                "\"Monday is our busiest day\"",
                "Bumble : lundi = 100 (les femmes initient la semaine)",
              ],
              [
                "Ogury France (2023)",
                "\"Spike on Thursday for Happn\"",
                "Happn : jeudi = 100 (deplacements urbains)",
              ],
              [
                "SwipeStats.io",
                "Vendredi/samedi = creux (sorties IRL)",
                "Tous apps : vendredi-samedi = indices les plus bas",
              ],
            ]}
          />

          <h3 className="mt-6 font-semibold text-gray-200">
            Indice mensuel — Janvier en tete
          </h3>
          <Table
            headers={["Source", "Donnee cle", "Impact"]}
            rows={[
              [
                "Adjust Benchmarks 2023-2024",
                "Janvier : +28% vs moyenne annuelle",
                "Janvier = 100 (record d'installations global)",
              ],
              [
                "Adjust Benchmarks",
                "Mai : +10%, Juillet : +14%, Octobre : +6%",
                "Pics secondaires en mai, juillet, octobre",
              ],
              [
                "data.ai (Jan 2024)",
                "128M installations mondiales en janvier",
                "Confirme le pic janvier comme reference",
              ],
              [
                "Sensor Tower France Q1-Q4 2024",
                "Downloads et MAU par app, par trimestre",
                "Calibrage specifique France per-app",
              ],
              [
                "Sensor Tower France Q1 2025",
                "Hinge en forte croissance, Happn stable",
                "Ajustement des courbes per-app 2025",
              ],
            ]}
          />

          <h3 className="mt-6 font-semibold text-gray-200">
            Evenements speciaux
          </h3>
          <Table
            headers={["Evenement", "Periode", "Effet", "Source"]}
            rows={[
              [
                "Dating Sunday",
                "1er dimanche de janvier",
                "+35%",
                "Tinder/Bumble/Hinge PR (concordant)",
              ],
              [
                "Nouvel An",
                "1-7 janvier",
                "+25%",
                "Adjust : pic d'installations debut janvier",
              ],
              [
                "Pre-Saint-Valentin",
                "1-13 fevrier",
                "+20%",
                "Sensor Tower : spike downloads pre-14 fev",
              ],
              [
                "Pic Ete",
                "Juillet - 20 aout",
                "+8%",
                "Adjust : +14% juillet, +5% aout",
              ],
              [
                "Rentree",
                "1-15 septembre",
                "+10%",
                "Sensor Tower FR : rebond post-vacances",
              ],
              [
                "Cuffing Season",
                "15 oct - 30 nov",
                "+10%",
                "Adjust : +6% oct, tendance US/EU confirmee",
              ],
              [
                "Noel",
                "24-26 decembre",
                "-40%",
                "Tinder Year in Swipe : creux fetes",
              ],
              [
                "Reveillon",
                "31 decembre",
                "-50%",
                "Activite quasi nulle le soir du 31",
              ],
              [
                "15 Aout",
                "15 aout",
                "-30%",
                "Jour ferie, deplacements vacances",
              ],
            ]}
          />
        </Section>

        {/* ── Per-app calibration ────────────────────────── */}
        <Section title="Calibrage par app" delay={0.2}>
          <p className="text-gray-400">
            Chaque app a ses propres patterns. DatePulse maintient des tables
            separees pour Tinder, Bumble, Hinge et Happn, calibrees sur les
            publications specifiques de chaque app.
          </p>
          <Table
            headers={["App", "Pic horaire", "Pic journalier", "Pic mensuel", "Specificite"]}
            rows={[
              [
                "Tinder",
                "21h",
                "Dimanche",
                "Janvier",
                "Baseline — le plus documente",
              ],
              [
                "Bumble",
                "19-20h",
                "Lundi",
                "Fevrier",
                "Les femmes initient — pic plus tot dans la soiree et la semaine",
              ],
              [
                "Hinge",
                "19-22h",
                "Dimanche",
                "Fevrier / Aout",
                "\"Designed to be deleted\" — utilisateurs plus engages",
              ],
              [
                "Happn",
                "8h + 18h",
                "Jeudi",
                "Janvier",
                "Proximite = pics aux heures de trajet urbain",
              ],
            ]}
          />
        </Section>

        {/* ── Pool Freshness ─────────────────────────────── */}
        <Section title="Pool Freshness Score" delay={0.25}>
          <p className="text-gray-400">
            En complement du score d'activite (qui mesure{" "}
            <em>quand</em> les utilisateurs sont connectes), le Pool Freshness
            mesure la <strong className="text-white">qualite du pool de profils</strong>{" "}
            ce mois-ci : y a-t-il beaucoup de nouveaux inscrits, ou le pool stagne ?
          </p>

          <h3 className="font-semibold text-gray-200">Formule</h3>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <code className="text-base font-semibold text-brand-400">
              netGrowth = installs &times; 0.6 + (100 &minus; churn) &times; 0.4
            </code>
          </div>
          <ul className="list-inside list-disc space-y-1 text-gray-400">
            <li>
              <strong className="text-gray-200">Installs (0-100)</strong> — Indice
              d'installations du mois, normalise. Source : Adjust Benchmarks
              2023-2024 (% vs moyenne annuelle, toutes apps de rencontre
              confondues).
            </li>
            <li>
              <strong className="text-gray-200">Churn (0-100)</strong> — Intensite
              des departs. Source : Sensor Tower (taux de churn MoM 20-30% pour
              les apps de rencontre), croise avec les tendances MAU France.
            </li>
          </ul>

          <h3 className="mt-4 font-semibold text-gray-200">Niveaux</h3>
          <Table
            headers={["Score", "Label", "Signification"]}
            rows={[
              ["75+", "Tres frais", "Afflux de nouveaux profils — chances de matcher au plus haut"],
              ["60-74", "Frais", "Bon renouvellement — de nouveaux profils a decouvrir"],
              ["45-59", "Stable", "Pool equilibre — activite normale"],
              ["30-44", "Stagnant", "Peu de nouveaux profils — les memes tetes reviennent"],
              ["0-29", "En vidange", "Le pool se vide — beaucoup de departs, peu d'arrivees"],
            ]}
          />

          <h3 className="mt-4 font-semibold text-gray-200">
            Donnees source detaillees
          </h3>
          <Table
            headers={["Mois", "Installations", "Churn", "Net Growth"]}
            rows={[
              ["Janvier", "100 (pic)", "30 (bas)", "88 — Tres frais"],
              ["Fevrier", "74", "55", "62 — Frais"],
              ["Mars", "62", "85", "43 — Stagnant"],
              ["Avril", "58", "90", "39 — Stagnant"],
              ["Mai", "86", "60", "68 — Frais"],
              ["Juin", "68", "50", "61 — Frais"],
              ["Juillet", "89", "35", "79 — Tres frais"],
              ["Aout", "82", "40", "73 — Frais"],
              ["Septembre", "72", "65", "57 — Stable"],
              ["Octobre", "83", "55", "68 — Frais"],
              ["Novembre", "75", "70", "57 — Stable"],
              ["Decembre", "55 (creux)", "100 (pic)", "33 — Stagnant"],
            ]}
          />
        </Section>

        {/* ── Limites ───────────────────────────────────── */}
        <Section title="Limites et transparence" delay={0.3}>
          <ul className="list-inside list-disc space-y-2 text-gray-400">
            <li>
              <strong className="text-gray-200">Donnees publiques uniquement</strong>{" "}
              — DatePulse n'a pas acces aux donnees internes des apps (DAU, MAU
              en temps reel, nombre de swipes). Les indices sont derives de
              publications officielles et d'etudes tierces.
            </li>
            <li>
              <strong className="text-gray-200">Granularite mensuelle limitee</strong>{" "}
              — L'indice mensuel provient de benchmarks annuels agreges. Les
              variations jour par jour au sein d'un mois ne sont pas captees.
            </li>
            <li>
              <strong className="text-gray-200">Pas de donnees geo-localisees</strong>{" "}
              — Les patterns sont calibres pour la France metropolitaine.
              Les variations regionales (Paris vs province) ne sont pas modelisees.
            </li>
            <li>
              <strong className="text-gray-200">Churn estime</strong>{" "}
              — Les taux de churn sont estimes a partir de tendances MAU et de
              donnees sectorielles (20-30% MoM), pas de chiffres exacts par app.
            </li>
            <li>
              <strong className="text-gray-200">Modele statique</strong>{" "}
              — Les tables ne sont pas mises a jour en temps reel. Elles sont
              recalibrees periodiquement quand de nouvelles publications sortent.
            </li>
          </ul>
        </Section>

        {/* ── References ────────────────────────────────── */}
        <Section title="References" delay={0.35}>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-gray-500">
            <li>Adjust — Global App Trends 2024: Dating App Benchmarks</li>
            <li>Sensor Tower — France Dating Apps Quarterly Reports (Q1-Q4 2024, Q1 2025)</li>
            <li>data.ai (ex App Annie) — State of Mobile 2024: Dating Category</li>
            <li>Tinder — Year in Swipe 2023</li>
            <li>Hinge — The Hinge Blog: When to Use Dating Apps (2024)</li>
            <li>Bumble — Press Releases: Busiest Days and Times (2023-2024)</li>
            <li>Nielsen — Mobile Panel: Dating App Session Duration (2023)</li>
            <li>Ogury — Mobile Journey: Dating Apps in France (2023)</li>
            <li>SwipeStats.io — Anonymized Tinder Usage Data (2022-2024)</li>
          </ul>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-8">
        <div className="mx-auto max-w-4xl text-center text-sm text-gray-600">
          <p>
            Construit sur des donnees publiques. Independant.{" "}
            <a href="/" className="underline transition hover:text-gray-400">
              Retour au dashboard
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
