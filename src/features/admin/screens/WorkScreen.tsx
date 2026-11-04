import { canDeleteRecord, canEditRecord } from "../../../domain/access";
import { NotFound, useConfirm } from "../ui";
import { adminPath } from "../useAdminRoute";
import RecordEditor from "../works/RecordEditor";
import WorksList from "../works/WorksList";
import type { AdminContext } from "./types";
export function WorksListScreen({ admin }: { admin: AdminContext }) {
  const { view, access, open } = admin;
  return (
    <WorksList
      snapshot={view}
      access={access}
      canCreate={view.rooms.length > 0}
      onOpen={(id) => open("works", id)}
      onCreate={() => open("works", "nova")}
    />
  );
}
export function WorkScreen({
  admin,
  id,
  onPreview,
}: {
  admin: AdminContext;
  id: string;
  onPreview: (path: string) => Promise<unknown>;
}) {
  const { state, view, access, curator, remote, editor, open, toList } = admin;
  const confirm = useConfirm();
  const { draft } = editor;
  const isNew = id === "nova";
  const ready =
    draft &&
    (isNew
      ? !state.draft.records.some((r) => r.id === draft.record.id)
      : draft.record.id === id);
  if (!isNew && !canEditRecord(access, state.draft, id))
    return (
      <NotFound
        text="Obra não encontrada ou fora das suas salas."
        onBack={() => toList("works")}
      />
    );
  if (!draft || !ready) return <p role="status">Carregando…</p>;
  const saveWork = async () => {
    const workId = draft.record.id;
    const ok = await editor.save();
    if (ok && isNew) await admin.replaceWithSaved("works", workId);
    return ok;
  };
  return (
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
      onUpload={(file) => void editor.upload(file)}
      onUploadAudio={(file) => void editor.uploadAudio(file)}
      onSave={() => void saveWork()}
      onSavePreview={async () => {
        if (editor.dirty && !(await saveWork())) return;
        await onPreview(`${adminPath("preview")}?obra=${draft.record.id}`);
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
