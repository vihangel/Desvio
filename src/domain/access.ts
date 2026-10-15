import type { CollectionSnapshot, ExhibitionRoom } from "./entities";
// Who is editing. Curators manage everything; an artist manages only the
// rooms that list them and the works placed in those rooms.
export type Access = { kind: "curator" } | { kind: "artist"; artistId: string };
export const CURATOR: Access = { kind: "curator" };
export const isCurator = (access: Access) => access.kind === "curator";
export function editableRooms(
  access: Access,
  snapshot: CollectionSnapshot,
): ExhibitionRoom[] {
  return access.kind === "curator"
    ? snapshot.rooms
    : snapshot.rooms.filter((r) => r.artistIds?.includes(access.artistId));
}
export function canEditRecord(
  access: Access,
  snapshot: CollectionSnapshot,
  recordId: string,
) {
  if (access.kind === "curator") return true;
  const placement = snapshot.placements.find((p) => p.recordId === recordId);
  return (
    !!placement &&
    editableRooms(access, snapshot).some((r) => r.id === placement.roomId)
  );
}
// Artists may only remove works the public never saw.
export function canDeleteRecord(
  access: Access,
  snapshot: CollectionSnapshot,
  recordId: string,
) {
  if (access.kind === "curator") return true;
  const record = snapshot.records.find((r) => r.id === recordId);
  return (
    !!record &&
    record.status === "draft" &&
    canEditRecord(access, snapshot, recordId)
  );
}
// What an actor works with: curators see everything; artists see their rooms
// and the works placed in them (the server sends artists the same subset).
export function scopedSnapshot(
  access: Access,
  snapshot: CollectionSnapshot,
): CollectionSnapshot {
  if (access.kind === "curator") return snapshot;
  const rooms = editableRooms(access, snapshot);
  const roomIds = new Set(rooms.map((r) => r.id));
  const placements = snapshot.placements.filter((p) => roomIds.has(p.roomId));
  const recordIds = new Set(placements.map((p) => p.recordId));
  return {
    ...snapshot,
    rooms,
    placements,
    records: snapshot.records.filter((r) => recordIds.has(r.id)),
    media: snapshot.media.filter((m) => recordIds.has(m.recordId)),
  };
}
