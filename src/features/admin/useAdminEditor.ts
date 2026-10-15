import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Artist,
  ExhibitionRoom,
  CollectionState,
  Exhibition,
  RecordDraft,
} from "../../domain/entities";
import type { CollectionRepository } from "../../domain/repository";
import { selectRecordDraft } from "../../domain/selectors";
import { newRecordDraft, placeRecordDraft } from "../../domain/mounting";
import type { MediaService, UploadSource } from "../../domain/media";
import { megabytes, optimizeForUpload } from "./modelUpload";
import type { RecordStatus } from "../../domain/publication";
import { editableRooms, type Access } from "../../domain/access";
export type Notice = {
  id: number;
  text: string;
  kind: "success" | "error" | "info";
};
const statusMessages: Record<RecordStatus, string> = {
  published: "Obra publicada. Ela já aparece no site.",
  draft: "Obra em rascunho. Ela saiu do site e fica só para a equipe.",
  archived: "Obra desativada. Ela não aparece no site nem na prévia.",
};
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
const message = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;
export function useAdminEditor(
  state: CollectionState,
  repository: CollectionRepository,
  onChange: (state: CollectionState) => void,
  mediaService: MediaService,
  access: Access,
) {
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const temporary = useRef(new Set<string>());
  const savedMedia = useRef(state.draft.media);
  savedMedia.current = state.draft.media;
  const notify = useCallback(
    (text: string, kind: Notice["kind"] = "info") =>
      setNotice({ id: Date.now(), text, kind }),
    [],
  );
  const dismissNotice = useCallback(() => setNotice(null), []);
  useEffect(
    () => () => {
      temporary.current.forEach((url) => {
        if (
          !savedMedia.current.some(
            (m) => m.src === url || m.narration?.src === url,
          )
        )
          mediaService.release(url);
      });
    },
    [],
  );
  const apply = async (
    operation: () => Promise<CollectionState>,
    success: string,
  ) => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    try {
      const next = await operation();
      for (const media of state.draft.media) {
        if (
          media.src?.startsWith("blob:") &&
          !next.draft.media.some((m) => m.src === media.src)
        )
          mediaService.release(media.src);
      }
      savedMedia.current = next.draft.media;
      onChange(next);
      notify(success, "success");
      return next;
    } catch (e) {
      notify(message(e, "Falha ao salvar."), "error");
      return undefined;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const run = async (
    operation: () => Promise<CollectionState>,
    success: string,
  ) => !!(await apply(operation, success));
  const withLock = async (task: () => Promise<void>, fallback: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await task();
    } catch (e) {
      notify(message(e, fallback), "error");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const discard = () => {
    temporary.current.forEach((url) => {
      if (
        !savedMedia.current.some(
          (m) => m.src === url || m.narration?.src === url,
        )
      ) {
        mediaService.release(url);
        temporary.current.delete(url);
      }
    });
    setDraft(null);
  };
  const edit = (id: string) => {
    discard();
    try {
      setDraft(selectRecordDraft(state.draft, id));
      return true;
    } catch {
      return false;
    }
  };
  const create = () => {
    discard();
    try {
      // Artists start in their own rooms and are credited by default.
      const scope = {
        ...state.draft,
        rooms: editableRooms(access, state.draft),
      };
      const next = newRecordDraft(scope);
      if (access.kind === "artist") {
        next.record.credits = [{ artistId: access.artistId, role: "artista" }];
        next.record.creditNote = "";
      }
      setDraft(next);
      return true;
    } catch (error) {
      notify(message(error, "Falha ao criar obra."), "error");
      return false;
    }
  };
  const place = (roomId: string, slotId?: string, type = draft?.media.type) => {
    if (!draft) return;
    try {
      setDraft(placeRecordDraft(draft, state.draft, roomId, slotId, type));
    } catch (error) {
      notify(message(error, "Falha ao posicionar."), "error");
    }
  };
  const upload = (file?: File) =>
    withLock(async () => {
      if (!file || !draft) return;
      if (draft.media.type === "video") {
        notify("Cole um link do YouTube.", "error");
        return;
      }
      const type = draft.media.type;
      let source: UploadSource = file;
      let summary = "";
      if (type === "model" && mediaService.optimizeModel) {
        const optimized = await optimizeForUpload(
          file,
          mediaService.modelLimit,
          (options) => mediaService.optimizeModel!(file, options),
          (text) => notify(text),
        );
        source = optimized.file;
        summary = `Modelo otimizado: ${megabytes(file.size)} → ${megabytes(optimized.file.size)}${
          optimized.optimizedTriangles < optimized.triangles
            ? `, ${optimized.optimizedTriangles.toLocaleString("pt-BR")} triângulos`
            : ""
        }. `;
        notify(`${summary}Enviando…`);
      } else notify(`Enviando “${file.name}”…`);
      const prepared = await mediaService.prepare(source, type);
      if (prepared.src.startsWith("blob:")) temporary.current.add(prepared.src);
      // Functional update: uploads take seconds and must not undo edits made
      // meanwhile, nor attach the file if the media type changed.
      setDraft((current) =>
        current && current.media.type === type
          ? { ...current, media: { ...current.media, ...prepared } }
          : current,
      );
      notify(
        summary +
          (repository.mode === "supabase"
            ? "Arquivo enviado. Salve a obra para vinculá-lo."
            : type === "model"
              ? "Modelo 3D disponível apenas nesta sessão do navegador."
              : "Imagem preparada. Salve a obra."),
        "success",
      );
    }, "Falha no envio.");
  return {
    draft,
    setDraft,
    notice,
    notify,
    dismissNotice,
    busy,
    edit,
    create,
    discard,
    place,
    upload,
    dirty: !!draft && isDirty(draft, state.draft),
    uploadAudio: (file?: File) =>
      withLock(async () => {
        if (!file) return;
        notify(`Enviando “${file.name}”…`);
        const audio = await mediaService.prepare(file, "audio");
        if (audio.src.startsWith("blob:")) temporary.current.add(audio.src);
        setDraft((current) =>
          current
            ? {
                ...current,
                media: {
                  ...current.media,
                  narration: {
                    ...audio,
                    credits: current.media.narration?.credits ?? "",
                    transcript: current.media.narration?.transcript ?? "",
                    authorized: false,
                  },
                },
              }
            : current,
        );
        notify(
          "Áudio anexado. Registre os créditos e a autorização, depois salve.",
          "success",
        );
      }, "Falha ao enviar áudio."),
    // Uploads a downscaled photo and returns its stored reference.
    uploadPhoto: async (file: File) => {
      let stored: Artist["photo"];
      await withLock(async () => {
        notify("Preparando a foto…");
        const source = mediaService.optimizeImage
          ? await mediaService.optimizeImage(file, 1200)
          : file;
        const { src, bucket, path } = await mediaService.prepare(
          source,
          "image",
        );
        stored = { src, bucket, path };
        notify(
          "Foto enviada. Salve a pessoa artista para vinculá-la.",
          "success",
        );
      }, "Falha ao enviar a foto.");
      return stored;
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
    saveArtist: (artist: Artist) =>
      run(
        () => repository.saveArtist(artist, state.revision),
        `${artist.name} salva.`,
      ),
    deleteArtist: (artist: Artist) =>
      run(
        () => repository.deleteArtist(artist.id, state.revision),
        `${artist.name} foi excluída.`,
      ),
    saveRoom: (room: ExhibitionRoom) =>
      run(
        () => repository.saveRoom(room, state.revision),
        `Sala “${room.name}” salva.`,
      ),
    deleteRoom: (room: ExhibitionRoom) =>
      run(
        () => repository.deleteRoom(room.id, state.revision),
        `Sala “${room.name}” excluída.`,
      ),
    reorderRooms: (ids: string[]) =>
      run(
        () => repository.reorderRooms(ids, state.revision),
        "Ordem das salas atualizada.",
      ),
    saveExhibition: (exhibition: Exhibition) =>
      run(
        () => repository.saveExhibition(exhibition, state.revision),
        "Dados da exposição salvos.",
      ),
    publish: () =>
      run(
        () => repository.publish(state.revision),
        "Exposição no ar. O site mostra as obras publicadas.",
      ),
    archive: () =>
      run(
        () => repository.archive(state.revision),
        "Exposição fora do ar. Nenhuma obra aparece no site até você colocá-la no ar de novo.",
      ),
    setStatus: async (id: string, status: RecordStatus) => {
      const next = await apply(
        () => repository.setRecordStatus(id, status, state.revision),
        statusMessages[status],
      );
      // Keep an open, unedited work in sync with its new status.
      if (next && draft?.record.id === id && !isDirty(draft, state.draft))
        setDraft(selectRecordDraft(next.draft, id));
      return !!next;
    },
  };
}
export type AdminEditor = ReturnType<typeof useAdminEditor>;
