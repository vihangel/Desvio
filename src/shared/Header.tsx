import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Accessibility } from "lucide-react";
import { routes, type Page } from "../app/routes";
import AccessibilityPanel from "./AccessibilityPanel";
const items: [Page, string][] = [
  ["home", "Início"],
  ["visit", "Museu 3D"],
  ["catalog", "Acervo"],
  ["artists", "Artistas"],
  ["about", "Sobre"],
];
// Real links (new tab, copy address, announced as links) that still navigate
// inside the app on a plain click.
export function AppLink({
  page,
  go,
  current,
  className,
  children,
}: {
  page: Page;
  go: (page: Page) => void;
  current?: Page | "not_found";
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={routes[page]}
      className={className}
      aria-current={current === page ? "page" : undefined}
      onClick={(e: MouseEvent) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        e.preventDefault();
        go(page);
      }}
    >
      {children}
    </a>
  );
}
// On phones only "Museu 3D" stays visible; the rest opens under "Menu".
export default function Header({
  go,
  current,
}: {
  go: (page: Page) => void;
  current?: Page | "not_found";
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  useEffect(() => setOpen(false), [current]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  return (
    <header>
      <AppLink page="home" go={go} className="brand">
        <img
          src="/brand/desvio-logo.svg"
          alt="Desvio — início"
          width={132}
          height={45}
        />
        <small aria-hidden="true">MUSEU VIRTUAL</small>
      </AppLink>
      <nav aria-label="Navegação principal">
        <AppLink page="visit" go={go} current={current} className="nav-visit">
          Museu 3D
        </AppLink>
        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="main-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? "Fechar" : "Menu"}
        </button>
        <ul id="main-menu" className={open ? "nav-items open" : "nav-items"}>
          {items.map(([page, label]) => (
            <li
              key={page}
              className={page === "visit" ? "nav-desktop-only" : undefined}
            >
              <AppLink page={page} go={go} current={current}>
                {label}
              </AppLink>
            </li>
          ))}
        </ul>
      </nav>
      <button
        className="a11y-button"
        aria-label="Acessibilidade"
        title="Acessibilidade"
        aria-haspopup="dialog"
        onClick={() => setPanel(true)}
      >
        <Accessibility size={22} aria-hidden="true" />
      </button>
      {panel && <AccessibilityPanel onClose={() => setPanel(false)} />}
    </header>
  );
}
