export const routes = {
  home: "/",
  visit: "/museu",
  catalog: "/acervo",
  artists: "/artistas",
  about: "/sobre",
  admin: "/admin",
  reset_password: "/admin/redefinir-senha",
  preview: "/previa/linscker",
} as const;
export type Page = keyof typeof routes;
export function pageForPath(path: string): Page | "not_found" {
  if (path.replace(/\/$/, "") === routes.preview && !import.meta.env.DEV)
    return "not_found";
  const normalized = path.replace(/\/$/, "") || "/";
  // Older links to the works list keep working.
  if (normalized === "/obras") return "catalog";
  // Admin screens have their own sub-routes (/admin/obras/…).
  if (normalized.startsWith("/admin/") && normalized !== routes.reset_password)
    return "admin";
  return (
    (Object.keys(routes) as Page[]).find(
      (page) => routes[page] === normalized,
    ) ?? "not_found"
  );
}
