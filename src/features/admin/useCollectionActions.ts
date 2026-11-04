import { useRef, useState } from "react";
import type {
  Artist,
  CollectionState,
  Exhibition,
  ExhibitionRoom,
} from "../../domain/entities";
import type { CollectionRepository } from "../../domain/repository";
import type { MediaService } from "../../domain/media";
import { errorMessage } from "../../domain/errors";
import { isSessionUrl } from "../../domain/mediaUrls";
import type { Notify } from "./useNotice";
// Runs repository commands one at a time and reports the outcome.
export function useCollectionActions(
  state: CollectionState,
  repository: CollectionRepository,
  onChange: (state: CollectionState) => void,
  mediaService: MediaService,
  notify: Notify,
) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const savedMedia = useRef(state.draft.media);
  savedMedia.current = state.draft.media;
  // Exclusive work with its own messages (uploads, for instance).
  const withLock = async <T>(task: () => Promise<T>, fallback: string) => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    try {
      return await task();
    } catch (e) {
      notify(errorMessage(e, fallback), "error");
      return undefined;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const apply = (operation: () => Promise<CollectionState>, success: string) =>
    withLock(async () => {
      const next = await operation();
      const kept = new Set(
        next.draft.media.flatMap((m) => [m.src, m.narration?.src]),
      );
      for (const url of state.draft.media.flatMap((m) => [
        m.src,
        m.narration?.src,
      ]))
        if (url && isSessionUrl(url) && !kept.has(url))
          mediaService.release(url);
      savedMedia.current = next.draft.media;
      onChange(next);
      notify(success, "success");
      return next;
    }, "Falha ao salvar.");
  const run = async (
    operation: () => Promise<CollectionState>,
    success: string,
  ) => !!(await apply(operation, success));
  const { revision } = state;
  return {
    busy,
    savedMedia,
    withLock,
    apply,
    run,
    saveArtist: (artist: Artist) =>
      run(
        () => repository.saveArtist(artist, revision),
        `Perfil de ${artist.name} salvo.`,
      ),
    deleteArtist: (artist: Artist) =>
      run(
        () => repository.deleteArtist(artist.id, revision),
        `Perfil de ${artist.name} excluído.`,
      ),
    saveRoom: (room: ExhibitionRoom) =>
      run(
        () => repository.saveRoom(room, revision),
        `Sala “${room.name}” salva.`,
      ),
    deleteRoom: (room: ExhibitionRoom) =>
      run(
        () => repository.deleteRoom(room.id, revision),
        `Sala “${room.name}” excluída.`,
      ),
    reorderRooms: (ids: string[]) =>
      run(
        () => repository.reorderRooms(ids, revision),
        "Ordem das salas atualizada.",
      ),
    saveExhibition: (exhibition: Exhibition) =>
      run(
        () => repository.saveExhibition(exhibition, revision),
        "Dados da exposição salvos.",
      ),
    publish: () =>
      run(
        () => repository.publish(revision),
        "Exposição no ar. O site mostra as obras publicadas.",
      ),
    archive: () =>
      run(
        () => repository.archive(revision),
        "Exposição fora do ar. Nenhuma obra aparece no site até você colocá-la no ar de novo.",
      ),
  };
}
export type CollectionActions = ReturnType<typeof useCollectionActions>;
