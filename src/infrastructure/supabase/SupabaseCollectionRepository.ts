import { SupabaseMediaService } from "./SupabaseMediaService";
import { youtubeId } from "../../domain/youtube";
import type { CollectionRepository } from "../../domain/repository";
import type {
  Artist,
  CollectionSnapshot,
  CollectionState,
  Exhibition,
  ExhibitionRoom,
  RecordDraft,
} from "../../domain/entities";
import { stateSchema } from "../serialization/collectionSchema";
import { validateLiveRecord, validateRecord } from "../../domain/validation";
import type { RecordStatus } from "../../domain/publication";
import type { RemoteClient } from "./client";
export class SupabaseCollectionRepository implements CollectionRepository {
  readonly mode = "supabase" as const;
  constructor(private readonly client: () => RemoteClient) {}
  private async hydrate(raw: unknown): Promise<CollectionState> {
    const state = stateSchema.parse(raw);
    for (const snapshot of [state.draft, state.published]) {
      await Promise.all(
        snapshot.media.map(async (media) => {
          if (media.narration?.path && media.narration.bucket) {
            const result = await this.client()
              .storage.from(media.narration.bucket)
              .createSignedUrl(media.narration.path, 3600);
            if (result.error) throw new Error(result.error.message);
            media.narration.src = result.data.signedUrl;
          }
          if (!media.path || !media.bucket) return;
          const { data, error } = await this.client()
            .storage.from(media.bucket)
            .createSignedUrl(media.path, 3600);
          if (error) throw new Error(`Falha ao obter mídia: ${error.message}`);
          media.src = data.signedUrl;
        }),
      );
    }
    return state;
  }
  async load() {
    const { data, error } = await this.client().rpc("desvio_load_collection");
    if (error) throw new Error(`Falha ao carregar Supabase: ${error.message}`);
    return this.hydrate(data);
  }
  private async command(operation: string, payload: unknown, revision: number) {
    const { data, error } = await this.client().rpc("desvio_edit_collection", {
      operation,
      payload,
      expected_revision: revision,
    });
    if (error) throw new Error(error.message);
    return this.hydrate(data);
  }
  async saveRecord(draft: RecordDraft, revision: number) {
    const state = await this.load();
    validateRecord(draft, state.draft);
    validateLiveRecord(draft, state.draft);
    const durable = structuredClone(draft);
    if (durable.media.type === "video")
      durable.media.src = `https://www.youtube.com/watch?v=${youtubeId(durable.media.src ?? "")}`;
    if (durable.media.path) delete durable.media.src;
    if (durable.media.narration?.path) delete durable.media.narration.src;
    if (
      durable.media.narration?.src?.startsWith("blob:") ||
      durable.media.narration?.src?.startsWith("data:")
    )
      throw new Error("Envie o áudio ao Storage antes de salvar.");
    if (
      durable.media.src?.startsWith("blob:") ||
      durable.media.src?.startsWith("data:")
    )
      throw new Error("Envie o arquivo ao Storage antes de salvar.");
    return this.command("save_record", durable, revision);
  }
  swapPlacements(firstId: string, secondId: string, revision: number) {
    return this.command("swap_placements", { firstId, secondId }, revision);
  }
  setRecordStatus(id: string, status: RecordStatus, revision: number) {
    return this.command("set_record_status", { id, status }, revision);
  }
  deleteRecord(id: string, revision: number) {
    return this.command("delete_record", { id }, revision);
  }
  saveExhibition(exhibition: Exhibition, revision: number) {
    return this.command("save_exhibition", exhibition, revision);
  }
  saveArtist(artist: Artist, revision: number) {
    return this.command("save_artist", artist, revision);
  }
  saveRoom(room: ExhibitionRoom, revision: number) {
    return this.command("save_room", room, revision);
  }
  deleteRoom(id: string, revision: number) {
    return this.command("delete_room", { id }, revision);
  }
  reorderRooms(ids: string[], revision: number) {
    return this.command("reorder_rooms", { ids }, revision);
  }
  publish(revision: number) {
    return this.command("publish", {}, revision);
  }
  archive(revision: number) {
    return this.command("archive", {}, revision);
  }
  resetDemo(_revision: number): Promise<CollectionState> {
    return Promise.reject(
      new Error("O acervo remoto não pode ser restaurado como demonstração."),
    );
  }
  async importLocalSnapshot(snapshot: CollectionSnapshot, revision: number) {
    const durable = structuredClone(snapshot);
    for (const media of durable.media) {
      if (media.path) delete media.src;
      if (media.narration?.path) delete media.narration.src;
      if (media.type === "video")
        media.src = `https://www.youtube.com/watch?v=${youtubeId(media.src ?? "")}`;
      if (media.src?.startsWith("data:image/") && media.type === "image") {
        const blob = await (await fetch(media.src)).blob();
        const uploaded = await new SupabaseMediaService(this.client).prepare(
          {
            name: "imported-image",
            type: blob.type,
            size: blob.size,
            arrayBuffer: () => blob.arrayBuffer(),
          },
          "image",
        );
        Object.assign(media, uploaded);
        delete media.src;
      }
      if (media.src?.startsWith("blob:")) delete media.src;
      if (media.narration?.src?.startsWith("blob:")) delete media.narration.src;
      if (media.narration && !media.narration.src && !media.narration.path)
        delete media.narration;
    }
    const { data, error } = await this.client().rpc(
      "desvio_replace_draft_from_local",
      {
        snapshot: durable,
        expected_revision: revision,
      },
    );
    if (error)
      throw new Error(
        error.code === "PGRST202"
          ? "Aplique a migration desvio_replace_draft_from_local no Supabase antes de importar."
          : error.message,
      );
    return this.hydrate(data);
  }
  initialize(snapshot: CollectionSnapshot, revision: number) {
    return this.command("initialize", snapshot, revision);
  }
}
