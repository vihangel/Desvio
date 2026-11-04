import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createTestDatabase } from "./helpers/postgres";
import { createSeed } from "../src/infrastructure/local/seed";
import { selectRecordDraft } from "../src/domain/selectors";
let db: PGlite;
const curator = "11111111-1111-4111-8111-111111111111";
const artistUser = "22222222-2222-4222-8222-222222222222";
beforeAll(async () => {
  db = await createTestDatabase();
  await db.query(
    "insert into auth.users(id,email) values($1,'cur@example.com'),($2,'artist@example.com')",
    [curator, artistUser],
  );
  await db.query("insert into public.desvio_memberships values($1,'curator')", [
    curator,
  ]);
  await as(curator);
  await command("initialize", createSeed().draft);
}, 120000);
afterAll(async () => {
  await db?.close();
});
async function as(user: string) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
}
type State = {
  revision: number;
  draft: ReturnType<typeof createSeed>["draft"];
  published: ReturnType<typeof createSeed>["draft"];
};
async function load() {
  const { rows } = await db.query<{ state: State }>(
    "select public.desvio_load_collection() state",
  );
  return rows[0].state;
}
async function command(operation: string, payload: unknown) {
  const { revision } = await load();
  const { rows } = await db.query<{ state: State }>(
    "select public.desvio_edit_collection($1,$2::jsonb,$3) state",
    [operation, JSON.stringify(payload), revision],
  );
  return rows[0].state;
}
async function asOwner<T>(task: () => Promise<T>) {
  await db.exec("reset role");
  try {
    return await task();
  } finally {
    await as(curator);
  }
}
const versions = () =>
  asOwner(async () => {
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::int n from public.desvio_versions",
    );
    return rows[0].n;
  });
it("lets a login be deleted after it has edited, keeping the history", async () => {
  await asOwner(async () => {
    await db.query(
      "insert into public.desvio_artist_accounts(user_id,artist_id,email) values($1,$2,'artist@example.com')",
      [artistUser, createSeed().draft.artists[0].id],
    );
    await db.query(
      "insert into public.desvio_editorial_events(collection_id,user_id,operation,revision) values(desvio_private.collection_id(),$1,'artist:save_room',99)",
      [artistUser],
    );
    await db.query("delete from auth.users where id=$1", [artistUser]);
    const { rows } = await db.query<{ user_id: string | null }>(
      "select user_id from public.desvio_editorial_events where revision=99",
    );
    expect(rows).toEqual([{ user_id: null }]);
  });
});
it("deletes the public edition when the exhibition goes off air", async () => {
  await command("publish", {});
  const before = await versions();
  const off = await command("archive", {});
  expect(off.published.records).toEqual([]);
  expect(await versions()).toBe(before - 1);
  const back = await command("publish", {});
  expect(await versions()).toBe(before);
  expect(back.published.records.length).toBeGreaterThan(0);
});
it("rejects captions that are not WebVTT on the server too", async () => {
  const { draft } = await load();
  const work = selectRecordDraft(draft, draft.records[0].id);
  const narration = {
    src: "https://example.com/voz.mp3",
    credits: "Voz",
    transcript: "Texto",
    authorized: false,
  };
  work.record.status = "draft";
  await expect(
    command("save_record", {
      ...work,
      media: { ...work.media, narration: { ...narration, captions: "oi" } },
    }),
  ).rejects.toThrow("WebVTT");
  const saved = await command("save_record", {
    ...work,
    media: {
      ...work.media,
      narration: {
        ...narration,
        captions: "WEBVTT\n\n00:00.000 --> 00:01.000\nOi",
      },
    },
  });
  expect(
    saved.draft.media.find((m) => m.id === work.media.id)?.narration?.captions,
  ).toContain("WEBVTT");
});
it("validates artist photos in an import, as in any other save", async () => {
  const { draft, revision } = await load();
  draft.artists[0].photo = { src: "javascript:alert(1)" };
  await expect(
    db.query("select public.desvio_replace_draft_from_local($1::jsonb,$2)", [
      JSON.stringify(draft),
      revision,
    ]),
  ).rejects.toThrow("Envie a foto ao Storage");
});
it("refuses an import that would publish an incomplete work", async () => {
  const { draft, revision } = await load();
  draft.records[0].status = "published";
  draft.records[0].description = " ";
  await expect(
    db.query("select public.desvio_replace_draft_from_local($1::jsonb,$2)", [
      JSON.stringify(draft),
      revision,
    ]),
  ).rejects.toThrow("preencha a descrição");
});
it("keeps columns and JSON in agreement", async () => {
  await asOwner(async () => {
    await expect(
      db.exec(
        "update public.desvio_records set content=jsonb_set(content,'{status}','\"in_review\"')",
      ),
    ).rejects.toThrow("desvio_records_status");
    await expect(
      db.exec("update public.desvio_rooms set sort_order=sort_order+100"),
    ).rejects.toThrow("desvio_rooms_content_id");
  });
});
it("no longer exposes the removed commands", async () => {
  const { rows } = await db.query<{ name: string }>(
    "select proname as name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','desvio_private') and proname in ('desvio_import_local','import_local','desvio_remove_artist_account','remove_artist_account','validate_artist_photos')",
  );
  expect(rows).toEqual([]);
});
