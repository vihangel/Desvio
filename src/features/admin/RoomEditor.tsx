import { useEffect, useState, type ReactNode } from "react";
import type { CollectionSnapshot, ExhibitionRoom } from "../../domain/entities";
import { ROOM_LIMIT } from "../../domain/constants";
import { editableRooms, type Access } from "../../domain/access";
import {
  CheckboxList,
  Field,
  FormPage,
  Section,
  StatusPill,
  useConfirm,
} from "./ui";
export const newRoom = (order: number): ExhibitionRoom => ({
  id: crypto.randomUUID(),
  name: "",
  subtitle: "",
  template: "corridor",
  order,
  wallSlots: 3,
  pedestalSlots: 2,
  artistIds: [],
});
export function RoomsList({
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
    <section className="list-page">
      <div className="list-header">
        <div>
          <h2>{curator ? "Salas" : "Suas salas"}</h2>
          <p className="section-description">
            {curator
              ? "A visita percorre as salas nesta ordem. Toque em uma sala para editar nome, texto, capacidade e artistas."
              : "Toque em uma sala para editar o nome, o texto e quantas obras ela comporta. Mudanças na sala aparecem direto no site."}
          </p>
        </div>
        {curator && (
          <button
            className="primary"
            disabled={busy || rooms.length >= ROOM_LIMIT}
            onClick={onCreate}
          >
            + Nova sala
          </button>
        )}
      </div>
      <ol className="card-list">
        {rooms.map((room, index) => {
          const works = snapshot.placements.filter(
            (p) => p.roomId === room.id,
          ).length;
          return (
            <li key={room.id} className="room-item">
              <button className="item-card" onClick={() => onOpen(room.id)}>
                <span className="item-thumb room-number" aria-hidden="true">
                  {room.order + 1}
                </span>
                <span className="item-text">
                  <b>{room.name}</b>
                  <small>
                    {works} obra(s) · {(room.wallSlots ?? 3) * 2} na parede ·{" "}
                    {room.pedestalSlots ?? 2} objeto(s) 3D
                  </small>
                  {room.subtitle && <small>{room.subtitle}</small>}
                </span>
                <span className="item-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
              {curator && rooms.length > 1 && (
                <span className="reorder">
                  <button
                    aria-label={`Mover ${room.name} para antes`}
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
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
    </section>
  );
}
export default function RoomEditor({
  initial,
  isNew,
  snapshot,
  access,
  busy,
  onSave,
  onDelete,
  onBack,
  onDirty,
}: {
  initial: ExhibitionRoom;
  isNew: boolean;
  snapshot: CollectionSnapshot;
  access: Access;
  busy: boolean;
  onSave: (room: ExhibitionRoom) => Promise<boolean>;
  onDelete: (room: ExhibitionRoom) => void;
  onBack: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [room, setRoom] = useState(initial);
  const confirm = useConfirm();
  const curator = access.kind === "curator";
  const dirty = isNew || JSON.stringify(room) !== JSON.stringify(initial);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const works = snapshot.placements.filter((p) => p.roomId === room.id).length;
  const artistNames = snapshot.artists
    .filter((a) => room.artistIds?.includes(a.id))
    .map((a) => a.name);
  return (
    <FormPage
      title={isNew ? "Nova sala" : initial.name}
      backLabel="Salas"
      onBack={onBack}
      badge={
        dirty && !isNew ? (
          <StatusPill tone="unsaved">Alterações não salvas</StatusPill>
        ) : undefined
      }
      actions={
        <>
          <button
            className="primary"
            disabled={busy || !dirty || !room.name.trim()}
            onClick={() => void onSave(room)}
          >
            {busy ? "Salvando…" : "Salvar"}
          </button>
          {dirty && !isNew && (
            <button
              className="link-button"
              disabled={busy}
              onClick={() => setRoom(initial)}
            >
              Descartar alterações
            </button>
          )}
        </>
      }
    >
      <fieldset className="form-fields" disabled={busy}>
        <Section title="Informações">
          <Field label="Nome da sala">
            <input
              value={room.name}
              required
              onChange={(e) => setRoom({ ...room, name: e.target.value })}
            />
          </Field>
          <Field
            label="Texto curto"
            hint="Aparece no canto da tela durante a visita, abaixo do nome."
          >
            <input
              value={room.subtitle}
              onChange={(e) => setRoom({ ...room, subtitle: e.target.value })}
            />
          </Field>
        </Section>
        <Section
          title="Capacidade"
          description="Cada sala tem duas paredes e um espaço central para objetos 3D."
        >
          <div className="field-row">
            <Field label="Obras por parede" hint="De 1 a 6.">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={6}
                value={room.wallSlots ?? 3}
                onChange={(e) =>
                  setRoom({ ...room, wallSlots: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Objetos 3D" hint="De 0 a 4.">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={4}
                value={room.pedestalSlots ?? 2}
                onChange={(e) =>
                  setRoom({ ...room, pedestalSlots: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          {works > 0 && (
            <small className="field-hint">
              A sala tem {works} obra(s). Para reduzir a capacidade, mova antes
              as obras que ocupam as posições removidas.
            </small>
          )}
        </Section>
        {curator ? (
          <Section title="Pessoas artistas da sala">
            <CheckboxList
              legend="Vincular"
              options={snapshot.artists.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
              value={room.artistIds ?? []}
              onChange={(artistIds) => setRoom({ ...room, artistIds })}
              hint="Pessoas com acesso ao admin podem editar as salas vinculadas a elas. As obras de cada sala são escolhidas na tela da obra."
            />
          </Section>
        ) : (
          artistNames.length > 0 && (
            <Section title="Pessoas artistas da sala">
              <p>{artistNames.join(", ")}</p>
              <small className="field-hint">
                Para mudar quem participa da sala, fale com a curadoria.
              </small>
            </Section>
          )
        )}
        {!isNew && curator && (
          <Section
            title="Excluir sala"
            tone="danger"
            description={
              works
                ? `Mova as ${works} obra(s) desta sala para outra antes de excluir.`
                : snapshot.rooms.length === 1
                  ? "A exposição precisa de pelo menos uma sala."
                  : "Remove a sala da visita. As salas seguintes avançam uma posição."
            }
          >
            <button
              className="danger-outline"
              disabled={!!works || snapshot.rooms.length === 1}
              onClick={async () => {
                if (
                  await confirm({
                    title: `Excluir a sala “${initial.name}”?`,
                    body: "Não dá para desfazer.",
                    confirmLabel: "Excluir sala",
                    tone: "danger",
                  })
                )
                  onDelete(initial);
              }}
            >
              Excluir sala
            </button>
          </Section>
        )}
      </fieldset>
    </FormPage>
  );
}
