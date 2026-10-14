import { beforeAll, afterAll, expect, it } from "vitest";
import { createTestDatabase } from "./helpers/postgres";
import type { PGlite } from "@electric-sql/pglite";
let db: PGlite;
beforeAll(async () => {
  db = await createTestDatabase(true);
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("migrates the existing catalogue into both editions without losing Linscker works", async () => {
  const result = await db.query<{ draft: number; published: number }>(
    "select (select count(*)::int from public.desvio_records where version_id=c.draft_version) draft,(select count(*)::int from public.desvio_records where version_id=c.published_version) published from public.desvio_collections c",
  );
  expect(result.rows[0]).toEqual({ draft: 10, published: 10 });
});
it("grants the bootstrap administrator only after the selected email is verified", async () => {
  const id = "33333333-3333-4333-8333-333333333333";
  await db.exec(
    "insert into desvio_private.admin_bootstrap(email) values('owner@example.com')",
  );
  await db.query(
    "insert into auth.users(id,email) values($1,'owner@example.com')",
    [id],
  );
  expect(
    (await db.query("select * from public.desvio_memberships")).rows,
  ).toHaveLength(0);
  await db.query("update auth.users set email_confirmed_at=now() where id=$1", [
    id,
  ]);
  expect(
    (
      await db.query<{ role: string }>(
        "select role from public.desvio_memberships",
      )
    ).rows[0].role,
  ).toBe("admin");
  await db.exec(
    "insert into auth.users(id,email,email_confirmed_at) values('44444444-4444-4444-8444-444444444444','other@example.com',now())",
  );
  expect(
    (await db.query("select * from public.desvio_memberships")).rows,
  ).toHaveLength(1);
});
it("imports local changes into the draft once and preserves the public edition", async () => {
  const owner = "33333333-3333-4333-8333-333333333333";
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  const loaded = await db.query<{
    state: {
      draft: { records: { title: string }[] };
      published: { records: { title: string }[] };
    };
  }>("select public.desvio_load_collection() state");
  const draft = loaded.rows[0].state.draft;
  const previous = loaded.rows[0].state.published.records[0].title;
  draft.records[0].title = "My local edit";
  const imported = await db.query<{
    state: { revision: number; draft: typeof draft; published: typeof draft };
  }>("select public.desvio_import_local($1::jsonb,0) state", [
    JSON.stringify(draft),
  ]);
  expect(imported.rows[0].state.revision).toBe(1);
  expect(imported.rows[0].state.draft.records[0].title).toBe("My local edit");
  expect(imported.rows[0].state.published.records[0].title).toBe(previous);
  await expect(
    db.query("select public.desvio_import_local($1::jsonb,1)", [
      JSON.stringify(draft),
    ]),
  ).rejects.toThrow("Já há alterações remotas");
  await db.exec("reset role");
});
it("replaces the saved works with a local snapshot and publishes the published ones", async () => {
  const owner = "33333333-3333-4333-8333-333333333333";
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  type Snapshot = { records: { id: string; title: string; status: string }[] };
  const loaded = await db.query<{
    state: { revision: number; draft: Snapshot; published: Snapshot };
  }>("select public.desvio_load_collection() state");
  const { revision, draft } = loaded.rows[0].state;
  draft.records[0].title = "Second local edit";
  draft.records[0].status = "published";
  draft.records[1].status = "in_review";
  const replaced = await db.query<{
    state: { revision: number; draft: Snapshot; published: Snapshot };
  }>("select public.desvio_replace_draft_from_local($1::jsonb,$2) state", [
    JSON.stringify(draft),
    revision,
  ]);
  const next = replaced.rows[0].state;
  expect(next.revision).toBe(revision + 1);
  expect(
    next.published.records.find((r) => r.id === draft.records[0].id)?.title,
  ).toBe("Second local edit");
  expect(
    next.draft.records.find((r) => r.id === draft.records[1].id)?.status,
  ).toBe("draft");
  expect(next.published.records.some((r) => r.id === draft.records[1].id)).toBe(
    false,
  );
  await expect(
    db.query("select public.desvio_replace_draft_from_local($1::jsonb,$2)", [
      JSON.stringify(draft),
      revision,
    ]),
  ).rejects.toThrow("O acervo mudou");
  await db.exec("reset role");
});
