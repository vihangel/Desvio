import { useMemo } from "react";
import type {
  CollectionSnapshot,
  CollectionState,
} from "../../../domain/entities";
import type { CollectionRepository } from "../../../domain/repository";
import { isOnAir } from "../../../domain/publication";
import LocalImport from "../LocalImport";
import ExhibitionEditor from "../rooms/ExhibitionEditor";
import RoomEditor, { newRoom } from "../rooms/RoomEditor";
import RoomsList from "../rooms/RoomsList";
import { NotFound, useConfirm } from "../ui";
import type { AdminContext } from "./types";
export function RoomsListScreen({
  admin,
  repository,
  loadLocalDraft,
  onChange,
}: {
  admin: AdminContext;
  repository: CollectionRepository;
  loadLocalDraft?: () => Promise<CollectionSnapshot>;
  onChange: (state: CollectionState) => void;
}) {
  const { state, access, curator, remote, editor, setDirty, open } = admin;
  const confirm = useConfirm();
  return (
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
            live={isOnAir(state.draft)}
            busy={editor.busy}
            onSave={editor.saveExhibition}
            onPublish={editor.publish}
            onArchive={editor.archive}
            onDirty={setDirty}
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
              type="button"
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
}
export function RoomScreen({ admin, id }: { admin: AdminContext; id: string }) {
  const { state, view, access, curator, editor, setDirty, open, toList } =
    admin;
  const isNew = id === "nova" && curator;
  const draftRoom = useMemo(() => newRoom(state.draft.rooms.length), [id]);
  const initial = isNew ? draftRoom : view.rooms.find((r) => r.id === id);
  if (!initial)
    return (
      <NotFound
        text="Sala não encontrada ou não vinculada a você."
        onBack={() => toList("rooms")}
      />
    );
  return (
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
        if (ok && isNew) await admin.replaceWithSaved("rooms", room.id);
        return ok;
      }}
      onDelete={async (room) => {
        if (await editor.deleteRoom(room)) toList("rooms");
      }}
    />
  );
}
