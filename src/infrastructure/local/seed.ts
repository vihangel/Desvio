import { publicEdition } from "../../domain/publication";
import {
  artists as legacyArtists,
  artworks as legacyWorks,
  rooms as legacyRooms,
  exhibition as legacyExhibition,
  type Artwork as LegacyArtwork,
} from "./legacySeed";
import type {
  CollectionSnapshot,
  CollectionState,
} from "../../domain/entities";
import { roomSlots } from "../../domain/slots";
// Stable UUIDs keep fixtures importable into Postgres; slugs from v2 are migration-only.
export const seedId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function fromLegacy(works: LegacyArtwork[]): CollectionSnapshot {
  const artists = legacyArtists.map((a, i) => ({ ...a, id: seedId(i + 1) }));
  const rooms = legacyRooms.map((r, i) => ({
    ...r,
    id: seedId(i + 10),
    order: i,
    template: "corridor" as const,
  }));
  const occupied = new Set<string>();
  const records: CollectionSnapshot["records"] = [];
  const media: CollectionSnapshot["media"] = [];
  const placements: CollectionSnapshot["placements"] = [];
  works.forEach((w, i) => {
    const originalIndex = legacyWorks.findIndex(
      (original) => original.id === w.id,
    );
    const id =
      originalIndex >= 0 ? seedId(100 + originalIndex) : crypto.randomUUID();
    const room = rooms[w.room];
    if (!room) throw new Error("O acervo antigo contém uma sala inválida.");
    const slot = roomSlots(room).find(
      (s) => s.type === w.type && !occupied.has(`${room.id}:${s.id}`),
    );
    if (!slot)
      throw new Error("O acervo antigo excede a capacidade de uma sala.");
    occupied.add(`${room.id}:${slot.id}`);
    const credits = artists
      .filter((a) => w.author.includes(a.name))
      .map((a) => ({ artistId: a.id, role: "artista" }));
    records.push({
      id,
      title: w.title,
      year: w.year,
      description: w.description,
      source: w.source,
      kind: w.kind || "Registro",
      credits,
      creditNote: credits.length
        ? w.author.includes("coletivo")
          ? "coletivo"
          : ""
        : w.author,
      status: "draft",
    });
    const mediaId =
      originalIndex >= 0 ? seedId(200 + originalIndex) : crypto.randomUUID();
    media.push({
      id: mediaId,
      recordId: id,
      type: w.type,
      src: w.type === "image" ? w.image : w.modelUrl,
      alt: `Painel editorial: ${w.title}`,
      attribution: "Equipe Desvio",
      rights: w.rights || "demo",
    });
    placements.push({
      id: seedId(300 + i),
      recordId: id,
      mediaId,
      roomId: room.id,
      slotId: slot.id,
      position: slot.position,
      rotation: slot.rotation,
      scale: [1, 1, 1],
    });
  });
  return {
    artists,
    records,
    media,
    rooms,
    placements,
    exhibition: {
      id: seedId(20),
      title: legacyExhibition.title,
      subtitle: legacyExhibition.subtitle,
      notice: legacyExhibition.notice,
      status: "draft",
      beginsAt: "",
      endsAt: "",
    },
  };
}
export function createSeed(): CollectionState {
  const draft = fromLegacy(legacyWorks);
  draft.exhibition.status = "published";
  draft.records.forEach((r) => {
    r.status = "published";
  });
  return { version: 3, revision: 0, draft, published: publicEdition(draft) };
}
