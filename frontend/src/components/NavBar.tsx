import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS: { href: string; label: string; badge?: string }[] = [
  { href: "/", label: "Accueil" },
  { href: "/audit", label: "Audit" },
  { href: "/coach", label: "Coach", badge: "NEW" },
  { href: "/wrapped", label: "Wrapped", badge: "NEW" },
  { href: "/tracker", label: "Tracker" },
  { href: "/insights", label: "Insights", badge: "NEW" },
  { href: "/methodology", label: "Methodologie" },
];

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = window.location.pathname;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <a href="/" className="flex items-center gap-1.5">
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-lg font-bold text-transparent">
            DatePulse
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? currentPath === "/"
                : currentPath.startsWith(link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="ml-1.5 rounded bg-brand-600/30 px-1.5 py-0.5 text-[10px] font-medium text-brand-400">
                    {link.badge}
                  </span>
                )}
              </a>
            );
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex sm:hidden h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition"
          aria-label="Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-5 w-5"
          >
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="sm:hidden border-t border-white/5 bg-[#080b14]/95 backdrop-blur-md"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col px-4 py-2">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/"
                    ? currentPath === "/"
                    : currentPath.startsWith(link.href);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    {link.label}
                    {link.badge && (
                      <span className="ml-1.5 rounded bg-brand-600/30 px-1.5 py-0.5 text-[10px] font-medium text-brand-400">
                        {link.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
