import { useEffect, useRef } from "react";
import type { Page } from "./routes";
import { focusPageHeading } from "../shared/pageFocus";
const titles: Record<Page | "not_found", string> = {
  home: "Início",
  visit: "Museu 3D",
  catalog: "Acervo",
  artists: "Artistas",
  about: "Sobre",
  admin: "Gestão do acervo",
  reset_password: "Senha",
  preview: "Prévia",
  not_found: "Página não encontrada",
};
// Page title and focus follow client-side navigation.
export function usePageA11y(page: Page | "not_found") {
  const first = useRef(true);
  useEffect(() => {
    document.title = `${titles[page]} · Desvio | Museu Virtual`;
    if (first.current) {
      first.current = false;
      return;
    }
    focusPageHeading();
  }, [page]);
}
