import { useAuth } from "./features/auth/useAuth";
import AdminLogin from "./features/auth/AdminLogin";
import ResetPassword from "./features/auth/ResetPassword";
import { useDemoMontage } from "./app/useDemoMontage";
import { lazy, Suspense, useCallback, useState } from "react";
import type { Artwork } from "./domain/entities";
import { selectArtworks } from "./domain/selectors";
import { useNavigation } from "./app/useNavigation";
import { useCollection } from "./app/useCollection";
import {
  collectionRepository,
  artistRepository,
  artistAccounts,
  mediaService,
  loadLinsckerPreview,
  loadLocalDraftForMigration,
  hasLocalDraft,
  dataMode,
  authService,
} from "./app/services";
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
const AdminPage = lazy(() => import("./features/admin/AdminPage"));
export default function App() {
  const { page, go } = useNavigation();
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
      <Header go={navigate} current={page} />
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
        <div className="local-preview-link">
          <span>Obras de Linscker disponíveis para montagem local.</span>
          <button onClick={() => navigate("preview")}>
            Abrir prévia das obras →
          </button>
        </div>
      )}

      {auth.error && (
        <p role="alert" className="admin">
          {auth.error}
        </p>
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
          {page === "admin" &&
            dataMode === "supabase" &&
            !auth.editor &&
            !artistId &&
            authService &&
            (auth.loading ? (
              <p role="status">Conferindo acesso…</p>
            ) : (
              <AdminLogin
                service={authService}
                signedIn={!!auth.userId}
                accountEmail={auth.email}
                onExit={() => navigate("home")}
              />
            ))}
          {page === "admin" &&
            (dataMode === "demo" ||
              (!auth.loading && (auth.editor || !!artistId))) && (
              <Suspense
                fallback={<main className="admin">Carregando editor…</main>}
              >
                <AdminPage
                  loadLocalDraft={
                    hasLocalDraft() ? loadLocalDraftForMigration : undefined
                  }
                  state={state}
                  repository={repository}
                  access={
                    artistId
                      ? { kind: "artist", artistId }
                      : { kind: "curator" }
                  }
                  accounts={auth.editor ? artistAccounts : undefined}
                  mediaService={mediaService}
                  onChange={setState}
                  onExit={() => navigate("home")}
                  accountEmail={auth.email}
                  onChangePassword={
                    authService ? () => navigate("reset_password") : undefined
                  }
                  onSignOut={
                    authService
                      ? () => {
                          void authService?.signOut();
                          navigate("home");
                        }
                      : undefined
                  }
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
