import { useCallback, useEffect, useState } from "react";
import type { Artwork, CollectionSnapshot } from "../../domain/entities";
import { selectArtworks } from "../../domain/selectors";
import ArtworkDialog from "../../shared/ArtworkDialog";
import VisitPage from "./VisitPage";
export default function LocalPreviewPage({
  base,
  loadPreview,
}: {
  base: CollectionSnapshot;
  loadPreview: (snapshot: CollectionSnapshot) => Promise<CollectionSnapshot>;
}) {
  const [snapshot, setSnapshot] = useState<CollectionSnapshot>();
  const [error, setError] = useState("");
  const [view, setView] = useState<"catalog" | "gallery">("catalog");
  const [focusId, setFocusId] = useState("");
  const [selected, setSelected] = useState<Artwork | null>(null);
  const close = useCallback(() => setSelected(null), []);
  useEffect(() => {
    let active = true;
    loadPreview(base)
      .then((value) => {
        if (active) setSnapshot(value);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Falha ao carregar a prévia.",
          );
      });
    return () => {
      active = false;
    };
  }, [base, loadPreview]);
  const works = snapshot ? selectArtworks(snapshot) : [];
  const samples = works.filter((w) => w.rights === "preview");
  const openGallery = (work: Artwork) => {
    setFocusId(work.id);
    setView("gallery");
  };
  return (
    <div
      className={`local-preview-page ${view === "gallery" ? "local-preview-gallery" : ""}`}
    >
      <div className="local-preview-banner">
        <strong>Prévia local · Linscker Marim</strong>
        <span>
          Imagens do catálogo da exposição para visualizar a montagem.
        </span>
        <button onClick={() => setView("catalog")}>Ver obras</button>
        {samples[0] && (
          <button onClick={() => openGallery(samples[0])}>
            Abrir museu 3D
          </button>
        )}
      </div>
      {error && (
        <main className="admin">
          <p role="alert">{error}</p>
        </main>
      )}
      {!snapshot && !error && (
        <main className="admin" role="status">
          Carregando obras…
        </main>
      )}
      {snapshot && view === "catalog" && (
        <main className="admin public-collection local-preview-collection">
          <div className="eyebrow">
            ENTRE FIOS & TRAMAS · TRANSGRESSÕES DE GÊNERO
          </div>
          <h1>Corpos que transgridem.</h1>
          <p>
            Três obras de Linscker para experimentar na sala Fios e
            dissidências. A prévia não altera seus rascunhos nem publica imagens
            no acervo.
          </p>
          <div className="public-work-grid">
            {samples.map((work) => (
              <article
                className="public-work-card preview-work-card"
                key={work.id}
              >
                <button
                  className="preview-work-visual"
                  onClick={() => setSelected(work)}
                  aria-label={`Ver detalhes de ${work.title}`}
                >
                  <img src={work.image} alt={work.alt} />
                </button>
                <div className="public-work-copy">
                  <small>
                    {work.kind} · {work.year}
                  </small>
                  <h2>{work.title}</h2>
                  <span>{work.author}</span>
                  <span>
                    {work.technicalDetails?.technique} ·{" "}
                    {work.technicalDetails?.dimensions}
                  </span>
                  <div className="actions">
                    <button
                      className="outline"
                      onClick={() => setSelected(work)}
                    >
                      Ficha da obra
                    </button>
                    <button
                      className="primary"
                      onClick={() => openGallery(work)}
                    >
                      Ver na sala
                    </button>
                  </div>
                  <a
                    href={work.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Catálogo de origem ↗
                    <span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </main>
      )}
      {snapshot && view === "gallery" && (
        <VisitPage
          key={focusId}
          works={works}
          rooms={snapshot.rooms}
          initialWorkId={focusId}
          initialGuided={false}
          onSelect={setSelected}
          disabled={!!selected}
        />
      )}
      {selected && (
        <ArtworkDialog key={selected.id} selected={selected} onClose={close} />
      )}
    </div>
  );
}
