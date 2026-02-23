import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";

/**
 * Simple hash-based routing (no dependency needed).
 * /           -> Landing
 * /dashboard  -> Dashboard
 */
export default function App() {
  const [page, setPage] = useState(() => getPage());

  useEffect(() => {
    const onNav = () => setPage(getPage());
    window.addEventListener("hashchange", onNav);
    window.addEventListener("popstate", onNav);
    return () => {
      window.removeEventListener("hashchange", onNav);
      window.removeEventListener("popstate", onNav);
    };
  }, []);

  // Intercept link clicks for SPA navigation
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("//")) return;
      e.preventDefault();
      window.history.pushState({}, "", href);
      setPage(getPage(href));
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  switch (page) {
    case "dashboard":
      return <Dashboard />;
    default:
      return <Landing />;
  }
}

function getPage(path?: string): string {
  const p = path || window.location.pathname;
  if (p === "/dashboard" || p === "/dashboard/") return "dashboard";
  return "landing";
}
