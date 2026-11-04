import { useMemo } from "react";
import type { Artist } from "../../../domain/entities";
import ArtistEditor from "../artists/ArtistEditor";
import ArtistsList from "../artists/ArtistsList";
import { NotFound } from "../ui";
import type { ArtistAccounts } from "../useArtistAccounts";
import type { AdminContext } from "./types";
const newArtist = (): Artist => ({
  id: crypto.randomUUID(),
  name: "",
  location: "",
  bio: "",
  source: "",
});
export function ArtistsListScreen({
  admin,
  accounts,
}: {
  admin: AdminContext;
  accounts: ArtistAccounts;
}) {
  return (
    <ArtistsList
      snapshot={admin.state.draft}
      accounts={accounts.accounts}
      onOpen={(id) => admin.open("artists", id)}
      onCreate={() => admin.open("artists", "nova")}
    />
  );
}
export function ArtistScreen({
  admin,
  accounts,
  id,
}: {
  admin: AdminContext;
  accounts: ArtistAccounts;
  id: string;
}) {
  const { state, remote, editor, setDirty, open, toList } = admin;
  const isNew = id === "nova";
  const draftArtist = useMemo(newArtist, [id]);
  const initial = isNew
    ? draftArtist
    : state.draft.artists.find((a) => a.id === id);
  if (!initial)
    return (
      <NotFound
        text="Pessoa artista não encontrada."
        onBack={() => toList("artists")}
      />
    );
  return (
    <ArtistEditor
      key={`${initial.id}:${state.revision}`}
      initial={initial}
      isNew={isNew}
      snapshot={state.draft}
      busy={editor.busy}
      remote={remote}
      accounts={accounts}
      onDirty={setDirty}
      onBack={() => open("artists")}
      onUploadPhoto={editor.uploadPhoto}
      onOpenRooms={() => open("rooms")}
      onSave={async (artist) => {
        const ok = await editor.saveArtist(artist);
        if (ok && isNew) {
          await admin.replaceWithSaved("artists", artist.id);
          if (accounts.available)
            editor.notify(
              `Perfil de ${artist.name} salvo. Para dar acesso ao admin, use “Acesso da pessoa artista” nesta tela.`,
              "success",
            );
        }
        return ok;
      }}
      onDelete={async (artist) => {
        if (await editor.deleteArtist(artist)) {
          toList("artists");
          void accounts.reload();
        }
      }}
    />
  );
}
