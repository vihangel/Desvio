// Login accounts linked to artists. Curators create them and pass the
// generated password on themselves; no e-mail is sent.
export interface ArtistAccount {
  userId: string;
  artistId: string;
  email: string;
  confirmed: boolean;
  lastSignInAt: string | null;
}
// Shown once to the curator; never stored by the app.
export interface AccessCredentials {
  email: string;
  password: string;
}
export interface ArtistAccountService {
  list(): Promise<ArtistAccount[]>;
  create(email: string, artistId: string): Promise<AccessCredentials>;
  resetPassword(userId: string): Promise<AccessCredentials>;
  remove(userId: string): Promise<void>;
}
