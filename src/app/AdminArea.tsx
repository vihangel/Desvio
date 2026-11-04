import { lazy, Suspense } from "react";
import type { CollectionState } from "../domain/entities";
import type { CollectionRepository } from "../domain/repository";
import AdminLogin from "../features/auth/AdminLogin";
import type { useAuth } from "../features/auth/useAuth";
import {
  artistAccounts,
  authService,
  dataMode,
  hasLocalDraft,
  loadLocalDraftForMigration,
  mediaService,
} from "./services";
const AdminPage = lazy(() => import("../features/admin/AdminPage"));
// Decides what /admin shows: the sign-in, or the editor for this account.
export default function AdminArea({
  auth,
  artistId,
  state,
  repository,
  onChange,
  onExit,
  onChangePassword,
}: {
  auth: ReturnType<typeof useAuth>;
  artistId: string | null;
  state: CollectionState;
  repository: CollectionRepository;
  onChange: (state: CollectionState) => void;
  onExit: () => void;
  onChangePassword: () => void;
}) {
  const allowed = dataMode === "demo" || auth.editor || !!artistId;
  if (dataMode === "supabase" && auth.loading)
    return <p role="status">Conferindo acesso…</p>;
  if (!allowed)
    return authService ? (
      <AdminLogin
        service={authService}
        signedIn={!!auth.userId}
        accountEmail={auth.email}
        onExit={onExit}
      />
    ) : null;
  return (
    <Suspense fallback={<main className="admin">Carregando editor…</main>}>
      <AdminPage
        loadLocalDraft={
          hasLocalDraft() ? loadLocalDraftForMigration : undefined
        }
        state={state}
        repository={repository}
        access={artistId ? { kind: "artist", artistId } : { kind: "curator" }}
        accounts={auth.editor ? artistAccounts : undefined}
        mediaService={mediaService}
        onChange={onChange}
        onExit={onExit}
        accountEmail={auth.email}
        onChangePassword={authService ? onChangePassword : undefined}
        onSignOut={
          authService
            ? () => {
                void authService?.signOut();
                onExit();
              }
            : undefined
        }
      />
    </Suspense>
  );
}
