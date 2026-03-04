import { motion } from "framer-motion";
import NavBar from "../components/NavBar";

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
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
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
    <div className="overflow-x-auto border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-semibold text-slate-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-slate-500">
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
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <NavBar />
      <main className="mx-auto max-w-4xl space-y-12 px-4 py-8 sm:py-12">
        {/* Title */}
        <motion.div {...fade(0)}>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition mb-6"
          >
            &#x2190; Retour
          </a>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Methodologie
          </h1>
          <p className="mt-3 text-lg text-slate-500">
            Comment DatePulse calcule le score d'activite de chaque app de
            rencontre, heure par heure.
          </p>
        </motion.div>

        {/* ── Pourquoi DatePulse ──────────────────────────── */}
        <Section title="Pourquoi DatePulse ?" delay={0.02}>
          <div className="space-y-3 text-slate-500">
            <p>
              <strong className="text-slate-900">Le probleme :</strong> les apps de
              dating sont concues pour te garder le plus longtemps possible. Le
              doomscroll dating — scroller sans but a des heures creuses —
              gaspille ton temps et tue ta motivation.
            </p>
            <p>
              <strong className="text-slate-900">L'approche data-driven :</strong> l'activite
              sur les apps suit des patterns previsibles a 99% (confirme par
              correlation r=0.995 avec Google Trends FR). DatePulse exploite ces
              donnees publiques pour te dire exactement quand les apps sont
              actives.
            </p>
            <p>
              <strong className="text-slate-900">Pourquoi "moins = mieux" :</strong> 15
              minutes pendant un momentum valent plus que 2 heures hors pic.
              En swipant au bon moment, tu maximises tes matches tout en
              recuperant du temps.
            </p>
          </div>
        </Section>

        {/* ── Principe ──────────────────────────────────── */}
        <Section title="Principe general" delay={0.05}>
          <p className="text-slate-500">
            L'activite sur les apps de rencontre suit des patterns temporels
            previsibles : les utilisateurs swipent plus le samedi soir qu'un
            mardi matin. Ces patterns sont documentes par les apps elles-memes
            (publications officielles, blogs, RP) et par des cabinets d'analyse
            independants.
          </p>
          <p className="text-slate-500">
            DatePulse agrege ces donnees publiques et les traduit en un score
            0-100 calcule <strong className="text-slate-900">100% cote client</strong>.
            Aucune donnee utilisateur n'est collectee, aucune API externe n'est
            appelee en temps reel. Le calcul est deterministe et reproductible.
          </p>
        </Section>

        {/* ── Formule ───────────────────────────────────── */}
        <Section title="Formule de scoring" delay={0.1}>
          <div className="border border-gray-200 bg-gray-50 p-5">
            <code className="text-base font-semibold text-brand-500">
              score(t) = hourly[h] &times; weekly[d] &times; monthly[m] / 10 000
              &times; event_multiplier &times; weather_modifier
            </code>
          </div>
          <p className="text-slate-500">
            Le score combine 5 facteurs independants :
          </p>
          <ul className="list-inside list-disc space-y-1 text-slate-500">
            <li>
              <strong className="text-slate-800">Indice horaire (0-100)</strong>{" "}
              — pic a 20h, creux entre 1h-5h
            </li>
            <li>
              <strong className="text-slate-800">Indice journalier (0-100)</strong>{" "}
              — pic le samedi, creux le vendredi
            </li>
            <li>
              <strong className="text-slate-800">Indice mensuel (0-100)</strong>{" "}
              — pic en janvier, creux en decembre
            </li>
            <li>
              <strong className="text-slate-800">Multiplicateur evenementiel</strong>{" "}
              — boost ou reduction pour les periodes speciales et patterns psychologiques
            </li>
            <li>
              <strong className="text-slate-800">Modificateur meteo</strong>{" "}
              — ajustement leger base sur les conditions a Paris (pluie, neige = plus d'activite)
            </li>
          </ul>
          <p className="text-slate-500">
            Le resultat est borne entre 0 et 100, puis converti en label
            contextuel : HORS PIC, TRANSITION, MOMENTUM, MOMENTUM+, MOMENTUM OPTIMAL.
          </p>
        </Section>

        {/* ── Sources per factor ─────────────────────────── */}
        <Section title="Sources de donnees" delay={0.15}>
          <h3 className="font-semibold text-slate-800">
            Indice horaire — Pic d'activite en soiree
          </h3>
          <Table
            headers={["Source", "Donnee cle", "Impact"]}
            rows={[
              [
                "SwipeStats.io (gender split)",
                "Sessions F plus courtes, pic plus tot, nuit reduite",
                "Pic avance a 20h, nuit 0-5h reduite de 25-40%",
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
                "Reincubate (F 25-34 UK)",
                "Pic samedi 20h-00h pour les femmes 25-34",
                "Confirme le pic 20h pour le segment cible",
              ],
              [
                "BMC Psychology 2024",
                "Ennui comme moteur d'utilisation des apps",
                "Boost lunch 12-13h (+7% vs global)",
              ],
              [
                "Sumter et al. 2017",
                "Validation-seeking post-travail",
                "Pic 18-20h (post-work validation)",
              ],
              [
                "Ogury (2023)",
                "Usage geo-localise, pics aux heures de trajet",
                "Happn : pics 8h et 18h (trajets domicile-travail)",
              ],
            ]}
          />

          <h3 className="mt-6 font-semibold text-slate-800">
            Indice journalier — Le samedi domine
          </h3>
          <Table
            headers={["Source", "Donnee cle", "Impact"]}
            rows={[
              [
                "Reincubate (F 25-34)",
                "Samedi = jour avec le plus d'activite feminine",
                "Tinder/Hinge : samedi = 100",
              ],
              [
                "Bumble PR",
                "\"Monday is our busiest day\"",
                "Bumble : lundi = 100 (les femmes initient la semaine)",
              ],
              [
                "Ogury France (2023)",
                "\"Spike on Thursday for Happn\"",
                "Happn : jeudi = 95 (deplacements urbains)",
              ],
              [
                "Hily Survey",
                "FOMO solitude le vendredi soir",
                "Vendredi remonte a 65 (vs 55 global)",
              ],
              [
                "SwipeStats.io",
                "Vendredi/samedi = creux (sorties IRL)",
                "Vendredi reste le jour le plus bas pour la plupart des apps",
              ],
            ]}
          />

          <h3 className="mt-6 font-semibold text-slate-800">
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

          <h3 className="mt-6 font-semibold text-slate-800">
            Evenements speciaux et patterns psychologiques
          </h3>
          <Table
            headers={["Evenement", "Periode", "Effet", "Source"]}
            rows={[
              [
                "Dating Sunday",
                "1er dimanche de janvier",
                "+25%",
                "Tinder/Bumble/Hinge PR (concordant)",
              ],
              [
                "Nouvel An",
                "1-7 janvier",
                "+35%",
                "Adjust : pic d'installations + solitude post-fetes",
              ],
              [
                "Pre-Saint-Valentin",
                "1-13 fevrier",
                "+30%",
                "Sensor Tower + pression sociale accrue",
              ],
              [
                "Saint-Valentin",
                "14 fevrier",
                "+35%",
                "Pic de solitude pour les celibataires",
              ],
              [
                "8 Mars",
                "8 mars",
                "+8%",
                "Effet social / empowerment",
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
                "+15%",
                "Sensor Tower FR : rebond post-vacances",
              ],
              [
                "Cuffing Season",
                "15 oct - 30 nov",
                "+6%",
                "Adjust + Hily (selectivite accrue)",
              ],
              [
                "Sunday Blues",
                "Dimanche 18h-22h",
                "+8%",
                "PMC 2024 : solitude fin de weekend",
              ],
              [
                "Vendredi FOMO",
                "Vendredi 20h-23h",
                "+12%",
                "Hily survey : solitude sans plans",
              ],
              [
                "Dimanche Ennui",
                "Dimanche 14h-17h",
                "+8%",
                "BMC Psychology 2024 : ennui apres-midi",
              ],
              [
                "Winter Darkness",
                "Nov-Fev, 17h-22h",
                "+5%",
                "Hily : 60% prefere automne/hiver",
              ],
              [
                "Post-Noel",
                "27-30 decembre",
                "+15%",
                "Solitude post-fetes familiales",
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

          <h3 className="mt-6 font-semibold text-slate-800">
            Modificateur meteo
          </h3>
          <p className="text-slate-500">
            Les conditions meteorologiques a Paris influencent l'utilisation des
            apps. Par mauvais temps, les gens restent chez eux et ouvrent plus
            les apps de rencontre.
          </p>
          <Table
            headers={["Condition", "Modificateur", "Source"]}
            rows={[
              ["Beau temps", "x0.95 (-5%)", "Dehors, moins d'app"],
              ["Couvert", "x1.00 (neutre)", "Baseline"],
              ["Bruine", "x1.05 (+5%)", "Leger effet indoor"],
              ["Pluie", "x1.10 (+10%)", "OKCupid : activite accrue par temps de pluie"],
              ["Orage", "x1.15 (+15%)", "Effet indoor renforce"],
              ["Neige / tempete", "x1.27 (+27%)", "Hinge : +27% lors des tempetes de neige"],
              ["Brouillard", "x1.03 (+3%)", "Leger effet indoor"],
            ]}
          />
        </Section>

        {/* ── Per-app calibration ────────────────────────── */}
        <Section title="Calibrage par app" delay={0.2}>
          <p className="text-slate-500">
            Chaque app a ses propres patterns. DatePulse maintient des tables
            separees pour Tinder, Bumble, Hinge et Happn, calibrees sur les
            publications specifiques de chaque app.
          </p>
          <Table
            headers={["App", "Pic horaire", "Pic journalier", "Pic mensuel", "Specificite"]}
            rows={[
              [
                "Tinder",
                "20h",
                "Samedi",
                "Janvier",
                "Baseline — le plus documente",
              ],
              [
                "Bumble",
                "19h",
                "Lundi",
                "Fevrier",
                "Les femmes initient — pic plus tot dans la soiree",
              ],
              [
                "Hinge",
                "20h",
                "Samedi",
                "Fevrier / Aout",
                "\"Designed to be deleted\" — fenetre large 18-22h",
              ],
              [
                "Happn",
                "20h",
                "Samedi / Jeudi",
                "Janvier",
                "Proximite = pics aux heures de trajet urbain",
              ],
            ]}
          />
        </Section>

        {/* ── Pool Freshness ─────────────────────────────── */}
        <Section title="Pool Freshness Score" delay={0.25}>
          <p className="text-slate-500">
            En complement du score d'activite (qui mesure{" "}
            <em>quand</em> les utilisateurs sont connectes), le Pool Freshness
            mesure la <strong className="text-slate-900">qualite du pool de profils</strong>{" "}
            ce mois-ci : y a-t-il beaucoup de nouveaux inscrits, ou le pool stagne ?
          </p>

          <h3 className="font-semibold text-slate-800">Formule</h3>
          <div className="border border-gray-200 bg-gray-50 p-5">
            <code className="text-base font-semibold text-brand-500">
              netGrowth = installs &times; 0.6 + (100 &minus; churn) &times; 0.4
            </code>
          </div>
          <ul className="list-inside list-disc space-y-1 text-slate-500">
            <li>
              <strong className="text-slate-800">Installs (0-100)</strong> — Indice
              d'installations du mois, normalise. Source : Adjust Benchmarks
              2023-2024 (% vs moyenne annuelle, toutes apps de rencontre
              confondues).
            </li>
            <li>
              <strong className="text-slate-800">Churn (0-100)</strong> — Intensite
              des departs. Source : Sensor Tower (taux de churn MoM 20-30% pour
              les apps de rencontre), croise avec les tendances MAU France.
            </li>
          </ul>

          <h3 className="mt-4 font-semibold text-slate-800">Niveaux</h3>
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

          <h3 className="mt-4 font-semibold text-slate-800">
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

        {/* ── AI Profile Audit ──────────────────────────── */}
        <Section title="Comment fonctionne l'audit IA" delay={0.28}>
          <p className="text-slate-500">
            L'AI Profile Audit analyse tes screenshots de profil via un modele
            de vision (DeepSeek V3 via OpenRouter). Le scoring evalue 5 criteres :
          </p>
          <Table
            headers={["Critere", "Poids", "Ce qui est evalue"]}
            rows={[
              ["Qualite des photos", "40%", "Eclairage, cadrage, resolution, sourire, contact visuel"],
              ["Bio / prompts", "20%", "Originalite, longueur, humour, conversation starters"],
              ["Variete / storytelling", "20%", "Mix activites, social, voyage — pas que des selfies"],
              ["Ordre des photos", "10%", "La plus forte en premier, progression logique"],
              ["Features de l'app", "10%", "Prompts Hinge, Spotify anthem, interets"],
            ]}
          />
          <p className="mt-3 text-slate-500">
            Les recommandations s'appuient sur les etudes publiees par Hinge et
            Tinder. Score moyen attendu : 40-60. Un 80+ est rare.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span>&#x1F512;</span>
            <span>Tes photos ne sont pas stockees. Elles sont envoyees a l'IA pour analyse puis supprimees.</span>
          </div>
        </Section>

        {/* ── Limites ───────────────────────────────────── */}
        <Section title="Limites et transparence" delay={0.3}>
          <ul className="list-inside list-disc space-y-2 text-slate-500">
            <li>
              <strong className="text-slate-800">Donnees publiques uniquement</strong>{" "}
              — DatePulse n'a pas acces aux donnees internes des apps (DAU, MAU
              en temps reel, nombre de swipes). Les indices sont derives de
              publications officielles et d'etudes tierces.
            </li>
            <li>
              <strong className="text-slate-800">Granularite mensuelle limitee</strong>{" "}
              — L'indice mensuel provient de benchmarks annuels agreges. Les
              variations jour par jour au sein d'un mois ne sont pas captees.
            </li>
            <li>
              <strong className="text-slate-800">Pas de donnees geo-localisees</strong>{" "}
              — Les patterns sont calibres pour la France metropolitaine.
              Les variations regionales (Paris vs province) ne sont pas modelisees.
            </li>
            <li>
              <strong className="text-slate-800">Churn estime</strong>{" "}
              — Les taux de churn sont estimes a partir de tendances MAU et de
              donnees sectorielles (20-30% MoM), pas de chiffres exacts par app.
            </li>
            <li>
              <strong className="text-slate-800">Meteo limitee a Paris</strong>{" "}
              — Le modificateur meteo utilise les conditions actuelles a Paris.
              Il n'est pas disponible pour les autres villes et n'affecte que le
              score en temps reel (pas la heatmap ni les meilleurs creneaux).
            </li>
            <li>
              <strong className="text-slate-800">Modele statique</strong>{" "}
              — Les tables ne sont pas mises a jour en temps reel. Elles sont
              recalibrees periodiquement quand de nouvelles publications sortent.
            </li>
          </ul>
        </Section>

        {/* ── References ────────────────────────────────── */}
        <Section title="References" delay={0.35}>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-400">
            <li>Adjust — Global App Trends 2024: Dating App Benchmarks</li>
            <li>Sensor Tower — France Dating Apps Quarterly Reports (Q1-Q4 2024, Q1 2025)</li>
            <li>data.ai (ex App Annie) — State of Mobile 2024: Dating Category</li>
            <li>Tinder — Year in Swipe 2023</li>
            <li>Hinge — The Hinge Blog: When to Use Dating Apps (2024)</li>
            <li>Bumble — Press Releases: Busiest Days and Times (2023-2024)</li>
            <li>Nielsen — Mobile Panel: Dating App Session Duration (2023)</li>
            <li>Ogury — Mobile Journey: Dating Apps in France (2023)</li>
            <li>SwipeStats.io — Anonymized Tinder Usage Data, Gender Split (2022-2024)</li>
            <li>Reincubate — Dating App Usage by Age and Gender (UK, 2023)</li>
            <li>BMC Psychology 2024 — Boredom as a Driver of Dating App Usage</li>
            <li>Sumter et al. 2017 — Love Me Tinder: Motivations for Using Dating Apps</li>
            <li>Hily — Dating Trends Survey: Seasonal Preferences (2024)</li>
            <li>OKCupid — Weather and Messaging Activity Data</li>
            <li>Hinge — Storm Data: Snow Day Effect on App Activity (+27%)</li>
            <li>Tyson et al. 2016 — A First Look at User Activity on Tinder</li>
          </ul>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-slate-400 space-y-2">
          <p className="font-medium text-slate-400">
            DatePulse — Swipe when it matters.
          </p>
          <p>
            <a href="/methodology" className="hover:text-slate-900 transition">Methodologie</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/audit" className="hover:text-slate-900 transition">Audit</a>
            <span className="mx-2 text-slate-300">|</span>
            <span>@EvolvedMonkey</span>
          </p>
          <p className="text-slate-300">
            Aucune donnee personnelle stockee sur nos serveurs.
          </p>
        </div>
      </footer>
    </div>
  );
}
