import type { CollectionSnapshot, RecordDraft, MediaAsset } from "./entities";
import { roomSlots, slotSupports } from "./slots";
export function newRecordDraft(snapshot: CollectionSnapshot): RecordDraft {
  const available = snapshot.rooms.flatMap((room) =>
    roomSlots(room)
      .filter(
        (slot) =>
          !snapshot.placements.some(
            (p) => p.roomId === room.id && p.slotId === slot.id,
          ),
      )
      .map((slot) => ({ room, slot })),
  );
  const location =
    available.find((x) => x.slot.type === "image") ?? available[0];
  if (!location)
    throw new Error(
      "As salas estão cheias. Adicione uma sala ou libere uma posição.",
    );
  const { room, slot } = location;
  const id = crypto.randomUUID();
  const mediaId = crypto.randomUUID();
  return {
    record: {
      id,
      title: "Nova obra",
      year: new Date().getFullYear(),
      description: "",
      kind: "Obra",
      credits: [],
      creditNote: "Artista convidado",
      status: "draft",
    },
    media: {
      id: mediaId,
      recordId: id,
      type: slot.type,
      src: slot.type === "image" ? "/art/desvio-fios.svg" : undefined,
      alt:
        slot.type === "image" ? "Painel editorial demonstrativo" : "Objeto 3D",
      attribution: "Equipe Desvio",
      rights: "demo",
    },
    placement: {
      id: crypto.randomUUID(),
      recordId: id,
      mediaId,
      roomId: room.id,
      slotId: slot.id,
      position: slot.position,
      rotation: slot.rotation,
      scale: [1, 1, 1],
      presentation: slot.type !== "model" ? "frame" : "pedestal",
    },
  };
}
export function placeRecordDraft(
  draft: RecordDraft,
  snapshot: CollectionSnapshot,
  roomId: string,
  slotId?: string,
  type: MediaAsset["type"] = draft.media.type,
): RecordDraft {
  const room = snapshot.rooms.find((r) => r.id === roomId);
  const slot =
    room &&
    roomSlots(room).find(
      (s) =>
        slotSupports(s, type) &&
        (!slotId || s.id === slotId) &&
        !snapshot.placements.some(
          (p) =>
            p.recordId !== draft.record.id &&
            p.roomId === roomId &&
            p.slotId === s.id,
        ),
    );
  if (!slot)
    throw new Error("Não há posição disponível para esta mídia na sala.");
  return {
    ...draft,
    media:
      type === draft.media.type
        ? draft.media
        : {
            ...draft.media,
            type,
            src: undefined,
            bucket: undefined,
            path: undefined,
            authorization: undefined,
            rights: "demo",
          },
    placement: {
      ...draft.placement,
      roomId,
      slotId: slot.id,
      position: slot.position,
      rotation: slot.rotation,
      presentation: type !== "model" ? "frame" : "pedestal",
    },
  };
}
export function swapMountings(
  snapshot: CollectionSnapshot,
  firstId: string,
  secondId: string,
) {
  const a = snapshot.placements.find((p) => p.recordId === firstId);
  const b = snapshot.placements.find((p) => p.recordId === secondId);
  if (!a || !b || a.id === b.id)
    throw new Error("Escolha duas obras distintas.");
  if (
    snapshot.media.find((m) => m.id === a.mediaId)?.type !==
    snapshot.media.find((m) => m.id === b.mediaId)?.type
  )
    throw new Error("Troque obras do mesmo tipo de mídia.");
  const first = {
    roomId: a.roomId,
    slotId: a.slotId,
    position: a.position,
    rotation: a.rotation,
  };
  Object.assign(a, {
    roomId: b.roomId,
    slotId: b.slotId,
    position: b.position,
    rotation: b.rotation,
  });
  Object.assign(b, first);
}
