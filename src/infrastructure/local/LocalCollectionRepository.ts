import type { CollectionRepository } from "../../domain/repository";
import type {
  CollectionState,
  Exhibition,
  RecordDraft,
} from "../../domain/entities";
import {
  validateExhibition,
  validatePublication,
  validateRecord,
} from "../../domain/validation";
import { createSeed, fromLegacy } from "./seed";
import { legacySchema, stateSchema } from "./schema";
export const COLLECTION_KEY = "desvio:collection:v3";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export class LocalCollectionRepository implements CollectionRepository {
  private state?: CollectionState;
  constructor(private readonly storage: StoragePort) {}
  async load(): Promise<CollectionState> {
    const raw = this.storage.getItem(COLLECTION_KEY);
    if (raw) {
      try {
        const disk = stateSchema.parse(JSON.parse(raw));
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
        status: "draft",
      });
      next.draft.media = replace(next.draft.media, draft.media);
      next.draft.placements = replace(next.draft.placements, draft.placement);
      next.draft.exhibition.status = "draft";
    });
  }
  deleteRecord(id: string, revision: number) {
    return this.mutate(revision, (next) => {
      next.draft.records = next.draft.records.filter((r) => r.id !== id);
      next.draft.media = next.draft.media.filter((m) => m.recordId !== id);
      next.draft.placements = next.draft.placements.filter(
        (p) => p.recordId !== id,
      );
      next.draft.exhibition.status = "draft";
    });
  }
  saveExhibition(exhibition: Exhibition, revision: number) {
    return this.mutate(revision, (next) => {
      next.draft.exhibition = { ...exhibition, status: "draft" };
      validateExhibition(next.draft);
    });
  }
  submitReview(revision: number) {
    return this.mutate(revision, (next) => {
      validatePublication(next.draft);
      next.draft.exhibition.status = "in_review";
      next.draft.records.forEach((r) => {
        r.status = "in_review";
      });
    });
  }
  publish(revision: number) {
    return this.mutate(revision, (next) => {
      if (next.draft.exhibition.status !== "in_review")
        throw new Error("Envie a exposição para revisão antes de publicar.");
      validatePublication(next.draft);
      next.draft.exhibition.status = "published";
      next.draft.records.forEach((r) => {
        r.status = "published";
      });
      next.published = structuredClone(next.draft);
    });
  }
  archive(revision: number) {
    return this.mutate(revision, (next) => {
      next.draft.exhibition.status = "archived";
      next.published.exhibition.status = "archived";
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
