import ArtistNarration from "./ArtistNarration";
import YouTubeVideo from "./YouTubeVideo";
import { mediaPlayback } from "./mediaPlayback";
import { useEffect } from "react";
import { useDialogFocus } from "./useDialogFocus";
import { createPortal } from "react-dom";
import { X, Pause, Volume2 } from "lucide-react";
import type { Artwork, TechnicalDetails } from "../domain/entities";
import { useNarration } from "./useNarration";
function TechnicalDetailsList({ details }: { details: TechnicalDetails }) {
  const rows = [
    ["Técnica", details.technique],
    ["Dimensões da obra", details.dimensions],
    ["Materiais", details.materials],
  ].filter(([, value]) => value);
  return rows.length ? (
    <dl className="technical-details">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  ) : null;
}
export default function ArtworkDialog({
  selected,
  onClose: close,
}: {
  selected: Artwork;
  onClose: () => void;
}) {
  const { speaking, toggle } = useNarration();
  const dialog = useDialogFocus<HTMLDivElement>(close);
  useEffect(() => {
    mediaPlayback.stopAll();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return createPortal(
    <div className="scrim" onClick={close}>
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={selected.title}
        className={selected.videoUrl ? "modal modal-video" : "modal"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-toolbar">
          <button className="dismiss" onClick={close} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className="dialog-content">
          <div className="visual">
            {selected.videoUrl ? (
              <YouTubeVideo
                url={selected.videoUrl}
                title={selected.title}
                autoplay
              />
            ) : selected.image ? (
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
              <TechnicalDetailsList details={selected.technicalDetails} />
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

            {selected.narration && (
              <ArtistNarration audio={selected.narration} />
            )}
            <button
              className="primary"
              onClick={() =>
                toggle(selected.title + ". " + selected.description)
              }
            >
              {speaking ? <Pause size={16} /> : <Volume2 size={16} />}{" "}
              {speaking ? "Parar narração" : "Ouvir descrição sintetizada"}
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
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
