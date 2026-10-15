import { describe, expect, it } from "vitest";
import { createSeed } from "../src/infrastructure/local/seed";
import {
  CURATOR,
  canDeleteRecord,
  canEditRecord,
  editableRooms,
  scopedSnapshot,
  type Access,
} from "../src/domain/access";
import { parseAdminPath, adminPath } from "../src/features/admin/useAdminRoute";
import { pageForPath } from "../src/app/routes";
import { assertArtistUnused } from "../src/domain/validation";
describe("artist access", () => {
  const snapshot = createSeed().draft;
  const [room] = snapshot.rooms;
  const artistId = snapshot.artists[0].id;
  room.artistIds = [artistId];
  const artist: Access = { kind: "artist", artistId };
  const inRoom = snapshot.placements.find((p) => p.roomId === room.id)!;
  const elsewhere = snapshot.placements.find((p) => p.roomId !== room.id)!;
  it("limits artists to the rooms that list them", () => {
    expect(editableRooms(artist, snapshot).map((r) => r.id)).toEqual([room.id]);
    expect(editableRooms(CURATOR, snapshot)).toHaveLength(
      snapshot.rooms.length,
    );
    expect(canEditRecord(artist, snapshot, inRoom.recordId)).toBe(true);
    expect(canEditRecord(artist, snapshot, elsewhere.recordId)).toBe(false);
  });
  it("lets artists delete only drafts in their rooms", () => {
    expect(canDeleteRecord(artist, snapshot, inRoom.recordId)).toBe(false);
    snapshot.records.find((r) => r.id === inRoom.recordId)!.status = "draft";
    expect(canDeleteRecord(artist, snapshot, inRoom.recordId)).toBe(true);
    expect(canDeleteRecord(CURATOR, snapshot, elsewhere.recordId)).toBe(true);
  });
  it("scopes the snapshot to the artist's rooms and works", () => {
    const view = scopedSnapshot(artist, snapshot);
    expect(view.rooms).toHaveLength(1);
    expect(view.placements.every((p) => p.roomId === room.id)).toBe(true);
    expect(view.records.map((r) => r.id).sort()).toEqual(
      view.placements.map((p) => p.recordId).sort(),
    );
    expect(view.artists).toHaveLength(snapshot.artists.length);
  });
  it("explains why an artist cannot be deleted", () => {
    expect(() => assertArtistUnused(snapshot, artistId)).toThrow("créditos");
  });
});
describe("admin routes", () => {
  it("maps admin sub-paths to screens", () => {
    expect(parseAdminPath("/admin")).toEqual({
      section: "works",
      id: undefined,
      focus: undefined,
    });
    expect(parseAdminPath("/admin/obras/nova")).toMatchObject({
      section: "works",
      id: "nova",
    });
    expect(parseAdminPath("/admin/artistas/abc/")).toMatchObject({
      section: "artists",
      id: "abc",
    });
    expect(parseAdminPath("/admin/previa", "?obra=x")).toMatchObject({
      section: "preview",
      focus: "x",
    });
    expect(adminPath("rooms", "r1")).toBe("/admin/salas/r1");
    expect(pageForPath("/admin/obras/123")).toBe("admin");
    expect(pageForPath("/admin/redefinir-senha")).toBe("reset_password");
  });
});
