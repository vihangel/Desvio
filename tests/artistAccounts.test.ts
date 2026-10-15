import { beforeAll, afterAll, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "./helpers/postgres";
import type { CollectionState, RecordDraft } from "../src/domain/entities";
let db: PGlite;
const curator = "11111111-1111-4111-8111-111111111111";
const artistUser = "55555555-5555-4555-8555-555555555555";
const linscker = "00000000-0000-4000-8000-000000000001";
const sol = "00000000-0000-4000-8000-000000000002";
const linsckerRoom = "00000000-0000-4000-8000-000000000010";
const solRoom = "00000000-0000-4000-8000-000000000011";
async function as(role: string, id = "") {
  await db.exec(`reset role; set role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function load() {
  return (
    await db.query<{ state: CollectionState }>(
      "select public.desvio_load_collection() state",
    )
  ).rows[0].state;
}
const call = (fn: string, op: string, payload: unknown, revision: number) =>
  db.query<{ state: CollectionState }>(
    `select public.${fn}($1,$2::jsonb,$3) state`,
    [op, JSON.stringify(payload), revision],
  );
const draftOf = (state: CollectionState, id: string): RecordDraft => ({
  record: state.draft.records.find((r) => r.id === id)!,
  media: state.draft.media.find((m) => m.recordId === id)!,
  placement: state.draft.placements.find((p) => p.recordId === id)!,
});
beforeAll(async () => {
  db = await createTestDatabase(true);
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,'cur@example.com',now()),($2,'artist@example.com',null)",
    [curator, artistUser],
  );
  await db.query("insert into public.desvio_memberships values($1,'curator')", [
    curator,
  ]);
  // Rooms list their artists; the catalogue rooms do not, so link them here.
  await as("authenticated", curator);
  let state = await load();
  for (const [roomId, artistId] of [
    [linsckerRoom, linscker],
    [solRoom, sol],
  ]) {
    const room = state.draft.rooms.find((r) => r.id === roomId)!;
    state = (
      await call(
        "desvio_edit_collection",
        "save_room",
        { ...room, artistIds: [artistId] },
        state.revision,
      )
    ).rows[0].state;
  }
  await db.exec("reset role");
  await db.query(
    "select public.desvio_link_artist_account('Artist@Example.com',$1)",
    [linscker],
  );
}, 120000);
afterAll(async () => {
  await db?.close();
});
it("only the service role links accounts", async () => {
  await as("authenticated", curator);
  await expect(
    db.query("select public.desvio_link_artist_account('x@example.com',$1)", [
      sol,
    ]),
  ).rejects.toThrow();
  await db.exec("reset role");
});
it("identifies the artist and shows only their rooms and works", async () => {
  await as("authenticated", artistUser);
  const who = (
    await db.query<{ who: { role: string; artistId: string } }>(
      "select public.desvio_whoami() who",
    )
  ).rows[0].who;
  expect(who).toEqual({ role: "artist", artistId: linscker });
  const state = await load();
  expect(state.draft.rooms.map((r) => r.id)).toEqual([linsckerRoom]);
  expect(state.draft.placements.every((p) => p.roomId === linsckerRoom)).toBe(
    true,
  );
  expect(state.published.records.length).toBeGreaterThan(
    state.draft.records.length,
  );
  await expect(
    call("desvio_edit_collection", "archive", {}, state.revision),
  ).rejects.toThrow("curadoria");
});
it("edits own room text but not membership, and not other rooms", async () => {
  await as("authenticated", artistUser);
  let state = await load();
  const room = state.draft.rooms[0];
  state = (
    await call(
      "desvio_artist_edit",
      "save_room",
      { ...room, name: "Sala da Linscker", artistIds: [], order: 2 },
      state.revision,
    )
  ).rows[0].state;
  expect(state.draft.rooms[0]).toMatchObject({
    name: "Sala da Linscker",
    artistIds: [linscker],
    order: 0,
  });
  await expect(
    call(
      "desvio_artist_edit",
      "save_room",
      { id: solRoom, name: "x", subtitle: "" },
      state.revision,
    ),
  ).rejects.toThrow("vinculada");
});
it("sends edited works back to draft for curator review", async () => {
  await as("authenticated", artistUser);
  let state = await load();
  const work = draftOf(state, state.draft.records[0].id);
  work.record.title = "Título revisto pela artista";
  work.record.status = "published";
  state = (
    await call("desvio_artist_edit", "save_record", work, state.revision)
  ).rows[0].state;
  const saved = state.draft.records.find((r) => r.id === work.record.id)!;
  expect(saved).toMatchObject({ status: "draft", reviewRequested: true });
  expect(state.published.records.some((r) => r.id === saved.id)).toBe(false);
  // Moving a work into someone else's room is refused.
  const moved = draftOf(state, saved.id);
  moved.placement.roomId = solRoom;
  await expect(
    call("desvio_artist_edit", "save_record", moved, state.revision),
  ).rejects.toThrow("suas salas");
  // The curator publishes it, which clears the review flag.
  await as("authenticated", curator);
  state = await load();
  state = (
    await call(
      "desvio_edit_collection",
      "set_record_status",
      { id: saved.id, status: "published" },
      state.revision,
    )
  ).rows[0].state;
  const published = state.draft.records.find((r) => r.id === saved.id)!;
  expect(published.status).toBe("published");
  expect(published.reviewRequested).toBeUndefined();
  expect(state.published.records.find((r) => r.id === saved.id)?.title).toBe(
    "Título revisto pela artista",
  );
});
it("lets artists delete only their drafts", async () => {
  await as("authenticated", artistUser);
  const state = await load();
  const published = state.draft.records.find((r) => r.status === "published")!;
  await expect(
    call(
      "desvio_artist_edit",
      "delete_record",
      { id: published.id },
      state.revision,
    ),
  ).rejects.toThrow("rascunho");
});
it("lists accounts for curators and blocks deleting credited artists", async () => {
  await as("authenticated", curator);
  const accounts = (
    await db.query<{
      list: { email: string; artistId: string; confirmed: boolean }[];
    }>("select public.desvio_list_artist_accounts() list")
  ).rows[0].list;
  expect(accounts).toEqual([
    expect.objectContaining({
      email: "artist@example.com",
      artistId: linscker,
      confirmed: false,
    }),
  ]);
  const state = await load();
  await expect(
    call(
      "desvio_edit_collection",
      "delete_artist",
      { id: sol },
      state.revision,
    ),
  ).rejects.toThrow("créditos");
  await as("authenticated", artistUser);
  await expect(
    db.query("select public.desvio_list_artist_accounts()"),
  ).rejects.toThrow("curadoria");
  await db.exec("reset role");
});
it("validates artist photos stored by curators", async () => {
  await as("authenticated", curator);
  const state = await load();
  const artist = state.draft.artists[0];
  await expect(
    call(
      "desvio_edit_collection",
      "save_artist",
      { ...artist, photo: { bucket: "desvio-media", path: "../x.png" } },
      state.revision,
    ),
  ).rejects.toThrow("foto");
  const saved = (
    await call(
      "desvio_edit_collection",
      "save_artist",
      {
        ...artist,
        photo: { bucket: "desvio-media", path: `${curator}/p.webp` },
      },
      state.revision,
    )
  ).rows[0].state;
  expect(saved.published.artists[0].photo?.path).toBe(`${curator}/p.webp`);
  await db.exec("reset role");
});
