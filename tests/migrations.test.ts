import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "./helpers/postgres";
import { beforeAll, afterAll, expect, it } from "vitest";
import { createSeed } from "../src/infrastructure/local/seed";
let db: PGlite;
const editorId = "11111111-1111-4111-8111-111111111111";
beforeAll(async () => {
  db = await createTestDatabase();
  await db.query("insert into auth.users(id) values($1);", [editorId]);
  await db.query(
    "insert into public.desvio_memberships values($1,'curator');",
    [editorId],
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function role(name: string, id = "") {
  await db.exec(`reset role; set role ${name};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function command(operation: string, payload: unknown, revision: number) {
  return db.query<{ state: unknown }>(
    "select public.desvio_edit_collection($1,$2::jsonb,$3) state",
    [operation, JSON.stringify(payload), revision],
  );
}
it("runs migrations and denies anonymous and non-curator mutations", async () => {
  await role("anon");
  expect(
    (
      await db.query<{ editor: boolean }>(
        "select public.desvio_is_editor() editor",
      )
    ).rows[0].editor,
  ).toBe(false);
  await expect(command("initialize", createSeed().draft, 0)).rejects.toThrow();
  await role("authenticated", "22222222-2222-4222-8222-222222222222");
  await expect(command("initialize", createSeed().draft, 0)).rejects.toThrow(
    "curadoria",
  );
});
it("persists edits, detects conflicts and publishes works marked as published", async () => {
  await role("authenticated", editorId);
  await command("initialize", createSeed().draft, 0);
  await expect(command("initialize", createSeed().draft, 0)).rejects.toThrow(
    "mudou",
  );
  await command(
    "set_record_status",
    { id: createSeed().draft.records[1].id, status: "draft" },
    1,
  );
  await command(
    "set_record_status",
    { id: createSeed().draft.records[1].id, status: "published" },
    2,
  );
  await role("anon");
  const result = await db.query<{
    state: { draft: { records: unknown[] }; published: { records: unknown[] } };
  }>("select public.desvio_load_collection() state");
  expect(result.rows[0].state.draft.records).toHaveLength(0);
  expect(result.rows[0].state.published.records).toHaveLength(7);
});
it("hides drafts from visitors and prevents direct table writes", async () => {
  await role("authenticated", editorId);
  const work = createSeed().draft.records[0];
  await command("set_record_status", { id: work.id, status: "draft" }, 3);
  await role("anon");
  expect(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from public.desvio_records",
      )
    ).rows[0].n,
  ).toBe(6);
  await expect(db.exec("delete from public.desvio_records")).rejects.toThrow();
});
it("takes the exhibition off air and refuses incomplete live works", async () => {
  await role("authenticated", editorId);
  const state = (
    await db.query<{ state: ReturnType<typeof createSeed> }>(
      "select public.desvio_load_collection() state",
    )
  ).rows[0].state;
  const record = { ...state.draft.records[2], description: "" },
    media = state.draft.media.find((m) => m.recordId === record.id)!,
    placement = state.draft.placements.find((p) => p.recordId === record.id)!;
  await expect(
    command("save_record", { record, media, placement }, 4),
  ).rejects.toThrow("descrição");
  await command("archive", {}, 4);
  await role("anon");
  expect(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from public.desvio_records",
      )
    ).rows[0].n,
  ).toBe(0);
});
it("rejects self-promotion and malformed snapshots", async () => {
  await role("authenticated", "22222222-2222-4222-8222-222222222222");
  await expect(
    db.query("insert into public.desvio_memberships values($1,'admin')", [
      "22222222-2222-4222-8222-222222222222",
    ]),
  ).rejects.toThrow();
  await role("authenticated", editorId);
  await expect(command("save_exhibition", {}, 5)).rejects.toThrow("incompleta");
});
it("enforces Storage upload ownership and public publication visibility", async () => {
  await role("authenticated", editorId);
  await db.query(
    "insert into storage.objects(bucket_id,name) values('desvio-media',$1)",
    [`${editorId}/draft.glb`],
  );
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name) values('desvio-media','someone-else/draft.glb')",
    ),
  ).rejects.toThrow();
  await role("anon");
  expect(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from storage.objects",
      )
    ).rows[0].n,
  ).toBe(0);
  await expect(
    db.exec(
      "insert into storage.objects(bucket_id,name) values('desvio-media','unauthorized.glb')",
    ),
  ).rejects.toThrow();
});
it("supports room operations, swaps and rolls back invalid placement commands", async () => {
  await role("authenticated", editorId);
  const snapshot = createSeed().draft;
  const room = { ...snapshot.rooms[0], id: crypto.randomUUID(), order: 3 };
  await command("save_room", room, 5);
  await command(
    "reorder_rooms",
    { ids: [room.id, ...snapshot.rooms.map((r) => r.id)] },
    6,
  );
  await command("delete_room", { id: room.id }, 7);
  await command(
    "swap_placements",
    { firstId: snapshot.records[1].id, secondId: snapshot.records[2].id },
    8,
  );
  await expect(
    command("save_room", { ...snapshot.rooms[2], pedestalSlots: 0 }, 9),
  ).rejects.toThrow();
  const { rows } = await db.query<{ revision: number }>(
    "select revision::int from public.desvio_collections",
  );
  expect(rows[0].revision).toBe(9);
});
it("publishes Storage access without exposing private authorization notes", async () => {
  await role("authenticated", editorId);
  const result = await db.query<{ state: ReturnType<typeof createSeed> }>(
    "select public.desvio_load_collection() state",
  );
  const state = result.rows[0].state;
  const record = state.draft.records[0],
    media = state.draft.media.find((m) => m.recordId === record.id)!,
    placement = state.draft.placements.find((p) => p.recordId === record.id)!;
  const path = `${editorId}/licensed.png`;
  await db.query(
    "insert into storage.objects(bucket_id,name) values('desvio-media',$1)",
    [path],
  );
  delete media.src;
  media.bucket = "desvio-media";
  media.path = path;
  media.rights = "licensed";
  media.authorization = "PRIVATE-AUTHORIZATION-NOTE";
  record.status = "published";
  await command("save_record", { record, media, placement }, 9);
  await command("publish", {}, 10);
  await command("archive", {}, 11);
  await command("publish", {}, 12);
  await role("anon");
  expect(
    JSON.stringify(
      (await db.query("select public.desvio_load_collection() state")).rows,
    ),
  ).not.toContain("PRIVATE-AUTHORIZATION-NOTE");
  expect(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from storage.objects",
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from public.desvio_media_authorizations",
      )
    ).rows[0].n,
  ).toBe(0);
  await role("authenticated", editorId);
  expect(
    (
      await db.query<{ id: string }>(
        "delete from storage.objects where name=$1 returning id",
        [path],
      )
    ).rows,
  ).toHaveLength(0);
  await command("archive", {}, 13);
  await role("anon");
  expect(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from storage.objects",
      )
    ).rows[0].n,
  ).toBe(0);
});
it("supports YouTube and narration in the incremental migration", async () => {
  await role("authenticated", editorId);
  const result = await db.query<{ state: ReturnType<typeof createSeed> }>(
    "select public.desvio_load_collection() state",
  );
  const state = result.rows[0].state;
  const record = state.draft.records[0],
    media = state.draft.media.find((m) => m.recordId === record.id)!,
    placement = state.draft.placements.find((p) => p.recordId === record.id)!;
  record.status = "published";
  media.type = "video";
  delete media.bucket;
  delete media.path;
  media.src = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
  media.narration = {
    bucket: "desvio-media",
    path: `${editorId}/narration.mp3`,
    credits: "Artist voice",
    transcript: "Transcript",
    authorized: false,
  };
  await db.query(
    "insert into storage.objects(bucket_id,name) values('desvio-media',$1)",
    [media.narration.path],
  );
  await command("publish", {}, 14);
  await expect(
    command("save_record", { record, media, placement }, 15),
  ).rejects.toThrow("narração");
  media.narration.authorized = true;
  media.authorization = "AUTHORIZATION-VOICE";
  await command("save_record", { record, media, placement }, 15);
  await role("anon");
  expect(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from storage.objects where name like '%narration.mp3'",
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    JSON.stringify(
      (await db.query("select public.desvio_load_collection()")).rows,
    ),
  ).not.toContain("AUTHORIZATION-VOICE");
});
