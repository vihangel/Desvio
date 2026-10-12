import type { Artwork, CollectionSnapshot, RecordDraft } from "./entities";
export function selectArtworks(snapshot: CollectionSnapshot): Artwork[] {
  return snapshot.placements.flatMap((placement) => {
    const record = snapshot.records.find((r) => r.id === placement.recordId);
    const media = snapshot.media.find((m) => m.id === placement.mediaId);
    const room = snapshot.rooms.find((r) => r.id === placement.roomId);
    if (!record || !media || !room || record.status === "archived") return [];
    const names = record.credits
      .map((c) => snapshot.artists.find((a) => a.id === c.artistId)?.name)
      .filter(Boolean);
    return [
      {
        ...record,
        author: [...names, record.creditNote].filter(Boolean).join(" e "),
        artistIds: record.credits.map((c) => c.artistId),
        room: room.order,
        roomId: room.id,
        type: media.type,
        image: media.type === "image" ? media.src : undefined,
        modelUrl: media.type === "model" ? media.src : undefined,
        rights: media.rights,
        attribution: media.attribution,
        alt: media.alt,
        placement,
      },
    ];
  });
}
export function selectRecordDraft(
  snapshot: CollectionSnapshot,
  id: string,
): RecordDraft {
  const record = snapshot.records.find((r) => r.id === id);
  const media = snapshot.media.find((m) => m.recordId === id);
  const placement = snapshot.placements.find((p) => p.recordId === id);
  if (!record || !media || !placement) throw new Error("Registro incompleto.");
  return structuredClone({ record, media, placement });
}
