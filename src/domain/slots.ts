import type { ExhibitionRoom, MediaAsset, Placement } from "./entities";
export interface Slot {
  id: string;
  type: MediaAsset["type"];
  position: Placement["position"];
  rotation: Placement["rotation"];
}
export function roomSlots(room: ExhibitionRoom): Slot[] {
  const z = -room.order * 12;
  return [
    ...[3.2, 0, -3.2].flatMap((offset, i): Slot[] => [
      {
        id: `wall-left-${i}`,
        type: "image",
        position: [-4.71, 2, z + offset],
        rotation: [0, Math.PI / 2, 0],
      },
      {
        id: `wall-right-${i}`,
        type: "image",
        position: [4.71, 2, z + offset],
        rotation: [0, -Math.PI / 2, 0],
      },
    ]),
    {
      id: "pedestal-front",
      type: "model",
      position: [0, 0, z + 1.8],
      rotation: [0, 0, 0],
    },
    {
      id: "pedestal-back",
      type: "model",
      position: [0, 0, z - 2.2],
      rotation: [0, 0, 0],
    },
  ];
}
