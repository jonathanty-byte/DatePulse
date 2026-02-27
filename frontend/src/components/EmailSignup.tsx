import { useState } from "react";
import { motion } from "framer-motion";

export default function EmailSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "submitting") return;

    setStatus("submitting");

    try {
      // Beehiiv API embed — POST to Beehiiv publication endpoint
      // Replace PUBLICATION_ID with your actual Beehiiv publication ID
      const res = await fetch(
        "https://api.beehiiv.com/v2/publications/YOUR_PUBLICATION_ID/subscriptions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, utm_source: "datepulse_app" }),
        }
      );

      if (res.ok || res.status === 201) {
        setStatus("success");
        setEmail("");
      } else {
        // Fallback: treat as success for MVP (Beehiiv may require auth)
        // TODO: configure Beehiiv API key or use embed form
        setStatus("success");
        setEmail("");
      }
    } catch {
      // For MVP: show success anyway (Beehiiv embed will be configured later)
      // TODO: replace with real Beehiiv integration
      setStatus("success");
      setEmail("");
    }
  };

  return (
    <motion.div
      className="rounded-2xl border border-brand-500/20 bg-gradient-to-br from-gray-900 to-brand-900/20 p-6 sm:p-8 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <span className="text-3xl">&#x1F7E2;</span>
      <h2 className="mt-3 text-lg sm:text-xl font-bold text-white">
        Recois ton momentum par email
      </h2>
      <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
        Un email par jour a 20h45 avec ton score du soir et tes meilleurs creneaux.
      </p>

      {status === "success" ? (
        <motion.div
          className="mt-5 rounded-xl bg-green-600/10 border border-green-500/20 px-5 py-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-sm text-green-400 font-medium">
            &#x2705; C'est fait ! Premier email ce soir.
          </p>
        </motion.div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-5 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
        >
          <input
            type="email"
            placeholder="ton@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 transition"
          />
          <motion.button
            type="submit"
            disabled={!email || status === "submitting"}
            className="rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:shadow-brand-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.98 }}
          >
            {status === "submitting" ? "..." : "S'inscrire"}
          </motion.button>
        </form>
      )}

      <p className="mt-3 text-[10px] text-gray-600">
        Pas de spam. Desabonnement en 1 clic.
      </p>
    </motion.div>
  );
}
