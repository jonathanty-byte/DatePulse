import { useEffect, useState, lazy, Suspense } from "react";
import Home from "./pages/Home";
const Coach = lazy(() => import("./pages/Coach"));
const Wrapped = lazy(() => import("./pages/Wrapped"));
const Insights = lazy(() => import("./pages/Insights"));

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
        <div className="flex min-h-screen items-center justify-center bg-[#f8f9fc]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      }
    >
      {page === "coach" ? <Coach /> : page === "wrapped" ? <Wrapped /> : page === "insights" ? <Insights /> : <Coach />}
    </Suspense>
  );
}

function getPage(path?: string): string {
  const p = path || window.location.pathname;
  if (p.startsWith("/methodology")) return "coach";
  if (p.startsWith("/audit")) return "coach";
  if (p.startsWith("/coach")) return "coach";
  if (p.startsWith("/wrapped")) return "wrapped";
  if (p.startsWith("/tracker")) return "coach";
  if (p.startsWith("/insights")) return "insights";
  return "home";
}
