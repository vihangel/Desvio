import { useCallback, useEffect, useRef, useState } from "react";
export type AdminSection = "works" | "artists" | "rooms" | "preview";
// `id` is "nova" for a new item, an id to edit, or undefined for the list.
export interface AdminRoute {
  section: AdminSection;
  id?: string;
  focus?: string;
}
const segments: Record<string, AdminSection> = {
  obras: "works",
  artistas: "artists",
  salas: "rooms",
  previa: "preview",
};
export const adminPath = (section: AdminSection, id?: string) => {
  const name = Object.keys(segments).find((k) => segments[k] === section)!;
  return `/admin/${name}${id ? `/${id}` : ""}`;
};
export function parseAdminPath(pathname: string, search = ""): AdminRoute {
  const [, , name, id] = pathname.replace(/\/$/, "").split("/");
  const section = segments[name ?? ""] ?? "works";
  const focus = new URLSearchParams(search).get("obra") ?? undefined;
  return { section, id: section === "preview" ? undefined : id, focus };
}
// Sub-navigation inside /admin. Leaving a form with unsaved changes asks
// first, including the browser back button.
export function useAdminRoute(canLeave: () => Promise<boolean>) {
  const [route, setRoute] = useState(() =>
    parseAdminPath(location.pathname, location.search),
  );
  const current = useRef(location.pathname + location.search);
  const guard = useRef(canLeave);
  guard.current = canLeave;
  useEffect(() => {
    const pop = async () => {
      if (!location.pathname.startsWith("/admin")) return;
      const target = location.pathname + location.search;
      if (!(await guard.current())) {
        history.pushState({}, "", current.current);
        return;
      }
      current.current = target;
      setRoute(parseAdminPath(location.pathname, location.search));
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const go = useCallback(
    async (
      path: string,
      options: { replace?: boolean; force?: boolean } = {},
    ) => {
      if (!options.force && !(await guard.current())) return false;
      history[options.replace ? "replaceState" : "pushState"]({}, "", path);
      current.current = path;
      const url = new URL(path, location.origin);
      setRoute(parseAdminPath(url.pathname, url.search));
      window.scrollTo(0, 0);
      return true;
    },
    [],
  );
  return { route, go };
}
// Warns before closing the tab while something is unsaved.
export function useUnloadWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
