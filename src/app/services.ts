import { stateSchema } from "../infrastructure/serialization/collectionSchema";
import { withRecordStatuses } from "../domain/publication";
import { SupabaseAuthService } from "../infrastructure/supabase/SupabaseAuthService";
import { LocalCollectionRepository } from "../infrastructure/local/LocalCollectionRepository";
import { localMediaService } from "../infrastructure/local/LocalMediaService";
import { createRemoteClient } from "../infrastructure/supabase/client";
import { SupabaseCollectionRepository } from "../infrastructure/supabase/SupabaseCollectionRepository";
import { SupabaseMediaService } from "../infrastructure/supabase/SupabaseMediaService";
import { SupabaseArtistAccounts } from "../infrastructure/supabase/SupabaseArtistAccounts";
const configuredMode = import.meta.env.VITE_DATA_MODE ?? "supabase";
export const dataMode = configuredMode === "demo" ? "demo" : "supabase";
let remoteError = "";
export const remoteClient = (() => {
  if (dataMode !== "supabase") return undefined;
  if (configuredMode !== "supabase") {
    remoteError = "VITE_DATA_MODE deve ser demo ou supabase.";
    return undefined;
  }
  try {
    return createRemoteClient(
      import.meta.env.VITE_SUPABASE_URL ?? "",
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    );
  } catch (error) {
    remoteError =
      error instanceof Error ? error.message : "Configuração inválida.";
    return undefined;
  }
})();
const requireClient = () => {
  if (!remoteClient) throw new Error(remoteError);
  return remoteClient;
};
export const collectionRepository =
  dataMode === "supabase"
    ? new SupabaseCollectionRepository(requireClient)
    : new LocalCollectionRepository({
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
      });
// Same reads as the curator repository; writes go through the artist command.
export const artistRepository =
  dataMode === "supabase"
    ? new SupabaseCollectionRepository(requireClient, "artist")
    : collectionRepository;
export const artistAccounts =
  dataMode === "supabase"
    ? new SupabaseArtistAccounts(requireClient)
    : undefined;
export const mediaService =
  dataMode === "supabase"
    ? new SupabaseMediaService(requireClient)
    : localMediaService;
export async function loadLinsckerPreview(
  snapshot: import("../domain/entities").CollectionSnapshot,
) {
  const { createLinsckerPreview } =
    await import("../infrastructure/local/linsckerPreview");
  return createLinsckerPreview(snapshot);
}

export const authService = remoteClient
  ? new SupabaseAuthService(remoteClient)
  : undefined;

const localDraftKey = "desvio:collection:v3";
export function hasLocalDraft() {
  try {
    return !!window.localStorage.getItem(localDraftKey);
  } catch {
    return false;
  }
}
export async function loadLocalDraftForMigration() {
  const raw = window.localStorage.getItem(localDraftKey);
  if (!raw)
    throw new Error(
      "Não há rascunho local neste navegador. Use o mesmo navegador e endereço onde fez as edições.",
    );
  return withRecordStatuses(stateSchema.parse(JSON.parse(raw))).draft;
}
