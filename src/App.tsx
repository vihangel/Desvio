import { lazy, Suspense, useCallback, useState, useEffect } from "react";
import type { Artwork, CollectionSnapshot } from "./domain/entities";
import { selectArtworks } from "./domain/selectors";
import { useNavigation } from "./app/useNavigation";
import { useCollection } from "./app/useCollection";
import {
  collectionRepository,
  mediaService,
  loadLinsckerPreview,
} from "./app/services";
import Header from "./shared/Header";
import ArtworkDialog from "./shared/ArtworkDialog";
import HomePage from "./features/home/HomePage";
import CatalogPage from "./features/catalog/CatalogPage";
import ArtistsPage from "./features/artists/ArtistsPage";
import VisitPage from "./features/visit/VisitPage";
const LocalPreviewPage = import.meta.env.DEV
  ? lazy(() => import("./features/visit/LocalPreviewPage"))
  : null;
const AdminPage = lazy(() => import("./features/admin/AdminPage"));
export default function App() {
  const { page, go } = useNavigation();
  const { state, setState, loading, error, recover } =
    useCollection(collectionRepository);
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [guided, setGuided] = useState(false);
  const close = useCallback(() => setSelected(null), []);
  const navigate = (next: Parameters<typeof go>[0]) => {
    close();
    go(next);
  };
  const published = state?.published;
  const [localCollection, setLocalCollection] = useState<{
    base: CollectionSnapshot;
    snapshot: CollectionSnapshot;
  }>();
  const [previewError, setPreviewError] = useState("");
  useEffect(() => {
    if (!published) return;
    let active = true;
    setPreviewError("");
    void loadLinsckerPreview(published).then(
      (snapshot) => {
        if (active) setLocalCollection({ base: published, snapshot });
      },
      (error: unknown) => {
        if (active)
          setPreviewError(
            error instanceof Error
              ? error.message
              : "Falha ao carregar obras de Linscker.",
          );
      },
    );
    return () => {
      active = false;
    };
  }, [published]);
  const snapshot =
    localCollection && localCollection.base === published
      ? localCollection.snapshot
      : published;
  const works =
    snapshot && snapshot.exhibition.status === "published"
      ? selectArtworks(snapshot)
      : [];
  return (
    <div className="app">
      <Header go={navigate} />
      {import.meta.env.DEV && page === "home" && (
        <div className="local-preview-link">
          <span>Obras de Linscker disponíveis para montagem local.</span>
          <button onClick={() => navigate("preview")}>
            Abrir prévia das obras →
          </button>
        </div>
      )}

      {previewError && (
        <p className="local-preview-link" role="alert">
          {previewError}
        </p>
      )}
      {loading && (
        <main className="admin" role="status">
          Carregando acervo…
        </main>
      )}
      {error && (
        <main className="admin">
          <p role="alert">{error}</p>
          <button onClick={() => void recover()}>
            Restaurar demonstração local
          </button>
        </main>
      )}
      {!loading && !error && state && snapshot && (
        <>
          {page === "home" && (
            <HomePage
              snapshot={
                snapshot.exhibition.status === "published"
                  ? snapshot
                  : { ...snapshot, records: [], placements: [] }
              }
              onVisit={(value) => {
                setGuided(value);
                navigate("visit");
              }}
            />
          )}
          {page === "catalog" && (
            <CatalogPage works={works} onSelect={setSelected} />
          )}
          {page === "artists" && (
            <ArtistsPage
              artists={snapshot.artists}
              works={works}
              onSelect={setSelected}
            />
          )}
          {page === "visit" && (
            <VisitPage
              works={works}
              rooms={snapshot.rooms}
              onSelect={setSelected}
              disabled={!!selected}
              initialGuided={guided}
            />
          )}
          {page === "preview" && LocalPreviewPage && (
            <Suspense
              fallback={<main className="admin">Carregando prévia…</main>}
            >
              <LocalPreviewPage
                base={state.published}
                loadPreview={loadLinsckerPreview}
              />
            </Suspense>
          )}
          {page === "admin" && (
            <Suspense
              fallback={<main className="admin">Carregando editor…</main>}
            >
              <AdminPage
                state={state}
                repository={collectionRepository}
                mediaService={mediaService}
                onChange={setState}
                onExit={() => navigate("home")}
              />
            </Suspense>
          )}
          {page === "not_found" && (
            <main className="admin">
              <h1>Página não encontrada</h1>
              <button onClick={() => navigate("home")}>Voltar ao museu</button>
            </main>
          )}
        </>
      )}
      {selected && (
        <ArtworkDialog key={selected.id} selected={selected} onClose={close} />
      )}
    </div>
  );
}
