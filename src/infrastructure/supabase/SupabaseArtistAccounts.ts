import type {
  ArtistAccount,
  ArtistAccountService,
} from "../../domain/accounts";
import type { RemoteClient } from "./client";
export class SupabaseArtistAccounts implements ArtistAccountService {
  constructor(private readonly client: () => RemoteClient) {}
  async list() {
    const { data, error } = await this.client().rpc(
      "desvio_list_artist_accounts",
    );
    if (error)
      throw new Error(
        error.code === "PGRST202"
          ? "Aplique a migration de contas de artista no Supabase."
          : error.message,
      );
    return (data ?? []) as ArtistAccount[];
  }
  async invite(email: string, artistId: string, redirectTo: string) {
    const { data, error } = await this.client().functions.invoke<{
      invited?: boolean;
      error?: string;
    }>("desvio-invite-artist", { body: { email, artistId, redirectTo } });
    if (error) {
      // The function answers errors as JSON; surface its message.
      const context = (error as { context?: Response }).context;
      const body = await context?.json?.().catch(() => undefined);
      throw new Error(
        body?.error ??
          (/not found|404|Failed to send/i.test(error.message)
            ? "A função de convite não está publicada. Rode: supabase functions deploy desvio-invite-artist"
            : error.message),
      );
    }
    return data?.invited !== false;
  }
  async remove(userId: string) {
    const { error } = await this.client().rpc("desvio_remove_artist_account", {
      account: userId,
    });
    if (error) throw new Error(error.message);
  }
}
