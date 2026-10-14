import type { AuthEvent, AuthService } from "../../domain/auth";
import type { RemoteClient } from "./client";
export class SupabaseAuthService implements AuthService {
  constructor(private client: RemoteClient) {}
  async current() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    if (!data.session) return { userId: "", email: "", editor: false };
    const result = await this.client.rpc("desvio_is_editor");
    if (result.error) throw result.error;
    return {
      userId: data.session.user.id,
      email: data.session.user.email ?? "",
      editor: result.data === true,
    };
  }
  subscribe(onChange: (event: AuthEvent) => void) {
    const { data } = this.client.auth.onAuthStateChange((event) => {
      const mapped: AuthEvent =
        event === "PASSWORD_RECOVERY"
          ? "password_recovery"
          : event === "SIGNED_OUT"
            ? "signed_out"
            : event === "SIGNED_IN" || event === "USER_UPDATED"
              ? "signed_in"
              : "refreshed";
      queueMicrotask(() => onChange(mapped));
    });
    return () => data.subscription.unsubscribe();
  }
  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      throw new Error(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
      );
  }
  async requestPasswordReset(email: string, redirectTo: string) {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  }
  async updatePassword(password: string) {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
  }
  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }
}
