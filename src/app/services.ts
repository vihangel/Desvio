import { LocalCollectionRepository } from "../infrastructure/local/LocalCollectionRepository";
// Composition root: features only receive the repository interface.
export const collectionRepository = new LocalCollectionRepository({
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
});

export { localMediaService as mediaService } from "../infrastructure/local/LocalMediaService";

export async function loadLinsckerPreview(
  snapshot: import("../domain/entities").CollectionSnapshot,
) {
  if (import.meta.env.DEV) {
    const { createLinsckerPreview } =
      await import("../infrastructure/local/linsckerPreview");
    return createLinsckerPreview(snapshot);
  }
  throw new Error("Prévia disponível somente no ambiente local.");
}
