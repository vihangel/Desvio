import type { CollectionState, Exhibition, RecordDraft } from "./entities";
export interface CollectionRepository {
  load(): Promise<CollectionState>;
  saveRecord(
    draft: RecordDraft,
    expectedRevision: number,
  ): Promise<CollectionState>;
  deleteRecord(id: string, expectedRevision: number): Promise<CollectionState>;
  saveExhibition(
    exhibition: Exhibition,
    expectedRevision: number,
  ): Promise<CollectionState>;
  submitReview(expectedRevision: number): Promise<CollectionState>;
  publish(expectedRevision: number): Promise<CollectionState>;
  archive(expectedRevision: number): Promise<CollectionState>;
  resetDemo(expectedRevision: number): Promise<CollectionState>;
}
