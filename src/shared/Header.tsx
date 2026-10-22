import { useEffect, useState } from "react";
import type { Page } from "../app/routes";
const items: [Page, string][] = [
  ["home", "Início"],
  ["visit", "Museu 3D"],
  ["catalog", "Acervo"],
  ["artists", "Artistas"],
  ["about", "Sobre"],
];
// On phones only "Museu 3D" stays visible; the rest opens under "Menu".
export default function Header({
  go,
  current,
}: {
  go: (page: Page) => void;
  current?: Page | "not_found";
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [current]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  return (
    <header>
      <button
        className="brand"
        aria-label="Desvio — início"
        onClick={() => go("home")}
      >
        <img
          src="/brand/desvio-logo.svg"
          alt="Desvio"
          width={132}
          height={45}
        />
        <small aria-hidden="true">MUSEU VIRTUAL</small>
      </button>
      <nav aria-label="Navegação principal">
        <button
          className="nav-visit"
          aria-current={current === "visit" ? "page" : undefined}
          onClick={() => go("visit")}
        >
          Museu 3D
        </button>
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
              <button
                aria-current={current === page ? "page" : undefined}
                onClick={() => go(page)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
