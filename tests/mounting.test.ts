import { expect, it } from "vitest";
import { createSeed } from "../src/infrastructure/local/seed";
import { LocalCollectionRepository } from "../src/infrastructure/local/LocalCollectionRepository";
import { newRecordDraft, swapMountings } from "../src/domain/mounting";
import { reflowRooms, removeRoom } from "../src/domain/roomOperations";
import { stateSchema } from "../src/infrastructure/local/schema";
import { validateRecord } from "../src/domain/validation";
it("supports additional rooms and reorders physical positions with their room", () => {
  const state = createSeed();
  const room = { ...state.draft.rooms[0], id: crypto.randomUUID(), order: 3 };
  state.draft.rooms.push(room);
  expect(stateSchema.parse(state).draft.rooms).toHaveLength(4);
  const placement = state.draft.placements[0];
  const before = [...placement.position];
  reflowRooms(state.draft, [
    room.id,
    ...state.draft.rooms.slice(0, 3).map((r) => r.id),
  ]);
  expect(placement.position[2]).toBe(before[2] - 12);
  expect(() => removeRoom(state.draft, placement.roomId)).toThrow("Mova");
});
it("swaps occupied positions atomically without replacing either work", () => {
  const snapshot = createSeed().draft;
  const a = snapshot.placements[0],
    b = snapshot.placements[1];
  const first = structuredClone(a),
    second = structuredClone(b);
  swapMountings(snapshot, a.recordId, b.recordId);
  expect(a.slotId).toBe(second.slotId);
  expect(b.slotId).toBe(first.slotId);
  expect(a.recordId).toBe(first.recordId);
  expect(() =>
    swapMountings(snapshot, a.recordId, snapshot.placements[6].recordId),
  ).toThrow("mesmo tipo");
});
it("rejects incompatible presentation and shrinking occupied rooms", async () => {
  const storage = new Map<string, string>();
  const repo = new LocalCollectionRepository({
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
  });
  const state = await repo.load();
  const p = state.draft.placements[0];
  expect(() =>
    validateRecord(
      {
        record: state.draft.records[0],
        media: state.draft.media[0],
        placement: { ...p, presentation: "floor" },
      },
      state.draft,
    ),
  ).toThrow("incompatível");
  await expect(
    repo.saveRoom(
      { ...state.draft.rooms[2], pedestalSlots: 0 },
      state.revision,
    ),
  ).rejects.toThrow("Mova");
});
it("can add a model when no wall position remains", () => {
  const snapshot = createSeed().draft;
  snapshot.rooms = [snapshot.rooms[0]];
  snapshot.rooms[0].wallSlots = 1;
  snapshot.placements = snapshot.placements.filter(
    (p) => p.roomId === snapshot.rooms[0].id,
  );
  const draft = newRecordDraft(snapshot);
  expect(draft.media.type).toBe("model");
});
