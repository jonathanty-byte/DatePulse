import NavBar from "../components/NavBar";
import MessageCoach from "../components/MessageCoach";
import { motion } from "framer-motion";

export default function Coach() {
  return (
    <div className="min-h-screen bg-[#080b14] text-gray-100">
      <NavBar />
      <section className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                Message Coach
              </span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-400">
              Colle ta conversation et recois 3 suggestions calibrees
            </p>
          </motion.div>
          <MessageCoach />
        </div>
      </section>
      <footer className="border-t border-white/5 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-gray-600 space-y-2">
          <p className="font-medium text-gray-500">DatePulse — Swipe when it matters.</p>
          <p>
            <a href="/" className="hover:text-gray-400 transition">Accueil</a>
            <span className="mx-2 text-gray-700">|</span>
            <a href="/audit" className="hover:text-gray-400 transition">Audit</a>
            <span className="mx-2 text-gray-700">|</span>
            <a href="/methodology" className="hover:text-gray-400 transition">Methodologie</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
