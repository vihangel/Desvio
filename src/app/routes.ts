export const routes = {
  home: "/",
  visit: "/museu",
  catalog: "/obras",
  artists: "/artistas",
  admin: "/admin",
  reset_password: "/admin/redefinir-senha",
  preview: "/previa/linscker",
} as const;
export type Page = keyof typeof routes;
export function pageForPath(path: string): Page | "not_found" {
  if (path.replace(/\/$/, "") === routes.preview && !import.meta.env.DEV)
    return "not_found";
  const normalized = path.replace(/\/$/, "") || "/";
  return (
    (Object.keys(routes) as Page[]).find(
      (page) => routes[page] === normalized,
    ) ?? "not_found"
  );
}
