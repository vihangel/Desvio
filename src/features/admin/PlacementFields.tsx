import { useState } from "react";
import type {
  CollectionSnapshot,
  RecordDraft,
  Vector3,
} from "../../domain/entities";
import { roomSlots, presentationFor, slotSupports } from "../../domain/slots";
export default function PlacementFields({
  draft,
  snapshot,
  onPlace,
  onChange,
  onSwap,
}: {
  onSwap?: (id: string) => Promise<void>;
  draft: RecordDraft;
  snapshot: CollectionSnapshot;
  onPlace: (
    roomId: string,
    slotId?: string,
    type?: "image" | "model" | "video",
  ) => void;
  onChange: (draft: RecordDraft) => void;
}) {
  const [swapId, setSwapId] = useState("");
  const { record, media, placement } = draft;
  const room = snapshot.rooms.find((r) => r.id === placement.roomId)!;
  const updateVector = (
    key: "position" | "rotation" | "scale",
    index: number,
    value: number,
  ) => {
    const vector = [...placement[key]] as Vector3;
    vector[index] = value;
    onChange({ ...draft, placement: { ...placement, [key]: vector } });
  };
  return (
    <>
      <h3>Montagem</h3>
      <div className="editor-two">
        <label>
          Sala
          <select value={room.id} onChange={(e) => onPlace(e.target.value)}>
            {snapshot.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Posição na sala
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
                  {s.id
                    .replace("wall-left-", "Parede esquerda · ")
                    .replace("wall-right-", "Parede direita · ")
                    .replace("pedestal-front", "Centro · frente")
                    .replace("pedestal-back", "Centro · fundo")
                    .replace("pedestal-", "Objeto · ")}
                </option>
              ))}
          </select>
        </label>
      </div>
      <label>
        Apresentação
        <select
          value={presentationFor(placement, media.type)}
          onChange={(e) =>
            onChange({
              ...draft,
              placement: {
                ...placement,
                presentation: e.target.value as "frame" | "pedestal" | "floor",
              },
            })
          }
        >
          {media.type !== "model" ? (
            <option value="frame">Quadro / tela na parede</option>
          ) : (
            <>
              <option value="pedestal">Objeto 3D sobre pedestal</option>
              <option value="floor">Objeto 3D no chão</option>
            </>
          )}
        </select>
      </label>
      <div className="placement-controls">
        <fieldset>
          <legend>Posição (metros)</legend>
          {["X — lateral", "Y — altura", "Z — profundidade"].map(
            (label, index) => (
              <label key={label}>
                {label}
                <input
                  type="number"
                  step={0.1}
                  value={placement.position[index]}
                  onChange={(e) =>
                    updateVector("position", index, Number(e.target.value))
                  }
                />
              </label>
            ),
          )}
        </fieldset>
        <fieldset>
          <legend>Rotação (graus)</legend>
          {["X", "Y", "Z"].map((axis, index) => (
            <label key={axis}>
              {axis}
              <input
                type="number"
                step={5}
                value={Math.round((placement.rotation[index] * 180) / Math.PI)}
                onChange={(e) =>
                  updateVector(
                    "rotation",
                    index,
                    (Number(e.target.value) * Math.PI) / 180,
                  )
                }
              />
            </label>
          ))}
        </fieldset>
      </div>
      <label>
        Tamanho proporcional
        <input
          type="number"
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
      </label>
      <button
        className="outline"
        onClick={() => onPlace(room.id, placement.slotId)}
      >
        Restaurar posição sugerida
      </button>
      {onSwap && (
        <>
          <label>
            Trocar posição com outra obra
            <select value={swapId} onChange={(e) => setSwapId(e.target.value)}>
              <option value="">Selecione uma obra</option>
              {snapshot.placements
                .filter(
                  (p) =>
                    p.recordId !== record.id &&
                    snapshot.media.find((m) => m.id === p.mediaId)?.type ===
                      media.type,
                )
                .map((p) => (
                  <option key={p.id} value={p.recordId}>
                    {snapshot.records.find((r) => r.id === p.recordId)?.title} ·{" "}
                    {snapshot.rooms.find((r) => r.id === p.roomId)?.name}
                  </option>
                ))}
            </select>
          </label>
          <button disabled={!swapId} onClick={() => void onSwap(swapId)}>
            Trocar posições salvas
          </button>
          <small>
            A troca usa a montagem salva das duas obras. Salve antes os ajustes
            desta ficha.
          </small>
        </>
      )}
      <small>
        Use a prévia 3D do rascunho após salvar para conferir distâncias e
        enquadramento.
      </small>
    </>
  );
}
