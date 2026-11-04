import type {
  CollectionSnapshot,
  ExhibitionRoom,
  MediaType,
  RecordDraft,
  Vector3,
} from "../../../domain/entities";
import {
  presentationFor,
  roomDepthOffset,
  roomSlots,
  slotSupports,
} from "../../../domain/slots";
import { ROOM_BOUNDS, SCALE_LIMITS } from "../../../domain/constants";
import { NumberField, SelectField } from "../ui";
import OrientationControls, {
  toDegrees,
  toRadians,
} from "./OrientationControls";
import SwapPlacement from "./SwapPlacement";
const slotLabel = (id: string) =>
  id
    .replace(/wall-left-(\d)/, (_, n) => `Parede esquerda · ${Number(n) + 1}`)
    .replace(/wall-right-(\d)/, (_, n) => `Parede direita · ${Number(n) + 1}`)
    .replace("pedestal-front", "Centro · frente")
    .replace("pedestal-back", "Centro · fundo")
    .replace(/pedestal-(\d)/, (_, n) => `Objeto · ${Number(n) + 1}`);
const presentationOptions = [
  { value: "pedestal", label: "Sobre pedestal" },
  { value: "floor", label: "No chão" },
] as const;
export default function PlacementFields({
  draft,
  snapshot,
  rooms,
  onPlace,
  onChange,
  onSwap,
  dirty,
}: {
  draft: RecordDraft;
  snapshot: CollectionSnapshot;
  rooms: ExhibitionRoom[];
  onPlace: (roomId: string, slotId?: string, type?: MediaType) => void;
  onChange: (draft: RecordDraft) => void;
  onSwap?: (id: string) => Promise<void>;
  dirty: boolean;
}) {
  const { record, media, placement } = draft;
  const room =
    snapshot.rooms.find((r) => r.id === placement.roomId) ?? rooms[0];
  const model = media.type === "model";
  const offset = roomDepthOffset(room);
  const changePlacement = (patch: Partial<typeof placement>) =>
    onChange({ ...draft, placement: { ...placement, ...patch } });
  const setAxis = (
    key: "position" | "rotation",
    index: number,
    value: number,
  ) => {
    const vector = [...placement[key]] as Vector3;
    vector[index] = value;
    changePlacement({ [key]: vector });
  };
  const roomIds = new Set(rooms.map((r) => r.id));
  const swapOptions = snapshot.placements.filter(
    (p) =>
      p.recordId !== record.id &&
      roomIds.has(p.roomId) &&
      snapshot.media.find((m) => m.id === p.mediaId)?.type === media.type,
  );
  return (
    <>
      <div className="field-row">
        <SelectField
          label="Sala"
          value={room.id}
          options={rooms.map((r) => ({ value: r.id, label: r.name }))}
          onChange={(roomId) => onPlace(roomId)}
        />
        <SelectField
          label="Posição na sala"
          hint="Posições ocupadas aparecem desativadas."
          value={placement.slotId}
          options={roomSlots(room)
            .filter((s) => slotSupports(s, media.type))
            .map((s) => ({
              value: s.id,
              label: slotLabel(s.id),
              disabled: snapshot.placements.some(
                (p) =>
                  p.recordId !== record.id &&
                  p.roomId === room.id &&
                  p.slotId === s.id,
              ),
            }))}
          onChange={(slotId) => onPlace(room.id, slotId)}
        />
      </div>
      {model && (
        <>
          <SelectField
            label="Apresentação"
            value={
              presentationFor(placement, media.type) as "pedestal" | "floor"
            }
            options={presentationOptions}
            onChange={(presentation) => changePlacement({ presentation })}
          />
          <OrientationControls
            rotation={placement.rotation}
            onChange={(rotation) => changePlacement({ rotation })}
          />
        </>
      )}
      <NumberField
        label="Tamanho"
        value={placement.scale[0]}
        min={SCALE_LIMITS.min}
        max={SCALE_LIMITS.max}
        unit="×"
        hint="1 é o tamanho padrão; 2 dobra, 0,5 reduz pela metade."
        onChange={(value) => changePlacement({ scale: [value, value, value] })}
      />
      <details className="advanced">
        <summary>Ajuste fino da posição</summary>
        <div className="field-row field-row-3">
          <NumberField
            label="Lateral"
            unit="m"
            value={placement.position[0]}
            min={-ROOM_BOUNDS.side}
            max={ROOM_BOUNDS.side}
            hint="Negativo à esquerda, positivo à direita."
            onChange={(v) => setAxis("position", 0, v)}
          />
          <NumberField
            label="Altura"
            unit="m"
            value={placement.position[1]}
            min={ROOM_BOUNDS.minHeight}
            max={ROOM_BOUNDS.maxHeight}
            hint={
              model
                ? "0 apoia no pedestal ou no chão."
                : "Altura do centro do quadro."
            }
            onChange={(v) => setAxis("position", 1, v)}
          />
          <NumberField
            label="Profundidade"
            unit="m"
            value={Math.round((placement.position[2] - offset) * 100) / 100}
            min={-ROOM_BOUNDS.depth}
            max={ROOM_BOUNDS.depth}
            hint="0 é o centro da sala; positivo fica mais perto da entrada."
            onChange={(v) => setAxis("position", 2, v + offset)}
          />
        </div>
        {!model && (
          <div className="field-row field-row-3">
            {["Inclinação X", "Direção Y", "Inclinação Z"].map(
              (label, index) => (
                <NumberField
                  key={label}
                  label={label}
                  unit="°"
                  value={toDegrees(placement.rotation[index])}
                  min={0}
                  max={359}
                  onChange={(v) => setAxis("rotation", index, toRadians(v))}
                />
              ),
            )}
          </div>
        )}
        <button
          type="button"
          className="outline"
          onClick={() => onPlace(room.id, placement.slotId)}
        >
          Voltar à posição sugerida
        </button>
      </details>
      {onSwap && swapOptions.length > 0 && (
        <SwapPlacement
          options={swapOptions}
          snapshot={snapshot}
          dirty={dirty}
          onSwap={onSwap}
        />
      )}
    </>
  );
}
