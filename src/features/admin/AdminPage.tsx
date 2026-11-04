import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CollectionSnapshot,
  CollectionState,
} from "../../domain/entities";
import type { MediaService } from "../../domain/media";
import type { CollectionRepository } from "../../domain/repository";
import type { ArtistAccountService } from "../../domain/accounts";
import { isOnAir } from "../../domain/publication";
import { CURATOR, scopedSnapshot, type Access } from "../../domain/access";
import GatePage from "../../shared/GatePage";
import AdminBanner from "./AdminBanner";
import { ArtistScreen, ArtistsListScreen } from "./screens/ArtistScreens";
import { PreviewScreen } from "./screens/PreviewScreen";
import { RoomScreen, RoomsListScreen } from "./screens/RoomScreens";
import type { AdminContext } from "./screens/types";
import { WorkScreen, WorksListScreen } from "./screens/WorkScreen";
import { ConfirmProvider, NotFound, Toast, useConfirm } from "./ui";
import { useAdminEditor } from "./useAdminEditor";
import {
  adminPath,
  useAdminRoute,
  useUnloadWarning,
  type AdminSection,
} from "./useAdminRoute";
import { useArtistAccounts } from "./useArtistAccounts";
type Props = {
  loadLocalDraft?: () => Promise<CollectionSnapshot>;
  mediaService: MediaService;
  state: CollectionState;
  repository: CollectionRepository;
  access?: Access;
  accounts?: ArtistAccountService;
  accountEmail?: string;
  onChange: (state: CollectionState) => void;
  onExit: () => void;
  onSignOut?: () => void;
  onChangePassword?: () => void;
};
export default function AdminPage(props: Props) {
  return (
    <ConfirmProvider>
      <AdminShell {...props} />
    </ConfirmProvider>
  );
}
function AdminShell({
  state,
  repository,
  mediaService,
  access: signedAccess = CURATOR,
  accounts: accountService,
  accountEmail,
  onChange,
  onExit,
  onSignOut,
  onChangePassword,
  loadLocalDraft,
}: Props) {
  const remote = repository.mode === "supabase";
  // The local demo can preview the artist area; remotely the role decides.
  const [demoAccess, setDemoAccess] = useState<Access>(CURATOR);
  const access = remote ? signedAccess : demoAccess;
  const curator = access.kind === "curator";
  const [entered, setEntered] = useState(remote);
  const editor = useAdminEditor(
    state,
    repository,
    onChange,
    mediaService,
    access,
  );
  const accounts = useArtistAccounts(accountService, curator, editor.notify);
  const confirm = useConfirm();
  // Forms other than the work editor report unsaved changes here.
  const formDirty = useRef(false);
  const [formUnsaved, setFormUnsaved] = useState(false);
  const setDirty = useCallback((dirty: boolean) => {
    formDirty.current = dirty;
    setFormUnsaved(dirty);
  }, []);
  const editorDirty = useRef(false);
  editorDirty.current = editor.dirty;
  const canLeave = useCallback(
    async () =>
      (!editorDirty.current && !formDirty.current) ||
      confirm({
        title: "Sair sem salvar?",
        body: "As alterações desta tela serão perdidas.",
        confirmLabel: "Sair sem salvar",
        cancelLabel: "Continuar editando",
        tone: "danger",
      }),
    [confirm],
  );
  const { route, go } = useAdminRoute(canLeave);
  useUnloadWarning(editor.dirty || formUnsaved);
  const editorRef = useRef(editor);
  editorRef.current = editor;
  // The URL decides which work is open.
  useEffect(() => {
    const current = editorRef.current;
    if (route.section !== "works" || !route.id) {
      if (current.draft) current.discard();
      return;
    }
    if (route.id === "nova") {
      if (!current.create())
        void go(adminPath("works"), { replace: true, force: true });
      return;
    }
    if (current.draft?.record.id !== route.id) current.edit(route.id);
  }, [route]);
  if (!entered)
    return (
      <GatePage>
        <p>
          Modo demonstrativo: as alterações ficam só neste navegador e não vão
          para o Supabase.
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => setEntered(true)}
        >
          Entrar no editor demonstrativo
        </button>
        <button type="button" className="outline" onClick={onExit}>
          Voltar ao museu
        </button>
      </GatePage>
    );
  const admin: AdminContext = {
    state,
    view: scopedSnapshot(access, state.draft),
    access,
    curator,
    remote,
    editor,
    setDirty,
    open: (section, id) => void go(adminPath(section, id)),
    toList: (section) => void go(adminPath(section), { force: true }),
    replaceWithSaved: (section, id) =>
      go(adminPath(section, id), { replace: true, force: true }),
  };
  const { section, id } = route;
  const tabs: [AdminSection, string][] = [
    ["works", "Obras"],
    ...(curator ? ([["artists", "Artistas"]] as [AdminSection, string][]) : []),
    ["rooms", curator ? "Salas e exposição" : "Suas salas"],
    ["preview", "Prévia 3D"],
  ];
  const preview = section === "preview";
  const inForm = !!id && !preview;
  const content =
    section === "works" ? (
      id ? (
        <WorkScreen
          admin={admin}
          id={id}
          onPreview={(path) => go(path, { force: true })}
        />
      ) : (
        <WorksListScreen admin={admin} />
      )
    ) : section === "artists" && curator ? (
      id ? (
        <ArtistScreen admin={admin} accounts={accounts} id={id} />
      ) : (
        <ArtistsListScreen admin={admin} accounts={accounts} />
      )
    ) : section === "rooms" ? (
      id ? (
        <RoomScreen admin={admin} id={id} />
      ) : (
        <RoomsListScreen
          admin={admin}
          repository={repository}
          loadLocalDraft={loadLocalDraft}
          onChange={onChange}
        />
      )
    ) : (
      <NotFound
        text="Página não encontrada."
        onBack={() => admin.toList("works")}
      />
    );
  return (
    <div
      className={
        preview
          ? "admin-shell admin-shell-preview"
          : inForm
            ? "admin-shell admin-shell-form"
            : "admin-shell"
      }
    >
      <AdminBanner
        access={access}
        artists={state.draft.artists}
        remote={remote}
        accountEmail={accountEmail}
        onDemoAccess={(artistId) =>
          void go(adminPath("works")).then((ok) => {
            if (ok)
              setDemoAccess(artistId ? { kind: "artist", artistId } : CURATOR);
          })
        }
        onExit={onExit}
        onChangePassword={
          onChangePassword &&
          (async () => {
            if (await canLeave()) onChangePassword();
          })
        }
        onSignOut={onSignOut}
      />
      {!inForm && !preview && (
        <nav className="admin-nav" aria-label="Seções do admin">
          {tabs.map(([tab, label]) => (
            <button
              type="button"
              key={tab}
              aria-current={section === tab ? "page" : undefined}
              className={section === tab ? "active" : undefined}
              onClick={() => admin.open(tab)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      {!isOnAir(state.draft) && curator && !inForm && !preview && (
        <p className="off-air-warning" role="status">
          A exposição está fora do ar: o site não mostra nenhuma obra.{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => admin.open("rooms")}
          >
            Colocar no ar
          </button>
        </p>
      )}
      {preview ? (
        <PreviewScreen admin={admin} focus={route.focus} />
      ) : (
        <main className="admin">{content}</main>
      )}
      <Toast notice={editor.notice} onDismiss={editor.dismissNotice} />
    </div>
  );
}
