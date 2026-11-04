import type { Dispatch, SetStateAction } from "react";
import type { CollectionState, RecordDraft } from "../../domain/entities";
import type { CollectionRepository } from "../../domain/repository";
import { selectRecordDraft } from "../../domain/selectors";
import { newRecordDraft, placeRecordDraft } from "../../domain/mounting";
import { editableRooms, type Access } from "../../domain/access";
import { errorMessage } from "../../domain/errors";
import type { CollectionActions } from "./useCollectionActions";
import type { Notify } from "./useNotice";
function isDirty(draft: RecordDraft, snapshot: CollectionState["draft"]) {
  if (!snapshot.records.some((r) => r.id === draft.record.id)) return true;
  return (
    JSON.stringify(draft) !==
    JSON.stringify(selectRecordDraft(snapshot, draft.record.id))
  );
}
// What each actor's save means: artists always send work back for review;
// curators publishing a work settle any pending review.
function forSave(draft: RecordDraft, access: Access): RecordDraft {
  const record = { ...draft.record };
  if (access.kind === "artist") {
    record.status = "draft";
    record.reviewRequested = true;
  } else if (record.status === "published") delete record.reviewRequested;
  return { ...draft, record };
}
// The work open in the editor: creating, placing, saving and removing it.
export function useRecordDraft({
  draft,
  setDraft,
  state,
  repository,
  access,
  actions,
  notify,
  releaseUnsaved,
}: {
  draft: RecordDraft | null;
  setDraft: Dispatch<SetStateAction<RecordDraft | null>>;
  state: CollectionState;
  repository: CollectionRepository;
  access: Access;
  actions: CollectionActions;
  notify: Notify;
  releaseUnsaved: () => void;
}) {
  const { apply, run } = actions;
  const discard = () => {
    releaseUnsaved();
    setDraft(null);
  };
  return {
    dirty: !!draft && isDirty(draft, state.draft),
    discard,
    edit: (id: string) => {
      discard();
      try {
        setDraft(selectRecordDraft(state.draft, id));
        return true;
      } catch {
        return false;
      }
    },
    create: () => {
      discard();
      try {
        // Artists start in their own rooms and are credited by default.
        const next = newRecordDraft({
          ...state.draft,
          rooms: editableRooms(access, state.draft),
        });
        if (access.kind === "artist") {
          next.record.credits = [
            { artistId: access.artistId, role: "artista" },
          ];
          next.record.creditNote = "";
        }
        setDraft(next);
        return true;
      } catch (error) {
        notify(errorMessage(error, "Falha ao criar obra."), "error");
        return false;
      }
    },
    place: (roomId: string, slotId?: string, type = draft?.media.type) => {
      if (!draft) return;
      try {
        setDraft(placeRecordDraft(draft, state.draft, roomId, slotId, type));
      } catch (error) {
        notify(errorMessage(error, "Falha ao posicionar."), "error");
      }
    },
    swap: async (otherId: string) => {
      if (!draft) return;
      if (isDirty(draft, state.draft)) {
        notify(
          "Salve ou descarte os ajustes desta obra antes de trocar de lugar.",
          "error",
        );
        return;
      }
      const next = await apply(
        () =>
          repository.swapPlacements(draft.record.id, otherId, state.revision),
        "Obras trocadas de lugar.",
      );
      if (next) setDraft(selectRecordDraft(next.draft, draft.record.id));
    },
    save: async () => {
      if (!draft) return false;
      const payload = forSave(draft, access);
      const next = await apply(
        () => repository.saveRecord(payload, state.revision),
        access.kind === "artist"
          ? "Obra salva e enviada para a curadoria. Ela aparece no site depois de aprovada."
          : payload.record.status === "published"
            ? "Obra salva e atualizada no site."
            : "Obra salva. Ela não aparece no site enquanto não estiver publicada.",
      );
      // Keep the work open so the person sees it was stored.
      if (next) setDraft(selectRecordDraft(next.draft, draft.record.id));
      return !!next;
    },
    remove: async () => {
      if (!draft) return false;
      const removed = await run(
        () => repository.deleteRecord(draft.record.id, state.revision),
        `“${draft.record.title}” foi excluída.`,
      );
      if (removed) discard();
      return removed;
    },
    reset: async () => {
      if (
        await run(
          () => repository.resetDemo(state.revision),
          "Demonstração restaurada.",
        )
      )
        discard();
    },
  };
}
