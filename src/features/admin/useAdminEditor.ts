import { useEffect, useRef, useState } from "react";
import type {
  CollectionState,
  Exhibition,
  RecordDraft,
} from "../../domain/entities";
import type { CollectionRepository } from "../../domain/repository";
import { selectRecordDraft } from "../../domain/selectors";
import { roomSlots } from "../../domain/slots";
import type { MediaService } from "../../domain/media";
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
        if (!savedMedia.current.some((m) => m.src === url))
          mediaService.release(url);
      });
    },
    [],
  );
  const run = async (
    operation: () => Promise<CollectionState>,
    message: string,
  ) => {
    if (lock.current) return false;
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
      return true;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha ao salvar.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const discard = () => {
    temporary.current.forEach((url) => {
      if (!savedMedia.current.some((m) => m.src === url)) {
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
    const room = state.draft.rooms.find((r) =>
      roomSlots(r).some(
        (s) =>
          s.type === "image" &&
          !state.draft.placements.some(
            (p) => p.roomId === r.id && p.slotId === s.id,
          ),
      ),
    );
    if (!room) {
      setNotice("As salas estão cheias. Libere um slot antes de adicionar.");
      return;
    }
    const slot = roomSlots(room).find(
      (s) =>
        s.type === "image" &&
        !state.draft.placements.some(
          (p) => p.roomId === room.id && p.slotId === s.id,
        ),
    )!;
    const id = crypto.randomUUID(),
      mediaId = crypto.randomUUID();
    setDraft({
      record: {
        id,
        title: "Nova obra",
        year: new Date().getFullYear(),
        description: "",
        kind: "Obra",
        credits: [],
        creditNote: "Artista convidado",
        status: "draft",
      },
      media: {
        id: mediaId,
        recordId: id,
        type: "image",
        src: "/art/desvio-fios.svg",
        alt: "Painel editorial demonstrativo",
        attribution: "Equipe Desvio",
        rights: "demo",
      },
      placement: {
        id: crypto.randomUUID(),
        recordId: id,
        mediaId,
        roomId: room.id,
        slotId: slot.id,
        position: slot.position,
        rotation: slot.rotation,
        scale: [1, 1, 1],
      },
    });
  };
  const place = (roomId: string, slotId?: string, type = draft?.media.type) => {
    if (!draft || !type) return;
    const room = state.draft.rooms.find((r) => r.id === roomId);
    const slots =
      room &&
      roomSlots(room).filter(
        (s) =>
          s.type === type &&
          !state.draft.placements.some(
            (p) =>
              p.recordId !== draft.record.id &&
              p.roomId === roomId &&
              p.slotId === s.id,
          ),
      );
    const slot = slots?.find((s) => !slotId || s.id === slotId);
    if (!slot) {
      setNotice("Não há slot disponível para esta mídia na sala.");
      return;
    }
    setDraft({
      ...draft,
      media: {
        ...draft.media,
        type,
        src: type === draft.media.type ? draft.media.src : undefined,
      },
      placement: {
        ...draft.placement,
        roomId,
        slotId: slot.id,
        position: slot.position,
        rotation: slot.rotation,
      },
    });
  };
  const upload = async (file?: File) => {
    if (!file || !draft || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const src = await mediaService.prepare(file, draft.media.type);
      if (src.startsWith("blob:")) temporary.current.add(src);
      setDraft({ ...draft, media: { ...draft.media, src, rights: "demo" } });
      setNotice(
        draft.media.type === "model"
          ? "GLB disponível apenas nesta sessão; publicação exige arquivo persistente."
          : "Imagem preparada. Salve o rascunho.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return {
    draft,
    setDraft,
    notice,
    busy,
    edit,
    create,
    discard,
    place,
    upload,
    save: async () => {
      if (
        draft &&
        (await run(
          () => repository.saveRecord(draft, state.revision),
          "Rascunho salvo localmente. A versão publicada foi preservada.",
        ))
      )
        setDraft(null);
    },
    remove: async () => {
      if (
        draft &&
        (await run(
          () => repository.deleteRecord(draft.record.id, state.revision),
          "Registro removido do rascunho.",
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
        "Exposição salva como rascunho.",
      ),
    review: () =>
      run(
        () => repository.submitReview(state.revision),
        "Exposição em revisão local.",
      ),
    publish: () =>
      run(
        () => repository.publish(state.revision),
        "Versão publicada atualizada neste navegador.",
      ),
    archive: () =>
      run(
        () => repository.archive(state.revision),
        "Exposição arquivada neste navegador.",
      ),
  };
}
