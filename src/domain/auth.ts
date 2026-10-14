export interface AuthIdentity {
  userId: string;
  email: string;
  editor: boolean;
}
export type AuthEvent =
  "signed_in" | "signed_out" | "password_recovery" | "refreshed";
export interface AuthService {
  current(): Promise<AuthIdentity>;
  subscribe(onChange: (event: AuthEvent) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  // Sends a link that opens the reset page; accounts are created by the admin.
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}
