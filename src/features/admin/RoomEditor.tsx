import { useState } from "react";
import type { CollectionSnapshot, ExhibitionRoom } from "../../domain/entities";
import { ROOM_LIMIT } from "../../domain/constants";
export default function RoomEditor({
  snapshot,
  busy,
  onSave,
  onDelete,
  onOrder,
}: {
  snapshot: CollectionSnapshot;
  busy: boolean;
  onSave: (room: ExhibitionRoom) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onOrder: (ids: string[]) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<ExhibitionRoom>();
  const rooms = [...snapshot.rooms].sort((a, b) => a.order - b.order);
  return (
    <section className="room-admin">
      <div className="admin-heading">
        <h2>Salas e montagem</h2>
        <button
          disabled={busy || rooms.length >= ROOM_LIMIT}
          onClick={() =>
            setEditing({
              id: crypto.randomUUID(),
              name: "Nova sala",
              subtitle: "",
              template: "corridor",
              order: rooms.length,
              wallSlots: 3,
              pedestalSlots: 2,
              artistIds: [],
            })
          }
        >
          + Sala
        </button>
      </div>
      <p>
        Organize por artista ou tema. Cada sala tem posições de parede e
        posições para objetos 3D. Mova suas obras antes de reduzir a capacidade
        ou excluir.
      </p>
      {rooms.map((room, index) => (
        <article key={room.id}>
          <b>
            {index + 1} · {room.name}
          </b>
          <span>
            {snapshot.placements.filter((p) => p.roomId === room.id).length}{" "}
            obras · {(room.wallSlots ?? 3) * 2} quadros ·{" "}
            {room.pedestalSlots ?? 2} objetos 3D
          </span>
          <div className="editor-actions">
            <button disabled={busy} onClick={() => setEditing(room)}>
              Editar sala
            </button>
            <button
              aria-label={`Mover ${room.name} para cima`}
              disabled={busy || index === 0}
              onClick={() => {
                const ids = rooms.map((r) => r.id);
                [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                void onOrder(ids);
              }}
            >
              ↑
            </button>
            <button
              aria-label={`Mover ${room.name} para baixo`}
              disabled={busy || index === rooms.length - 1}
              onClick={() => {
                const ids = rooms.map((r) => r.id);
                [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
                void onOrder(ids);
              }}
            >
              ↓
            </button>
            <button
              disabled={
                busy ||
                rooms.length === 1 ||
                snapshot.placements.some((p) => p.roomId === room.id)
              }
              onClick={() => void onDelete(room.id)}
            >
              Excluir sala vazia
            </button>
          </div>
        </article>
      ))}
      {editing && (
        <fieldset disabled={busy}>
          <legend>Configurar sala</legend>
          <label>
            Nome
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
          <label>
            Descrição curta
            <input
              value={editing.subtitle}
              onChange={(e) =>
                setEditing({ ...editing, subtitle: e.target.value })
              }
            />
          </label>
          <div className="editor-two">
            <label>
              Quadros por parede
              <input
                type="number"
                min={1}
                max={6}
                value={editing.wallSlots ?? 3}
                onChange={(e) =>
                  setEditing({ ...editing, wallSlots: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Posições para objetos 3D
              <input
                type="number"
                min={0}
                max={4}
                value={editing.pedestalSlots ?? 2}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    pedestalSlots: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <label>
            Conjunto de artistas
            <select
              multiple
              value={editing.artistIds ?? []}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  artistIds: Array.from(e.target.selectedOptions).map(
                    (o) => o.value,
                  ),
                })
              }
            >
              {snapshot.artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <small>
            O conjunto ajuda a organizar a sala; a escolha das obras continua
            livre no cadastro de cada obra.
          </small>
          <div className="editor-actions">
            <button
              onClick={() =>
                void onSave(editing).then((ok) => {
                  if (ok) setEditing(undefined);
                })
              }
            >
              Salvar sala
            </button>
            <button onClick={() => setEditing(undefined)}>Cancelar</button>
          </div>
        </fieldset>
      )}
    </section>
  );
}
