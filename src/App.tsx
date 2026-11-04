import { useAuth } from "./features/auth/useAuth";
import ResetPassword from "./features/auth/ResetPassword";
import { useDemoMontage } from "./app/useDemoMontage";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { usePageA11y } from "./app/usePageA11y";
import {
  applyPreferences,
  preferences,
  usePreferences,
} from "./shared/preferences";
import VLibras from "./shared/VLibras";
import type { Artwork } from "./domain/entities";
import { selectArtworks } from "./domain/selectors";
import { useNavigation } from "./app/useNavigation";
import { useCollection } from "./app/useCollection";
import {
  collectionRepository,
  artistRepository,
  loadLinsckerPreview,
  dataMode,
  authService,
} from "./app/services";
import AdminArea from "./app/AdminArea";
import DismissibleAlert from "./shared/DismissibleAlert";
import Header from "./shared/Header";
import ArtworkDialog from "./shared/ArtworkDialog";
import HomePage from "./features/home/HomePage";
import CatalogPage from "./features/catalog/CatalogPage";
import ArtistsPage from "./features/artists/ArtistsPage";
import VisitPage from "./features/visit/VisitPage";
import AboutPage from "./features/about/AboutPage";
const LocalPreviewPage = import.meta.env.DEV
  ? lazy(() => import("./features/visit/LocalPreviewPage"))
  : null;
export default function App() {
  const { page, go } = useNavigation();
  usePageA11y(page);
  const prefs = usePreferences();
  useEffect(() => applyPreferences(prefs), [prefs]);
  const [librasError, setLibrasError] = useState("");
  const librasFailed = useCallback((message: string) => {
    setLibrasError(message);
    preferences.set({ libras: false });
  }, []);
  const auth = useAuth(authService);
  const artistId =
    auth.role === "artist" && !auth.editor ? auth.artistId : null;
  const repository = artistId ? artistRepository : collectionRepository;
  const { state, setState, loading, error, recover, reload } = useCollection(
    repository,
    `${auth.userId}:${auth.role}:${artistId}`,
  );
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [guided, setGuided] = useState(false);
  const close = useCallback(() => setSelected(null), []);
  const navigate = (next: Parameters<typeof go>[0]) => {
    close();
    go(next);
  };
  const { snapshot, error: previewError } = useDemoMontage(
    state?.published,
    dataMode === "demo",
  );
  const works =
    snapshot && snapshot.exhibition.status === "published"
      ? selectArtworks(snapshot)
      : [];
  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Header go={navigate} current={page} />
      <VLibras enabled={prefs.libras} onError={librasFailed} />
      {librasError && (
        <DismissibleAlert
          text={librasError}
          actionLabel="Fechar"
          onAction={() => setLibrasError("")}
        />
      )}
      <div id="conteudo" tabIndex={-1}>
        {page === "about" && (
          <AboutPage
            onVisit={(guidedVisit = false) => {
              setGuided(guidedVisit);
              navigate("visit");
            }}
            onCollection={() => navigate("catalog")}
          />
        )}
        {dataMode === "demo" && import.meta.env.DEV && page === "home" && (
          <aside className="local-preview-link" aria-label="Prévia local">
            <span>Obras de Linscker disponíveis para montagem local.</span>
            <button onClick={() => navigate("preview")}>
              Abrir prévia das obras →
            </button>
          </aside>
        )}

        {/* Visitors never sign in, so access errors only matter in the admin. */}
        {auth.error && (page === "admin" || page === "reset_password") && (
          <DismissibleAlert
            text={auth.error}
            actionLabel="Tentar de novo"
            onAction={auth.retry}
          />
        )}
        {previewError && (
          <p className="local-preview-link" role="alert">
            {previewError}
          </p>
        )}
        {loading && page !== "about" && (
          <main className="admin" role="status">
            Carregando acervo…
          </main>
        )}
        {error && page !== "about" && (
          <main className="admin">
            <p role="alert">{error}</p>
            <button onClick={() => void reload()}>Tentar novamente</button>
            {dataMode === "demo" && (
              <button onClick={() => void recover()}>
                Restaurar demonstração local
              </button>
            )}
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
            {page === "reset_password" && authService && (
              <ResetPassword
                service={authService}
                signedIn={!!auth.userId}
                loading={auth.loading}
                onDone={() => navigate("admin")}
                onLogin={() => navigate("admin")}
              />
            )}
            {page === "admin" && (
              <AdminArea
                auth={auth}
                artistId={artistId}
                state={state}
                repository={repository}
                onChange={setState}
                onExit={() => navigate("home")}
                onChangePassword={() => navigate("reset_password")}
              />
            )}
            {page === "not_found" && (
              <main className="admin">
                <h1>Página não encontrada</h1>
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("home");
                  }}
                >
                  Voltar ao início
                </a>
              </main>
            )}
          </>
        )}
      </div>
      {selected && (
        <ArtworkDialog key={selected.id} selected={selected} onClose={close} />
      )}
    </div>
  );
}
