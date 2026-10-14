import { useState } from "react";
import type { Artist } from "../../domain/entities";
export default function ArtistEditor({
  artists,
  busy,
  onSave,
}: {
  artists: Artist[];
  busy: boolean;
  onSave: (artist: Artist) => Promise<boolean>;
}) {
  const [artist, setArtist] = useState<Artist>();
  return (
    <section>
      <button
        disabled={busy}
        onClick={() =>
          setArtist({
            id: crypto.randomUUID(),
            name: "",
            location: "",
            bio: "",
            source: "",
          })
        }
      >
        + Pessoa artista
      </button>
      <div className="artist-grid">
        {artists.map((a) => (
          <article key={a.id}>
            <h2>{a.name}</h2>
            <p>{a.bio}</p>
            <button disabled={busy} onClick={() => setArtist(a)}>
              Editar artista
            </button>
          </article>
        ))}
      </div>
      {artist && (
        <fieldset className="editor-panel" disabled={busy}>
          <legend>Cadastro de artista</legend>
          <label>
            Nome
            <input
              value={artist.name}
              onChange={(e) => setArtist({ ...artist, name: e.target.value })}
            />
          </label>
          <label>
            Localização
            <input
              value={artist.location}
              onChange={(e) =>
                setArtist({ ...artist, location: e.target.value })
              }
            />
          </label>
          <label>
            Biografia
            <textarea
              value={artist.bio}
              onChange={(e) => setArtist({ ...artist, bio: e.target.value })}
            />
          </label>
          <label>
            Fonte
            <input
              type="url"
              value={artist.source}
              onChange={(e) => setArtist({ ...artist, source: e.target.value })}
            />
          </label>
          <div className="editor-actions">
            <button
              onClick={() =>
                void onSave(artist).then((ok) => {
                  if (ok) setArtist(undefined);
                })
              }
            >
              Salvar artista
            </button>
            <button onClick={() => setArtist(undefined)}>Cancelar</button>
          </div>
        </fieldset>
      )}
    </section>
  );
}
