import { useState } from "react";
import type {
  CollectionSnapshot,
  ExhibitionRoom,
  RecordDraft,
  Vector3,
} from "../../domain/entities";
import { roomSlots, presentationFor, slotSupports } from "../../domain/slots";
import { Field } from "./ui";
const slotLabel = (id: string) =>
  id
    .replace(/wall-left-(\d)/, (_, n) => `Parede esquerda · ${Number(n) + 1}`)
    .replace(/wall-right-(\d)/, (_, n) => `Parede direita · ${Number(n) + 1}`)
    .replace("pedestal-front", "Centro · frente")
    .replace("pedestal-back", "Centro · fundo")
    .replace(/pedestal-(\d)/, (_, n) => `Objeto · ${Number(n) + 1}`);
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
  const updateVector = (
    key: "position" | "rotation" | "scale",
    index: number,
    value: number,
  ) => {
    const vector = [...placement[key]] as Vector3;
    vector[index] = value;
    onChange({ ...draft, placement: { ...placement, [key]: vector } });
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
      {media.type === "model" && (
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
      )}
      <Field
        label="Tamanho"
        hint="1 é o tamanho padrão; 2 dobra, 0,5 reduz pela metade."
      >
        <input
          type="number"
          inputMode="decimal"
          min={0.1}
          max={4}
          step={0.1}
          value={placement.scale[0]}
          onChange={(e) => {
            const value = Number(e.target.value);
            onChange({
              ...draft,
              placement: { ...placement, scale: [value, value, value] },
            });
          }}
        />
      </Field>
      <details className="advanced">
        <summary>Ajuste fino de posição e rotação</summary>
        <div className="placement-controls">
          <fieldset>
            <legend>Posição (metros)</legend>
            {["X — lateral", "Y — altura", "Z — profundidade"].map(
              (label, index) => (
                <Field key={label} label={label}>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={0.1}
                    value={placement.position[index]}
                    onChange={(e) =>
                      updateVector("position", index, Number(e.target.value))
                    }
                  />
                </Field>
              ),
            )}
          </fieldset>
          <fieldset>
            <legend>Rotação (graus)</legend>
            {["X", "Y", "Z"].map((axis, index) => (
              <Field key={axis} label={axis}>
                <input
                  type="number"
                  inputMode="decimal"
                  step={5}
                  value={Math.round(
                    (placement.rotation[index] * 180) / Math.PI,
                  )}
                  onChange={(e) =>
                    updateVector(
                      "rotation",
                      index,
                      (Number(e.target.value) * Math.PI) / 180,
                    )
                  }
                />
              </Field>
            ))}
          </fieldset>
        </div>
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
