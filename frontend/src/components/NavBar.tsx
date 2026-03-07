import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DatePulseLogo from "./DatePulseLogo";

const NAV_LINKS: { href: string; label: string; badge?: string }[] = [
  { href: "/", label: "Accueil" },
  { href: "/wrapped", label: "Wrapped" },
  { href: "/score", label: "Score" },
  { href: "/insights", label: "Insights" },
];

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = window.location.pathname;

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="/" className="flex items-center">
          <DatePulseLogo className="h-7" />
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
                className={`px-3 py-1.5 text-[13px] font-medium tracking-wide transition ${
                  isActive
                    ? "text-brand-500 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">
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
          className="flex sm:hidden h-8 w-8 items-center justify-center text-slate-500 hover:text-slate-900 transition"
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
            className="sm:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md"
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
                    className={`px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "text-brand-500 font-semibold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                    {link.badge && (
                      <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">
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
