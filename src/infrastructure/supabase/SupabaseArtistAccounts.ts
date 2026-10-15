import type {
  AccessCredentials,
  ArtistAccount,
  ArtistAccountService,
} from "../../domain/accounts";
import type { RemoteClient } from "./client";
const FUNCTION = "desvio-invite-artist";
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
  private async call(body: Record<string, unknown>, expectPassword = true) {
    const { data, error } = await this.client().functions.invoke<
      AccessCredentials & { error?: string }
    >(FUNCTION, { body });
    if (error) {
      // The function answers errors as JSON; surface its message.
      const context = (error as { context?: Response }).context;
      const payload = await context
        ?.clone?.()
        .json()
        .catch(() => undefined);
      if (payload?.error) throw new Error(payload.error);
      throw new Error(
        context?.status === 404 || /Failed to send/i.test(error.message)
          ? `A função ${FUNCTION} não está publicada no Supabase.`
          : error.message,
      );
    }
    if (expectPassword && !data?.password)
      throw new Error("A função não devolveu a senha.");
    return { email: data?.email ?? "", password: data?.password ?? "" };
  }
  create(email: string, artistId: string) {
    return this.call({ action: "create", email, artistId });
  }
  resetPassword(userId: string) {
    return this.call({ action: "reset", userId });
  }
  // Removes the login itself, so the e-mail can be given access again later.
  async remove(userId: string) {
    await this.call({ action: "remove", userId }, false);
  }
}
