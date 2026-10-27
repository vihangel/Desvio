import LocalImport from "./LocalImport";
import RoomEditor, { RoomsList, newRoom } from "./RoomEditor";
import ArtistEditor, { ArtistsList } from "./ArtistEditor";
import WorksList from "./WorksList";
import RecordEditor from "./RecordEditor";
import ExhibitionEditor from "./ExhibitionEditor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ArtworkDialog from "../../shared/ArtworkDialog";
import VisitPage from "../visit/VisitPage";
import type {
  Artist,
  Artwork,
  CollectionSnapshot,
  CollectionState,
} from "../../domain/entities";
import type { MediaService } from "../../domain/media";
import type { CollectionRepository } from "../../domain/repository";
import type {
  ArtistAccount,
  ArtistAccountService,
} from "../../domain/accounts";
import { selectArtworks } from "../../domain/selectors";
import { isOnAir } from "../../domain/publication";
import {
  CURATOR,
  canDeleteRecord,
  canEditRecord,
  scopedSnapshot,
  type Access,
} from "../../domain/access";
import { useAdminEditor } from "./useAdminEditor";
import {
  adminPath,
  useAdminRoute,
  useUnloadWarning,
  type AdminSection,
} from "./useAdminRoute";
import { ConfirmProvider, Toast, useConfirm } from "./ui";
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
const newArtist = (): Artist => ({
  id: crypto.randomUUID(),
  name: "",
  location: "",
  bio: "",
  source: "",
});
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
  const [selected, setSelected] = useState<Artwork | null>(null);
  const editor = useAdminEditor(
    state,
    repository,
    onChange,
    mediaService,
    access,
  );
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
  const view = scopedSnapshot(access, state.draft);
  const onAir = isOnAir(state.draft);
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
  // Artist accounts (curators, Supabase only).
  const [accounts, setAccounts] = useState<ArtistAccount[]>();
  const reloadAccounts = useCallback(async () => {
    if (!accountService || !curator) return;
    try {
      setAccounts(await accountService.list());
    } catch (error) {
      setAccounts([]);
      editor.notify(
        error instanceof Error ? error.message : "Falha ao listar contas.",
        "error",
      );
    }
  }, [accountService, curator]);
  useEffect(() => {
    void reloadAccounts();
  }, [reloadAccounts]);
  const newArtistDraft = useMemo(newArtist, [route.section, route.id]);
  const newRoomDraft = useMemo(
    () => newRoom(state.draft.rooms.length),
    [route.section, route.id],
  );
  if (!entered)
    return (
      <main className="admin admin-gate">
        <div className="eyebrow">ÁREA ADMINISTRATIVA</div>
        <h1>Gestão do Desvio</h1>
        <p>
          Modo demonstrativo: as alterações ficam só neste navegador e não vão
          para o Supabase.
        </p>
        <button className="primary" onClick={() => setEntered(true)}>
          Entrar no editor demonstrativo
        </button>
        <button className="outline" onClick={onExit}>
          Voltar ao museu
        </button>
      </main>
    );
  const artistName =
    access.kind === "artist"
      ? state.draft.artists.find((a) => a.id === access.artistId)?.name
      : undefined;
  const tabs: [AdminSection, string][] = [
    ["works", "Obras"],
    ...(curator ? ([["artists", "Artistas"]] as [AdminSection, string][]) : []),
    ["rooms", curator ? "Salas e exposição" : "Suas salas"],
    ["preview", "Prévia 3D"],
  ];
  const open = (section: AdminSection, id?: string) =>
    void go(adminPath(section, id));
  const toList = (section: AdminSection) =>
    void go(adminPath(section), { force: true });
  let content: React.ReactNode;
  if (route.section === "works" && route.id) {
    const draft = editor.draft;
    const isNew = route.id === "nova";
    const ready =
      draft &&
      (isNew
        ? !state.draft.records.some((r) => r.id === draft.record.id) ||
          draft.record.id === route.id
        : draft.record.id === route.id);
    if (!isNew && !canEditRecord(access, state.draft, route.id))
      content = (
        <NotFound
          text="Obra não encontrada ou fora das suas salas."
          onBack={() => toList("works")}
        />
      );
    else if (!draft || !ready) content = <p role="status">Carregando…</p>;
    else {
      const saveWork = async () => {
        const id = draft.record.id;
        const ok = await editor.save();
        if (ok && isNew)
          await go(adminPath("works", id), { replace: true, force: true });
        return ok;
      };
      content = (
        <RecordEditor
          key={draft.record.id}
          draft={draft}
          snapshot={view}
          access={access}
          isNew={isNew}
          dirty={editor.dirty}
          busy={editor.busy}
          remote={remote}
          canDelete={canDeleteRecord(access, state.draft, draft.record.id)}
          onChange={editor.setDraft}
          onPlace={editor.place}
          onUpload={editor.upload}
          onUploadAudio={editor.uploadAudio}
          onSave={saveWork}
          onSavePreview={async () => {
            if (editor.dirty && !(await saveWork())) return;
            await go(`${adminPath("preview")}?obra=${draft.record.id}`, {
              force: true,
            });
          }}
          onBack={() => open("works")}
          onDiscard={async () => {
            if (
              await confirm({
                title: "Descartar alterações?",
                body: "A obra volta a ficar como estava salva.",
                confirmLabel: "Descartar",
                tone: "danger",
              })
            )
              editor.edit(draft.record.id);
          }}
          onDelete={async () => {
            if (
              (await confirm({
                title: `Excluir “${draft.record.title || "obra sem título"}”?`,
                body: curator
                  ? "A obra sai do acervo e do site. Não dá para desfazer. Para só tirar do site, use o status Desativada."
                  : "A obra é removida. Não dá para desfazer.",
                confirmLabel: "Excluir obra",
                tone: "danger",
              })) &&
              (await editor.remove())
            )
              toList("works");
          }}
          onSwap={editor.swap}
        />
      );
    }
  } else if (route.section === "works")
    content = (
      <WorksList
        snapshot={view}
        access={access}
        canCreate={view.rooms.length > 0}
        onOpen={(id) => open("works", id)}
        onCreate={() => open("works", "nova")}
      />
    );
  else if (route.section === "artists" && curator && route.id) {
    const isNew = route.id === "nova";
    const initial = isNew
      ? newArtistDraft
      : state.draft.artists.find((a) => a.id === route.id);
    content = initial ? (
      <ArtistEditor
        key={`${initial.id}:${state.revision}`}
        initial={initial}
        isNew={isNew}
        snapshot={state.draft}
        busy={editor.busy}
        remote={remote}
        accounts={accounts}
        onDirty={setDirty}
        onBack={() => open("artists")}
        onUploadPhoto={editor.uploadPhoto}
        onOpenRooms={() => open("rooms")}
        onSave={async (artist) => {
          const ok = await editor.saveArtist(artist);
          if (ok && isNew) {
            await go(adminPath("artists", artist.id), {
              replace: true,
              force: true,
            });
            if (accountService)
              editor.notify(
                `${artist.name} salva. Para dar acesso ao admin, use “Acesso da pessoa artista” nesta tela.`,
                "success",
              );
          }
          return ok;
        }}
        onDelete={async (artist) => {
          if (await editor.deleteArtist(artist)) {
            toList("artists");
            void reloadAccounts();
          }
        }}
        onCreateAccess={
          accountService
            ? async (email) => {
                try {
                  editor.notify(`Criando o acesso de ${email}…`);
                  const created = await accountService.create(
                    email,
                    initial.id,
                  );
                  editor.notify("Acesso criado. Copie a senha.", "success");
                  await reloadAccounts();
                  return created;
                } catch (error) {
                  editor.notify(
                    error instanceof Error
                      ? error.message
                      : "Falha ao criar acesso.",
                    "error",
                  );
                  return undefined;
                }
              }
            : undefined
        }
        onResetPassword={async (account) => {
          if (!accountService) return undefined;
          try {
            const next = await accountService.resetPassword(account.userId);
            editor.notify("Nova senha gerada. Copie e envie.", "success");
            return next;
          } catch (error) {
            editor.notify(
              error instanceof Error ? error.message : "Falha ao gerar senha.",
              "error",
            );
            return undefined;
          }
        }}
        onRemoveAccount={async (account) => {
          if (
            !accountService ||
            !(await confirm({
              title: `Remover o acesso de ${account.email}?`,
              body: "O login da pessoa é apagado e ela deixa de editar as salas. Você pode criar um acesso novo depois.",
              confirmLabel: "Remover acesso",
              tone: "danger",
            }))
          )
            return;
          try {
            await accountService.remove(account.userId);
            editor.notify("Acesso removido.", "success");
            await reloadAccounts();
          } catch (error) {
            editor.notify(
              error instanceof Error ? error.message : "Falha ao remover.",
              "error",
            );
          }
        }}
      />
    ) : (
      <NotFound
        text="Pessoa artista não encontrada."
        onBack={() => toList("artists")}
      />
    );
  } else if (route.section === "artists" && curator)
    content = (
      <ArtistsList
        snapshot={state.draft}
        accounts={accounts}
        onOpen={(id) => open("artists", id)}
        onCreate={() => open("artists", "nova")}
      />
    );
  else if (route.section === "rooms" && route.id) {
    const isNew = route.id === "nova" && curator;
    const initial = isNew
      ? newRoomDraft
      : view.rooms.find((r) => r.id === route.id);
    content = initial ? (
      <RoomEditor
        key={`${initial.id}:${state.revision}`}
        initial={initial}
        isNew={isNew}
        snapshot={state.draft}
        access={access}
        busy={editor.busy}
        onDirty={setDirty}
        onBack={() => open("rooms")}
        onSave={async (room) => {
          const ok = await editor.saveRoom(room);
          if (ok && isNew)
            await go(adminPath("rooms", room.id), {
              replace: true,
              force: true,
            });
          return ok;
        }}
        onDelete={async (room) => {
          if (await editor.deleteRoom(room)) toList("rooms");
        }}
      />
    ) : (
      <NotFound
        text="Sala não encontrada ou não vinculada a você."
        onBack={() => toList("rooms")}
      />
    );
  } else if (route.section === "rooms")
    content = (
      <RoomsList
        snapshot={state.draft}
        access={access}
        busy={editor.busy}
        onOpen={(id) => open("rooms", id)}
        onCreate={() => open("rooms", "nova")}
        onOrder={editor.reorderRooms}
      >
        {curator && (
          <>
            <ExhibitionEditor
              key={`exhibition-${state.revision}`}
              snapshot={state.draft}
              live={onAir}
              busy={editor.busy}
              onSave={editor.saveExhibition}
              onPublish={editor.publish}
              onArchive={editor.archive}
            />
            {remote && loadLocalDraft && (
              <LocalImport
                repository={repository}
                revision={state.revision}
                load={loadLocalDraft}
                onChange={onChange}
              />
            )}
            {!remote && (
              <button
                disabled={editor.busy}
                className="link-button danger-link"
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Restaurar o acervo de exemplo?",
                      body: "Apaga as alterações feitas neste navegador.",
                      confirmLabel: "Restaurar",
                      tone: "danger",
                    })
                  )
                    void editor.reset();
                }}
              >
                Restaurar acervo de exemplo
              </button>
            )}
          </>
        )}
      </RoomsList>
    );
  else if (route.section === "preview")
    content = (
      <>
        <div className="admin-preview-toolbar">
          <button
            onClick={() =>
              route.focus ? open("works", route.focus) : open("works")
            }
          >
            ← Voltar
          </button>
          <span>
            Inclui rascunhos. Visitantes só veem as obras publicadas;
            desativadas não aparecem.
          </span>
        </div>
        <VisitPage
          key={route.focus ?? "preview"}
          works={selectArtworks(view)}
          rooms={view.rooms}
          onSelect={setSelected}
          disabled={!!selected}
          initialWorkId={route.focus}
          initialGuided={false}
        />
      </>
    );
  else
    content = (
      <NotFound text="Página não encontrada." onBack={() => toList("works")} />
    );
  const inForm = !!route.id && route.section !== "preview";
  return (
    <div
      className={
        route.section === "preview"
          ? "admin-shell admin-shell-preview"
          : inForm
            ? "admin-shell admin-shell-form"
            : "admin-shell"
      }
    >
      <section className="admin-preview-banner" aria-label="Sessão">
        <b>
          {access.kind === "artist"
            ? `Área da artista${artistName ? ` · ${artistName}` : ""}`
            : remote
              ? "Curadoria"
              : "Modo demonstrativo"}
        </b>
        <span>
          {remote ? accountEmail : "Nada aqui vai para o banco de dados."}
        </span>
        {!remote && (
          <label className="demo-access">
            Ver como
            <select
              value={access.kind === "artist" ? access.artistId : ""}
              onChange={(e) => {
                const artistId = e.target.value;
                void go(adminPath("works")).then((ok) => {
                  if (ok)
                    setDemoAccess(
                      artistId ? { kind: "artist", artistId } : CURATOR,
                    );
                });
              }}
            >
              <option value="">Curadoria</option>
              {state.draft.artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button onClick={onExit}>Ver o site</button>
        {onChangePassword && (
          <button
            onClick={async () => {
              if (await canLeave()) onChangePassword();
            }}
          >
            Trocar senha
          </button>
        )}
        {onSignOut && <button onClick={onSignOut}>Sair</button>}
      </section>
      {!inForm && route.section !== "preview" && (
        <nav className="admin-nav" aria-label="Seções do admin">
          {tabs.map(([section, label]) => (
            <button
              key={section}
              aria-current={route.section === section ? "page" : undefined}
              className={route.section === section ? "active" : undefined}
              onClick={() => open(section)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      {!onAir && curator && !inForm && route.section !== "preview" && (
        <p className="off-air-warning" role="status">
          A exposição está fora do ar: o site não mostra nenhuma obra.{" "}
          <button className="link-button" onClick={() => open("rooms")}>
            Colocar no ar
          </button>
        </p>
      )}
      {route.section === "preview" ? (
        content
      ) : (
        <main className="admin">{content}</main>
      )}
      <Toast notice={editor.notice} onDismiss={editor.dismissNotice} />
      {selected && (
        <ArtworkDialog selected={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
function NotFound({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
      <button className="outline" onClick={onBack}>
        Voltar à lista
      </button>
    </div>
  );
}
