import type { CollectionSnapshot, ExhibitionRoom } from "./entities";
import { roomSlots } from "./slots";
export function reflowRooms(snapshot: CollectionSnapshot, ids: string[]) {
  if (
    ids.length !== snapshot.rooms.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !snapshot.rooms.some((r) => r.id === id))
  )
    throw new Error("Ordem de salas inválida.");
  const before = new Map(snapshot.rooms.map((r) => [r.id, r.order]));
  snapshot.rooms = ids.map((id, order) => ({
    ...snapshot.rooms.find((r) => r.id === id)!,
    order,
  }));
  snapshot.placements.forEach((p) => {
    const order = snapshot.rooms.find((r) => r.id === p.roomId)!.order;
    p.position = [
      p.position[0],
      p.position[1],
      p.position[2] + (before.get(p.roomId)! - order) * 12,
    ];
  });
}
export function updateRoom(snapshot: CollectionSnapshot, room: ExhibitionRoom) {
  if (!room.name.trim()) throw new Error("Informe o nome da sala.");
  const current = snapshot.rooms.find((r) => r.id === room.id);
  const next = { ...room, order: current?.order ?? snapshot.rooms.length };
  const slots = roomSlots(next);
  if (
    snapshot.placements.some(
      (p) => p.roomId === room.id && !slots.some((s) => s.id === p.slotId),
    )
  )
    throw new Error("Mova as obras antes de reduzir a capacidade da sala.");
  if (current)
    snapshot.rooms = snapshot.rooms.map((r) => (r.id === room.id ? next : r));
  else snapshot.rooms.push(next);
}
export function removeRoom(snapshot: CollectionSnapshot, id: string) {
  if (snapshot.rooms.length === 1)
    throw new Error("Mantenha ao menos uma sala.");
  if (snapshot.placements.some((p) => p.roomId === id))
    throw new Error("Mova as obras antes de excluir a sala.");
  const ids = snapshot.rooms
    .filter((r) => r.id !== id)
    .sort((a, b) => a.order - b.order)
    .map((r) => r.id);
  // Shift rooms and their placements before removing the empty room.
  reflowRooms(snapshot, [...ids, id]);
  snapshot.rooms = snapshot.rooms.filter((r) => r.id !== id);
}
