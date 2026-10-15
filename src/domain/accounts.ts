// Login accounts linked to artists. Created by curators through an invite.
export interface ArtistAccount {
  userId: string;
  artistId: string;
  email: string;
  confirmed: boolean;
  lastSignInAt: string | null;
}
export interface ArtistAccountService {
  list(): Promise<ArtistAccount[]>;
  // Returns false when the e-mail already had an account and was only linked.
  invite(email: string, artistId: string, redirectTo: string): Promise<boolean>;
  remove(userId: string): Promise<void>;
}
