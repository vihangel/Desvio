import { useEffect, useState } from "react";
import { pageForPath, routes, type Page } from "./routes";
export function useNavigation() {
  const [page, setPage] = useState(() => pageForPath(location.pathname));
  useEffect(() => {
    const pop = () => setPage(pageForPath(location.pathname));
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const go = (next: Page) => {
    if (location.pathname !== routes[next])
      history.pushState({}, "", routes[next]);
    setPage(next);
    window.scrollTo(0, 0);
  };
  return { page, go };
}
