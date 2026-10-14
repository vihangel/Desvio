import { createClient } from "@supabase/supabase-js";
export function createRemoteClient(url: string, key: string) {
  if (!url || !key)
    throw new Error(
      "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  if (
    !url.startsWith("https://") &&
    !url.startsWith("http://127.0.0.1") &&
    !url.startsWith("http://localhost")
  )
    throw new Error("URL do Supabase inválida.");
  if (key.startsWith("sb_secret_"))
    throw new Error("Use somente a chave pública do Supabase.");
  if (key.startsWith("eyJ")) {
    try {
      if (JSON.parse(atob(key.split(".")[1])).role !== "anon")
        throw new Error("Use somente a chave pública do Supabase.");
    } catch {
      throw new Error("Chave pública do Supabase inválida.");
    }
  }
  return createClient(url, key);
}
export type RemoteClient = ReturnType<typeof createRemoteClient>;
