import type { ReactNode } from "react";
import type { CollectionSnapshot } from "../../../domain/entities";
import { ROOM_LIMIT } from "../../../domain/constants";
import { editableRooms, type Access } from "../../../domain/access";
import { ItemCard, ListPage } from "../ui";
export default function RoomsList({
  snapshot,
  access,
  busy,
  onOpen,
  onCreate,
  onOrder,
  children,
}: {
  snapshot: CollectionSnapshot;
  access: Access;
  busy: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onOrder: (ids: string[]) => Promise<boolean>;
  children?: ReactNode;
}) {
  const curator = access.kind === "curator";
  const rooms = [...editableRooms(access, snapshot)].sort(
    (a, b) => a.order - b.order,
  );
  const move = (index: number, delta: number) => {
    const ids = rooms.map((r) => r.id);
    [ids[index + delta], ids[index]] = [ids[index], ids[index + delta]];
    void onOrder(ids);
  };
  return (
    <ListPage
      title={curator ? "Salas" : "Suas salas"}
      description={
        curator
          ? "A visita percorre as salas nesta ordem. Toque em uma sala para editar nome, texto, capacidade e artistas."
          : "Toque em uma sala para editar o nome, o texto e quantas obras ela comporta. Mudanças na sala aparecem direto no site."
      }
      action={
        curator && (
          <button
            type="button"
            className="primary"
            disabled={busy || rooms.length >= ROOM_LIMIT}
            onClick={onCreate}
          >
            + Nova sala
          </button>
        )
      }
    >
      <ol className="card-list">
        {rooms.map((room, index) => {
          const works = snapshot.placements.filter(
            (p) => p.roomId === room.id,
          ).length;
          return (
            <li key={room.id} className="room-item">
              <ItemCard
                thumb={
                  <span className="item-thumb room-number" aria-hidden="true">
                    {room.order + 1}
                  </span>
                }
                onOpen={() => onOpen(room.id)}
              >
                <b>{room.name}</b>
                <small>
                  {works} obra(s) · {(room.wallSlots ?? 3) * 2} na parede ·{" "}
                  {room.pedestalSlots ?? 2} objeto(s) 3D
                </small>
                {room.subtitle && <small>{room.subtitle}</small>}
              </ItemCard>
              {curator && rooms.length > 1 && (
                <span className="reorder">
                  <button
                    type="button"
                    aria-label={`Mover ${room.name} para antes`}
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Mover ${room.name} para depois`}
                    disabled={busy || index === rooms.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {!rooms.length && (
        <p className="empty-state">
          {curator
            ? "Nenhuma sala."
            : "Nenhuma sala está vinculada a você ainda. Peça à curadoria."}
        </p>
      )}
      {children}
    </ListPage>
  );
}
