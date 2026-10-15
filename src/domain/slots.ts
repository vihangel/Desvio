import type { ExhibitionRoom, MediaAsset, Placement } from "./entities";
import { ROOM_DEPTH } from "./constants";
export interface Slot {
  id: string;
  type: MediaAsset["type"];
  position: Placement["position"];
  rotation: Placement["rotation"];
}
export function roomSlots(room: ExhibitionRoom): Slot[] {
  const z = -room.order * ROOM_DEPTH;
  const count = room.wallSlots ?? 3;
  const slots: Slot[] = Array.from({ length: count }, (_, i) => {
    const offset = count === 1 ? 0 : 3.2 - (6.4 * i) / (count - 1);
    return [
      {
        id: `wall-left-${i}`,
        type: "image" as const,
        position: [-4.71, 2, z + offset] as Placement["position"],
        rotation: [0, Math.PI / 2, 0] as Placement["rotation"],
      },
      {
        id: `wall-right-${i}`,
        type: "image" as const,
        position: [4.71, 2, z + offset] as Placement["position"],
        rotation: [0, -Math.PI / 2, 0] as Placement["rotation"],
      },
    ];
  }).flat();
  const pedestals = room.pedestalSlots ?? 2;
  for (let i = 0; i < pedestals; i++) {
    slots.push({
      id:
        i === 0
          ? "pedestal-front"
          : i === 1
            ? "pedestal-back"
            : `pedestal-${i}`,
      type: "model",
      position: [
        i < 2 ? 0 : i === 2 ? -2.5 : 2.5,
        0,
        z + (i === 0 ? 1.8 : -2.2),
      ],
      rotation: [0, 0, 0],
    });
  }
  return slots;
}
export function slotSupports(slot: Slot, type: MediaAsset["type"]) {
  return slot.type === (type === "video" ? "image" : type);
}
export function presentationFor(
  placement: Placement,
  type: MediaAsset["type"],
) {
  return placement.presentation ?? (type !== "model" ? "frame" : "pedestal");
}
// Placements store world coordinates; people edit depth relative to the room.
export const roomDepthOffset = (room: ExhibitionRoom) =>
  -room.order * ROOM_DEPTH;
