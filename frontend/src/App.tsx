import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Methodology from "./pages/Methodology";

/**
 * Minimal SPA routing.
 * /            -> Home (score + heatmap + best times + match tracker)
 * /methodology -> Methodology
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

  switch (page) {
    case "methodology":
      return <Methodology />;
    default:
      return <Home />;
  }
}

function getPage(path?: string): string {
  const p = path || window.location.pathname;
  if (p.startsWith("/methodology")) return "methodology";
  return "home";
}
