import { useEffect, useState, lazy, Suspense } from "react";
import Home from "./pages/Home";
const Methodology = lazy(() => import("./pages/Methodology"));
const Audit = lazy(() => import("./pages/Audit"));
const Coach = lazy(() => import("./pages/Coach"));
const Wrapped = lazy(() => import("./pages/Wrapped"));

/**
 * Minimal SPA routing.
 * /            -> Home (score + heatmap + best times + match tracker)
 * /methodology -> Methodology
 * /audit       -> AI Profile Audit
 */
export default function App() {
  const [page, setPage] = useState(() => getPage());

  useEffect(() => {
    const onNav = () => setPage(getPage());
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  // Intercept internal link clicks
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
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

  if (page === "home") return <Home />;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      }
    >
      {page === "methodology" ? <Methodology /> : page === "coach" ? <Coach /> : page === "wrapped" ? <Wrapped /> : <Audit />}
    </Suspense>
  );
}

function getPage(path?: string): string {
  const p = path || window.location.pathname;
  if (p.startsWith("/methodology")) return "methodology";
  if (p.startsWith("/audit")) return "audit";
  if (p.startsWith("/coach")) return "coach";
  if (p.startsWith("/wrapped")) return "wrapped";
  return "home";
}
