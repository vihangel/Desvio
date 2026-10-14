import { swapMountings } from "../../domain/mounting";
import {
  updateRoom,
  removeRoom,
  reflowRooms,
} from "../../domain/roomOperations";
import type { CollectionRepository } from "../../domain/repository";
import type {
  Artist,
  ExhibitionRoom,
  CollectionState,
  Exhibition,
  RecordDraft,
} from "../../domain/entities";
import {
  validateExhibition,
  validateLiveRecord,
  validateRecord,
} from "../../domain/validation";
import {
  asRecordStatus,
  publicEdition,
  withRecordStatuses,
  type RecordStatus,
} from "../../domain/publication";
import { selectRecordDraft } from "../../domain/selectors";
import { createSeed, fromLegacy } from "./seed";
import { legacySchema, stateSchema } from "./schema";
export const COLLECTION_KEY = "desvio:collection:v3";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export class LocalCollectionRepository implements CollectionRepository {
  readonly mode = "demo" as const;
  private state?: CollectionState;
  constructor(private readonly storage: StoragePort) {}
  async load(): Promise<CollectionState> {
    const raw = this.storage.getItem(COLLECTION_KEY);
    if (raw) {
      try {
        const disk = withRecordStatuses(stateSchema.parse(JSON.parse(raw)));
        this.assertIntegrity(disk);
        if (!this.state || disk.revision !== this.state.revision)
          this.state = disk;
      } catch {
        throw new Error(
          "Acervo local inválido. Os dados foram preservados; restaure a demonstração para continuar.",
        );
      }
    } else if (!this.state) {
      const next = createSeed();
      const legacy = this.storage.getItem("desvio:works:v2");
      if (legacy) {
        try {
          next.draft = fromLegacy(legacySchema.parse(JSON.parse(legacy)));
          this.assertIntegrity(next);
        } catch {
          throw new Error(
            "Não foi possível migrar o acervo local. Os dados antigos foram preservados.",
          );
        }
      }
      this.persist(next);
    }
    return structuredClone(this.state!);
  }
  private assertIntegrity(state: CollectionState) {
    stateSchema.parse(state);
    for (const snapshot of [state.draft, state.published]) {
      for (const list of [
        snapshot.artists,
        snapshot.records,
        snapshot.media,
        snapshot.rooms,
        snapshot.placements,
      ]) {
        if (new Set(list.map((x) => x.id)).size !== list.length)
          throw new Error("IDs duplicados.");
      }
      if (
        new Set(snapshot.rooms.map((r) => r.order)).size !==
        snapshot.rooms.length
      )
        throw new Error("Ordem de salas inválida.");
      for (const record of snapshot.records) {
        if (!snapshot.placements.some((p) => p.recordId === record.id))
          throw new Error("Registro sem posicionamento.");
      }
      for (const media of snapshot.media) {
        if (!snapshot.records.some((r) => r.id === media.recordId))
          throw new Error("Mídia sem registro.");
      }
      for (const placement of snapshot.placements) {
        const record = snapshot.records.find(
          (r) => r.id === placement.recordId,
        );
        const media = snapshot.media.find((m) => m.id === placement.mediaId);
        if (!record || !media) throw new Error("Vínculo inválido.");
        validateRecord({ record, media, placement }, snapshot);
      }
      validateExhibition(snapshot);
    }
  }
  private persist(state: CollectionState) {
    // Session GLBs stay in memory. Their object URLs never become durable references.
    const durable = structuredClone(state);
    for (const snapshot of [durable.draft, durable.published]) {
      snapshot.media.forEach((m) => {
        if (m.src?.startsWith("blob:")) delete m.src;
        if (m.narration?.src?.startsWith("blob:")) delete m.narration.src;
      });
    }
    try {
      this.storage.setItem(COLLECTION_KEY, JSON.stringify(durable));
    } catch {
      throw new Error(
        "Não foi possível salvar no navegador. Verifique o espaço disponível ou reduza a imagem.",
      );
    }
    this.state = state;
  }
  private async mutate(
    expected: number,
    update: (next: CollectionState) => void,
  ) {
    await this.load();
    const disk = this.storage.getItem(COLLECTION_KEY);
    if (disk) {
      const current = stateSchema.parse(JSON.parse(disk));
      if (current.revision !== this.state!.revision) this.state = current;
    }
    if (expected !== this.state!.revision)
      throw new Error(
        "O acervo mudou em outra aba. Recarregue antes de salvar.",
      );
    const next = structuredClone(this.state!);
    update(next);
    // The site always reflects the saved works marked as published.
    next.published = publicEdition(next.draft);
    next.revision += 1;
    this.assertIntegrity(next);
    this.persist(next);
    return structuredClone(next);
  }
  saveRecord(draft: RecordDraft, revision: number) {
    return this.mutate(revision, (next) => {
      validateRecord(draft, next.draft);
      const replace = <T extends { id: string }>(items: T[], item: T): T[] =>
        items.some((i) => i.id === item.id)
          ? items.map((i) => (i.id === item.id ? item : i))
          : [...items, item];
      next.draft.records = replace(next.draft.records, {
        ...draft.record,
        status: asRecordStatus(draft.record.status),
      });
      next.draft.media = replace(next.draft.media, draft.media);
      next.draft.placements = replace(next.draft.placements, draft.placement);
      validateLiveRecord(draft, next.draft);
    });
  }
  setRecordStatus(id: string, status: RecordStatus, revision: number) {
    return this.mutate(revision, (next) => {
      const record = next.draft.records.find((r) => r.id === id);
      if (!record) throw new Error("Obra inexistente.");
      record.status = status;
      validateLiveRecord(selectRecordDraft(next.draft, id), next.draft);
    });
  }
  deleteRecord(id: string, revision: number) {
    return this.mutate(revision, (next) => {
      next.draft.records = next.draft.records.filter((r) => r.id !== id);
      next.draft.media = next.draft.media.filter((m) => m.recordId !== id);
      next.draft.placements = next.draft.placements.filter(
        (p) => p.recordId !== id,
      );
    });
  }
  saveExhibition(exhibition: Exhibition, revision: number) {
    return this.mutate(revision, (next) => {
      next.draft.exhibition = {
        ...exhibition,
        status: next.draft.exhibition.status,
      };
      validateExhibition(next.draft);
    });
  }
  swapPlacements(firstId: string, secondId: string, revision: number) {
    return this.mutate(revision, (next) => {
      swapMountings(next.draft, firstId, secondId);
    });
  }
  saveArtist(artist: Artist, revision: number) {
    return this.mutate(revision, (next) => {
      if (!artist.name.trim())
        throw new Error("Informe o nome da pessoa artista.");
      next.draft.artists = next.draft.artists.some((a) => a.id === artist.id)
        ? next.draft.artists.map((a) => (a.id === artist.id ? artist : a))
        : [...next.draft.artists, artist];
    });
  }
  saveRoom(room: ExhibitionRoom, revision: number) {
    return this.mutate(revision, (next) => {
      updateRoom(next.draft, room);
    });
  }
  deleteRoom(id: string, revision: number) {
    return this.mutate(revision, (next) => {
      removeRoom(next.draft, id);
    });
  }
  reorderRooms(ids: string[], revision: number) {
    return this.mutate(revision, (next) => {
      reflowRooms(next.draft, ids);
    });
  }
  publish(revision: number) {
    return this.mutate(revision, (next) => {
      next.draft.exhibition.status = "published";
    });
  }
  archive(revision: number) {
    return this.mutate(revision, (next) => {
      next.draft.exhibition.status = "archived";
    });
  }
  async resetDemo(revision: number) {
    // Also provides explicit recovery for malformed storage, preserving v2 for export.
    if (this.state && revision !== this.state.revision)
      throw new Error("Recarregue o acervo antes de restaurar.");
    const next = createSeed();
    next.revision = revision + 1;
    this.persist(next);
    return structuredClone(next);
  }
}
