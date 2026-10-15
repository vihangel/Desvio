import { useState } from "react";
import type {
  CollectionSnapshot,
  ExhibitionRoom,
  RecordDraft,
  Vector3,
} from "../../domain/entities";
import {
  presentationFor,
  roomDepthOffset,
  roomSlots,
  slotSupports,
} from "../../domain/slots";
import { ROOM_BOUNDS, SCALE_LIMITS } from "../../domain/constants";
import { Field, NumberField } from "./ui";
const slotLabel = (id: string) =>
  id
    .replace(/wall-left-(\d)/, (_, n) => `Parede esquerda · ${Number(n) + 1}`)
    .replace(/wall-right-(\d)/, (_, n) => `Parede direita · ${Number(n) + 1}`)
    .replace("pedestal-front", "Centro · frente")
    .replace("pedestal-back", "Centro · fundo")
    .replace(/pedestal-(\d)/, (_, n) => `Objeto · ${Number(n) + 1}`);
const toDegrees = (rad: number) =>
  ((Math.round((rad * 180) / Math.PI) % 360) + 360) % 360;
const toRadians = (deg: number) =>
  (((deg % 360) + 360) % 360) * (Math.PI / 180);
const axes = [
  { index: 0, label: "Deitar / levantar", step: 90 },
  { index: 1, label: "Girar", step: 45 },
  { index: 2, label: "Tombar de lado", step: 90 },
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
  onPlace: (
    roomId: string,
    slotId?: string,
    type?: "image" | "model" | "video",
  ) => void;
  onChange: (draft: RecordDraft) => void;
  onSwap?: (id: string) => Promise<void>;
  dirty: boolean;
}) {
  const [swapId, setSwapId] = useState("");
  const { record, media, placement } = draft;
  const room =
    snapshot.rooms.find((r) => r.id === placement.roomId) ?? rooms[0];
  const model = media.type === "model";
  const offset = roomDepthOffset(room);
  const setVector = (key: "position" | "rotation", vector: Vector3) =>
    onChange({ ...draft, placement: { ...placement, [key]: vector } });
  const setAxis = (
    key: "position" | "rotation",
    index: number,
    value: number,
  ) => {
    const vector = [...placement[key]] as Vector3;
    vector[index] = value;
    setVector(key, vector);
  };
  const turn = (index: number, degrees: number) =>
    setAxis(
      "rotation",
      index,
      toRadians(toDegrees(placement.rotation[index]) + degrees),
    );
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
        <Field label="Sala">
          <select value={room.id} onChange={(e) => onPlace(e.target.value)}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Posição na sala"
          hint="Posições ocupadas aparecem desativadas."
        >
          <select
            value={placement.slotId}
            onChange={(e) => onPlace(room.id, e.target.value)}
          >
            {roomSlots(room)
              .filter((s) => slotSupports(s, media.type))
              .map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  disabled={snapshot.placements.some(
                    (p) =>
                      p.recordId !== record.id &&
                      p.roomId === room.id &&
                      p.slotId === s.id,
                  )}
                >
                  {slotLabel(s.id)}
                </option>
              ))}
          </select>
        </Field>
      </div>
      {model && (
        <>
          <Field label="Apresentação">
            <select
              value={presentationFor(placement, media.type)}
              onChange={(e) =>
                onChange({
                  ...draft,
                  placement: {
                    ...placement,
                    presentation: e.target.value as "pedestal" | "floor",
                  },
                })
              }
            >
              <option value="pedestal">Sobre pedestal</option>
              <option value="floor">No chão</option>
            </select>
          </Field>
          <div className="orientation">
            <span className="field-label">Orientação do objeto</span>
            <small className="field-hint">
              Arquivos STL e OBJ às vezes chegam deitados: use “Deitar /
              levantar” até o objeto ficar em pé. Ele continua apoiado no
              pedestal.
            </small>
            {axes.map((axis) => (
              <div key={axis.index} className="orientation-row">
                <span>{axis.label}</span>
                <button
                  className="outline"
                  aria-label={`${axis.label} −${axis.step}°`}
                  onClick={() => turn(axis.index, -axis.step)}
                >
                  ↺ {axis.step}°
                </button>
                <output>{toDegrees(placement.rotation[axis.index])}°</output>
                <button
                  className="outline"
                  aria-label={`${axis.label} +${axis.step}°`}
                  onClick={() => turn(axis.index, axis.step)}
                >
                  ↻ {axis.step}°
                </button>
              </div>
            ))}
            <button
              className="link-button"
              onClick={() => setVector("rotation", [0, 0, 0])}
            >
              Voltar à orientação original
            </button>
          </div>
        </>
      )}
      <NumberField
        label="Tamanho"
        value={placement.scale[0]}
        min={SCALE_LIMITS.min}
        max={SCALE_LIMITS.max}
        unit="×"
        hint="1 é o tamanho padrão; 2 dobra, 0,5 reduz pela metade."
        onChange={(value) =>
          onChange({
            ...draft,
            placement: { ...placement, scale: [value, value, value] },
          })
        }
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
          className="outline"
          onClick={() => onPlace(room.id, placement.slotId)}
        >
          Voltar à posição sugerida
        </button>
      </details>
      {onSwap && swapOptions.length > 0 && (
        <div className="swap-box">
          <Field
            label="Trocar de lugar com outra obra"
            hint={
              dirty
                ? "Salve esta obra antes de trocar de lugar."
                : "As duas obras trocam de posição na hora."
            }
          >
            <select
              value={swapId}
              disabled={dirty}
              onChange={(e) => setSwapId(e.target.value)}
            >
              <option value="">Escolha uma obra</option>
              {swapOptions.map((p) => (
                <option key={p.id} value={p.recordId}>
                  {snapshot.records.find((r) => r.id === p.recordId)?.title} ·{" "}
                  {snapshot.rooms.find((r) => r.id === p.roomId)?.name}
                </option>
              ))}
            </select>
          </Field>
          <button
            className="outline"
            disabled={!swapId || dirty}
            onClick={() => void onSwap(swapId).then(() => setSwapId(""))}
          >
            Trocar de lugar
          </button>
        </div>
      )}
    </>
  );
}
