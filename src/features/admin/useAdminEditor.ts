import { useEffect, useRef, useState } from "react";
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
export function useAdminEditor(
  state: CollectionState,
  repository: CollectionRepository,
  onChange: (state: CollectionState) => void,
  mediaService: MediaService,
) {
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const temporary = useRef(new Set<string>());
  const savedMedia = useRef(state.draft.media);
  savedMedia.current = state.draft.media;
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
    message: string,
  ) => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    setNotice("");
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
      setNotice(message);
      return next;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha ao salvar.");
      return undefined;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const run = async (
    operation: () => Promise<CollectionState>,
    message: string,
  ) => !!(await apply(operation, message));
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
    setDraft(selectRecordDraft(state.draft, id));
  };
  const create = () => {
    discard();
    try {
      setDraft(newRecordDraft(state.draft));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Falha ao criar obra.",
      );
    }
  };
  const place = (roomId: string, slotId?: string, type = draft?.media.type) => {
    if (!draft) return;
    try {
      setDraft(placeRecordDraft(draft, state.draft, roomId, slotId, type));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Falha ao posicionar.",
      );
    }
  };
  const upload = async (file?: File) => {
    if (!file || !draft || lock.current) return;
    if (draft.media.type === "video") {
      setNotice("Cole um link do YouTube.");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const type = draft.media.type;
      let source: UploadSource = file;
      let summary = "";
      if (type === "model" && mediaService.optimizeModel) {
        const optimized = await optimizeForUpload(
          file,
          mediaService.modelLimit,
          (options) => mediaService.optimizeModel!(file, options),
          setNotice,
        );
        source = optimized.file;
        summary = `Modelo otimizado: ${megabytes(file.size)} → ${megabytes(optimized.file.size)}${
          optimized.optimizedTriangles < optimized.triangles
            ? `, ${optimized.optimizedTriangles.toLocaleString("pt-BR")} triângulos`
            : ""
        }. `;
        setNotice(`${summary}Enviando…`);
      }
      const prepared = await mediaService.prepare(source, type);
      const { src } = prepared;
      if (src.startsWith("blob:")) temporary.current.add(src);
      // Functional update: uploads take seconds and must not undo edits made
      // meanwhile, nor attach the file if the media type changed.
      setDraft((current) =>
        current && current.media.type === type
          ? { ...current, media: { ...current.media, ...prepared } }
          : current,
      );
      setNotice(
        summary +
          (repository.mode === "supabase"
            ? `Arquivo “${source.name}” enviado. Salve a obra para vinculá-lo.`
            : type === "model"
              ? "Modelo 3D disponível apenas nesta sessão do navegador."
              : "Imagem preparada. Salve a obra."),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return {
    swap: async (otherId: string) => {
      if (draft && isDirty(draft, state.draft)) {
        setNotice(
          "Salve ou cancele os ajustes desta obra antes de trocar posições.",
        );
        return;
      }
      if (
        draft &&
        (await run(
          () =>
            repository.swapPlacements(draft.record.id, otherId, state.revision),
          "Posições trocadas.",
        ))
      )
        setDraft(null);
    },
    uploadAudio: async (file?: File) => {
      if (!file || !draft || lock.current) return;
      lock.current = true;
      setBusy(true);
      try {
        const audio = await mediaService.prepare(file, "audio");
        if (audio.src.startsWith("blob:")) temporary.current.add(audio.src);
        setDraft({
          ...draft,
          media: {
            ...draft.media,
            narration: {
              ...audio,
              credits: draft.media.narration?.credits ?? "",
              transcript: draft.media.narration?.transcript ?? "",
              authorized: false,
            },
          },
        });
        setNotice(
          "Áudio anexado. Registre os créditos e a autorização, depois salve.",
        );
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Falha ao enviar áudio.",
        );
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    saveArtist: (artist: Artist) =>
      run(
        () => repository.saveArtist(artist, state.revision),
        "Artista salvo.",
      ),
    saveRoom: (room: ExhibitionRoom) =>
      run(() => repository.saveRoom(room, state.revision), "Sala salva."),
    deleteRoom: (id: string) =>
      run(
        () => repository.deleteRoom(id, state.revision),
        "Sala vazia removida.",
      ),
    reorderRooms: (ids: string[]) =>
      run(
        () => repository.reorderRooms(ids, state.revision),
        "Ordem das salas atualizada.",
      ),
    draft,
    setDraft,
    notice,
    busy,
    edit,
    create,
    discard,
    place,
    upload,
    dirty: !!draft && isDirty(draft, state.draft),
    save: async () => {
      if (!draft) return false;
      const next = await apply(
        () => repository.saveRecord(draft, state.revision),
        draft.record.status === "published"
          ? "Obra salva e atualizada no site."
          : "Obra salva. Ela não aparece no site enquanto não estiver publicada.",
      );
      // Keep the work open so the person sees it was stored.
      if (next) setDraft(selectRecordDraft(next.draft, draft.record.id));
      return !!next;
    },
    remove: async () => {
      if (
        draft &&
        window.confirm(
          `Excluir “${draft.record.title || "obra sem título"}” definitivamente? Para só tirar do site, use o status Desativada.`,
        ) &&
        (await run(
          () => repository.deleteRecord(draft.record.id, state.revision),
          "Obra excluída.",
        ))
      )
        discard();
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
    archive: () =>
      run(
        () => repository.archive(state.revision),
        "Exposição fora do ar. Nenhuma obra aparece no site até você colocá-la no ar de novo.",
      ),
  };
}
