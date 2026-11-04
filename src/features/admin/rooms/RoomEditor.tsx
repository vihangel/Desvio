import type {
  CollectionSnapshot,
  ExhibitionRoom,
} from "../../../domain/entities";
import type { Access } from "../../../domain/access";
import { useFormDraft } from "../useFormDraft";
import {
  CheckboxList,
  FormPage,
  NumberField,
  Section,
  TextField,
  UnsavedPill,
  useConfirm,
} from "../ui";
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
  const {
    value: room,
    setValue: setRoom,
    dirty,
    reset,
  } = useFormDraft(initial, isNew, onDirty);
  const confirm = useConfirm();
  const curator = access.kind === "curator";
  const change = (patch: Partial<ExhibitionRoom>) =>
    setRoom((current) => ({ ...current, ...patch }));
  const works = snapshot.placements.filter((p) => p.roomId === room.id).length;
  const artistNames = snapshot.artists
    .filter((a) => room.artistIds?.includes(a.id))
    .map((a) => a.name);
  return (
    <FormPage
      title={isNew ? "Nova sala" : initial.name}
      backLabel="Salas"
      onBack={onBack}
      badge={dirty && !isNew ? <UnsavedPill /> : undefined}
      busy={busy}
      dirty={dirty}
      canSave={!!room.name.trim()}
      onSave={() => void onSave(room)}
      onDiscard={isNew ? undefined : reset}
    >
      <Section title="Informações">
        <TextField
          label="Nome da sala"
          required
          value={room.name}
          onChange={(name) => change({ name })}
        />
        <TextField
          label="Texto curto"
          hint="Aparece no canto da tela durante a visita, abaixo do nome."
          value={room.subtitle}
          onChange={(subtitle) => change({ subtitle })}
        />
      </Section>
      <Section
        title="Capacidade"
        description="Cada sala tem duas paredes e um espaço central para objetos 3D."
      >
        <div className="field-row">
          <NumberField
            label="Obras por parede"
            hint="De 1 a 6."
            integer
            min={1}
            max={6}
            value={room.wallSlots ?? 3}
            onChange={(wallSlots) => change({ wallSlots })}
          />
          <NumberField
            label="Objetos 3D"
            hint="De 0 a 4."
            integer
            min={0}
            max={4}
            value={room.pedestalSlots ?? 2}
            onChange={(pedestalSlots) => change({ pedestalSlots })}
          />
        </div>
        {works > 0 && (
          <small className="field-hint">
            A sala tem {works} obra(s). Para reduzir a capacidade, mova antes as
            obras que ocupam as posições removidas.
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
            onChange={(artistIds) => change({ artistIds })}
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
            type="button"
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
    </FormPage>
  );
}
