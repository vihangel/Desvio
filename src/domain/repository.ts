import type {
  CollectionState,
  Exhibition,
  RecordDraft,
  Artist,
  ExhibitionRoom,
} from "./entities";
export interface CollectionRepository {
  importLocalSnapshot?(
    snapshot: import("./entities").CollectionSnapshot,
    revision: number,
  ): Promise<CollectionState>;
  readonly mode?: "demo" | "supabase";
  swapPlacements(
    firstId: string,
    secondId: string,
    revision: number,
  ): Promise<CollectionState>;
  saveArtist(artist: Artist, revision: number): Promise<CollectionState>;
  saveRoom(room: ExhibitionRoom, revision: number): Promise<CollectionState>;
  deleteRoom(id: string, revision: number): Promise<CollectionState>;
  reorderRooms(ids: string[], revision: number): Promise<CollectionState>;
  load(): Promise<CollectionState>;
  saveRecord(
    draft: RecordDraft,
    expectedRevision: number,
  ): Promise<CollectionState>;
  deleteRecord(id: string, expectedRevision: number): Promise<CollectionState>;
  setRecordStatus(
    id: string,
    status: import("./publication").RecordStatus,
    expectedRevision: number,
  ): Promise<CollectionState>;
  saveExhibition(
    exhibition: Exhibition,
    expectedRevision: number,
  ): Promise<CollectionState>;
  // Puts the whole exhibition on air / takes it down. Works go live by status.
  publish(expectedRevision: number): Promise<CollectionState>;
  archive(expectedRevision: number): Promise<CollectionState>;
  resetDemo(expectedRevision: number): Promise<CollectionState>;
}
