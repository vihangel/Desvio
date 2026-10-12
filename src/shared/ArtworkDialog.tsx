import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Pause, Volume2 } from "lucide-react";
import type { Artwork } from "../domain/entities";
import { useNarration } from "./useNarration";
export default function ArtworkDialog({
  selected,
  onClose: close,
}: {
  selected: Artwork;
  onClose: () => void;
}) {
  const { speaking, toggle } = useNarration();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items =
          dialog.current?.querySelectorAll<HTMLElement>("button,a[href]");
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [close]);
  return createPortal(
    <div className="scrim" onClick={close}>
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={selected.title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-toolbar">
          <button className="dismiss" onClick={close} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className="dialog-content">
          <div className="visual">
            {selected.image ? (
              <img src={selected.image} alt={selected.alt} />
            ) : (
              <span>◈</span>
            )}
          </div>
          <div className="description">
            <small>ACERVO DESVIO · {selected.year ?? "Ano a confirmar"}</small>
            <h2>{selected.title}</h2>
            <h3>{selected.author}</h3>
            <p>{selected.description}</p>
            {selected.technicalDetails && (
              <dl className="technical-details">
                <div>
                  <dt>Técnica</dt>
                  <dd>{selected.technicalDetails.technique}</dd>
                </div>
                <div>
                  <dt>Dimensões da obra</dt>
                  <dd>{selected.technicalDetails.dimensions}</dd>
                </div>
                <div>
                  <dt>Materiais</dt>
                  <dd>{selected.technicalDetails.materials}</dd>
                </div>
              </dl>
            )}
            {selected.rights === "preview" && (
              <>
                <p className="rights-note">
                  Imagem da obra usada para prévia local de montagem.
                  Autorização de publicação ainda não registrada.
                </p>
                <p className="media-attribution">{selected.attribution}</p>
              </>
            )}

            <button
              className="primary"
              onClick={() =>
                toggle(selected.title + ". " + selected.description)
              }
            >
              {speaking ? <Pause size={16} /> : <Volume2 size={16} />}{" "}
              {speaking ? "Parar narração" : "Ouvir a obra"}
            </button>
            <p className="disclaimer">
              Narração por voz sintetizada do navegador, sem representar a voz
              da pessoa artista.
            </p>
            {selected.rights === "reference" && (
              <p className="rights-note">
                Painel editorial do Desvio. Não é reprodução da obra original.
              </p>
            )}
            {selected.source && (
              <a
                className="source-link"
                href={selected.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultar fonte pública ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
