import { useState } from "react";
import type { CollectionSnapshot, Placement } from "../../../domain/entities";
import { SelectField } from "../ui";
export default function SwapPlacement({
  options,
  snapshot,
  dirty,
  onSwap,
}: {
  options: Placement[];
  snapshot: CollectionSnapshot;
  dirty: boolean;
  onSwap: (id: string) => Promise<void>;
}) {
  const [swapId, setSwapId] = useState("");
  return (
    <div className="swap-box">
      <SelectField
        label="Trocar de lugar com outra obra"
        hint={
          dirty
            ? "Salve esta obra antes de trocar de lugar."
            : "As duas obras trocam de posição na hora."
        }
        disabled={dirty}
        value={swapId}
        options={[
          { value: "", label: "Escolha uma obra" },
          ...options.map((p) => ({
            value: p.recordId,
            label: `${snapshot.records.find((r) => r.id === p.recordId)?.title} · ${snapshot.rooms.find((r) => r.id === p.roomId)?.name}`,
          })),
        ]}
        onChange={setSwapId}
      />
      <button
        type="button"
        className="outline"
        disabled={!swapId || dirty}
        onClick={() => void onSwap(swapId).then(() => setSwapId(""))}
      >
        Trocar de lugar
      </button>
    </div>
  );
}
