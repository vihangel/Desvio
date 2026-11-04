import type { CollectionSnapshot } from "../../../domain/entities";
import type { ArtistAccount } from "../../../domain/accounts";
import { ItemCard, ListPage, StatusPill } from "../ui";
import Avatar from "./Avatar";
export default function ArtistsList({
  snapshot,
  accounts,
  onOpen,
  onCreate,
}: {
  snapshot: CollectionSnapshot;
  accounts?: ArtistAccount[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <ListPage
      title="Pessoas artistas"
      description="Perfis exibidos na página Artistas. Toque para editar, trocar a foto ou criar o acesso da pessoa às próprias salas."
      action={
        <button type="button" className="primary" onClick={onCreate}>
          + Nova pessoa artista
        </button>
      }
    >
      <ul className="card-list">
        {snapshot.artists.map((artist) => {
          const works = snapshot.records.filter((r) =>
            r.credits.some((c) => c.artistId === artist.id),
          ).length;
          const account = accounts?.find((a) => a.artistId === artist.id);
          return (
            <li key={artist.id}>
              <ItemCard
                thumb={<Avatar artist={artist} />}
                onOpen={() => onOpen(artist.id)}
              >
                <b>{artist.name}</b>
                <small>
                  {[artist.location, `${works} obra(s)`]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
                {account && (
                  <span className="item-pills">
                    <StatusPill
                      tone={account.lastSignInAt ? "published" : "draft"}
                    >
                      {account.lastSignInAt ? "Tem acesso" : "Ainda não entrou"}
                    </StatusPill>
                  </span>
                )}
              </ItemCard>
            </li>
          );
        })}
      </ul>
      {!snapshot.artists.length && (
        <p className="empty-state">Nenhuma pessoa artista cadastrada.</p>
      )}
    </ListPage>
  );
}
