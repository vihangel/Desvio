import { describe, expect, it } from "vitest";
import {
  LocalCollectionRepository,
  COLLECTION_KEY,
  type StoragePort,
} from "../src/infrastructure/local/LocalCollectionRepository";
import { createSeed } from "../src/infrastructure/local/seed";
import { selectArtworks, selectRecordDraft } from "../src/domain/selectors";
import { validatePublication } from "../src/domain/validation";
import { pageForPath } from "../src/app/routes";
class MemoryStorage implements StoragePort {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}
describe("collection repository", () => {
  it("publishes edits of published works right away and hides drafts", async () => {
    const repo = new LocalCollectionRepository(new MemoryStorage());
    let state = await repo.load();
    const edit = selectRecordDraft(state.draft, state.draft.records[0].id);
    edit.record.title = "Novo título";
    state = await repo.saveRecord(edit, state.revision);
    const onSite = () =>
      state.published.records.find((r) => r.id === edit.record.id);
    expect(onSite()?.title).toBe("Novo título");
    state = await repo.setRecordStatus(edit.record.id, "draft", state.revision);
    expect(onSite()).toBeUndefined();
    expect(
      state.draft.records.find((r) => r.id === edit.record.id)?.status,
    ).toBe("draft");
    state = await repo.setRecordStatus(
      edit.record.id,
      "archived",
      state.revision,
    );
    expect(onSite()).toBeUndefined();
    state = await repo.setRecordStatus(
      edit.record.id,
      "published",
      state.revision,
    );
    expect(onSite()?.title).toBe("Novo título");
  });
  it("refuses to publish a work without description", async () => {
    const repo = new LocalCollectionRepository(new MemoryStorage());
    const state = await repo.load();
    const edit = selectRecordDraft(state.draft, state.draft.records[0].id);
    edit.record.description = " ";
    await expect(repo.saveRecord(edit, state.revision)).rejects.toThrow(
      "descrição",
    );
    edit.record.status = "draft";
    await expect(repo.saveRecord(edit, state.revision)).resolves.toBeTruthy();
  });
  it("rejects a slot occupied by another record", async () => {
    const repo = new LocalCollectionRepository(new MemoryStorage());
    const state = await repo.load();
    const first = selectRecordDraft(state.draft, state.draft.records[0].id);
    const second = selectRecordDraft(state.draft, state.draft.records[1].id);
    second.placement = {
      ...first.placement,
      id: second.placement.id,
      recordId: second.record.id,
      mediaId: second.media.id,
    };
    await expect(repo.saveRecord(second, state.revision)).rejects.toThrow(
      "ocupado",
    );
  });
  it("rejects stale writes from another tab", async () => {
    const storage = new MemoryStorage();
    const a = new LocalCollectionRepository(storage),
      b = new LocalCollectionRepository(storage);
    const stateA = await a.load(),
      stateB = await b.load();
    await a.saveExhibition(
      { ...stateA.draft.exhibition, title: "Outra exposição" },
      stateA.revision,
    );
    await expect(
      b.saveExhibition(stateB.draft.exhibition, stateB.revision),
    ).rejects.toThrow("outra aba");
  });
  it("preserves malformed data instead of silently replacing it", async () => {
    const storage = new MemoryStorage();
    storage.setItem(COLLECTION_KEY, "{invalid");
    const repo = new LocalCollectionRepository(storage);
    await expect(repo.load()).rejects.toThrow("inválido");
    expect(storage.getItem(COLLECTION_KEY)).toBe("{invalid");
    expect((await repo.resetDemo(0)).draft.records).toHaveLength(7);
  });
  it("does not report quota failures as successful saves", async () => {
    const storage = new MemoryStorage(),
      repo = new LocalCollectionRepository(storage);
    const state = await repo.load();
    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    await expect(
      repo.deleteRecord(state.draft.records[0].id, state.revision),
    ).rejects.toThrow("salvar");
    expect((await repo.load()).draft.records).toHaveLength(7);
  });
  it("deletes a work with its media and placement, also from the site", async () => {
    const repo = new LocalCollectionRepository(new MemoryStorage());
    let state = await repo.load();
    const id = state.draft.records[0].id;
    state = await repo.deleteRecord(id, state.revision);
    expect(state.draft.media.some((m) => m.recordId === id)).toBe(false);
    expect(state.draft.placements.some((p) => p.recordId === id)).toBe(false);
    expect(state.published.records.some((r) => r.id === id)).toBe(false);
  });
  it("migrates v2 into a draft without making local edits public", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "desvio:works:v2",
      JSON.stringify([
        {
          id: "local-1",
          title: "Local",
          author: "Convidado",
          year: null,
          room: 0,
          type: "image",
          image: "/art/desvio-fios.svg",
          description: "",
        },
      ]),
    );
    const state = await new LocalCollectionRepository(storage).load();
    expect(state.draft.records[0].title).toBe("Local");
    expect(state.published.records).toHaveLength(7);
    expect(storage.getItem("desvio:works:v2")).not.toBeNull();
  });
  it("keeps a session model in memory and strips the URL from storage", async () => {
    const storage = new MemoryStorage(),
      repo = new LocalCollectionRepository(storage);
    let state = await repo.load();
    const model = selectRecordDraft(state.draft, state.draft.records[6].id);
    model.media.src = "blob:session";
    await expect(repo.saveRecord(model, state.revision)).rejects.toThrow(
      "persistente",
    );
    model.record.status = "draft";
    state = await repo.saveRecord(model, state.revision);
    expect(state.draft.media.find((m) => m.id === model.media.id)?.src).toBe(
      "blob:session",
    );
    expect(storage.getItem(COLLECTION_KEY)).not.toContain("blob:session");
  });
});
describe("domain and navigation", () => {
  it("uses artist IDs and keeps the collective credit", () => {
    const state = createSeed();
    const works = selectArtworks(state.draft);
    expect(works[4].artistIds).toEqual([state.draft.artists[0].id]);
    expect(works[4].author).toContain("coletivo");
    expect(
      new Set(works.map((w) => `${w.roomId}:${w.placement.slotId}`)).size,
    ).toBe(works.length);
  });
  it("requires authorization for licensed media", () => {
    const state = createSeed();
    state.draft.media[0].rights = "licensed";
    expect(() => validatePublication(state.draft)).toThrow("autorização");
  });
  it("rejects unsafe media URLs", () => {
    const state = createSeed();
    state.draft.media[0].src = "javascript:alert(1)";
    expect(() => validatePublication(state.draft)).toThrow("inválido");
  });
  it("supports direct paths and identifies unknown routes", () => {
    expect(pageForPath("/obras")).toBe("catalog");
    expect(pageForPath("/acervo")).toBe("catalog");
    expect(pageForPath("/sobre")).toBe("about");
    expect(pageForPath("/artistas/")).toBe("artists");
    expect(pageForPath("/museu")).toBe("visit");
    expect(pageForPath("/admin")).toBe("admin");
    expect(pageForPath("/inexistente")).toBe("not_found");
  });
});

describe("publication invariants", () => {
  it("rejects nonexistent calendar dates", () => {
    const state = createSeed();
    state.draft.exhibition.beginsAt = "2026-02-31";
    expect(() => validatePublication(state.draft)).toThrow("Data inválida");
  });
  it("rejects dates in reverse order", () => {
    const state = createSeed();
    state.draft.exhibition.beginsAt = "2026-10-20";
    state.draft.exhibition.endsAt = "2026-10-01";
    expect(() => validatePublication(state.draft)).toThrow("encerramento");
  });
  it("takes the exhibition off air and back without losing work statuses", async () => {
    const repo = new LocalCollectionRepository(new MemoryStorage());
    let state = await repo.load();
    state = await repo.archive(state.revision);
    expect(state.published.exhibition.status).toBe("archived");
    state = await repo.saveExhibition(
      { ...state.draft.exhibition, title: "Outro título" },
      state.revision,
    );
    expect(state.draft.exhibition.status).toBe("archived");
    state = await repo.publish(state.revision);
    expect(state.published.exhibition.status).toBe("published");
    expect(state.published.records).toHaveLength(state.draft.records.length);
  });
  it("converts a browser state saved before per-work status", async () => {
    const storage = new MemoryStorage();
    const legacy = createSeed();
    legacy.draft.exhibition.status = "draft";
    legacy.draft.records.forEach((r) => {
      r.status = "draft";
    });
    const extra = legacy.published.records.pop()!;
    legacy.published.placements = legacy.published.placements.filter(
      (p) => p.recordId !== extra.id,
    );
    legacy.published.media = legacy.published.media.filter(
      (m) => m.recordId !== extra.id,
    );
    storage.setItem(COLLECTION_KEY, JSON.stringify(legacy));
    const state = await new LocalCollectionRepository(storage).load();
    expect(state.draft.exhibition.status).toBe("published");
    expect(state.draft.records.find((r) => r.id === extra.id)?.status).toBe(
      "draft",
    );
    expect(
      state.draft.records.filter((r) => r.status === "published"),
    ).toHaveLength(legacy.draft.records.length - 1);
  });
  it("refreshes an existing repository when another tab changes the revision", async () => {
    const storage = new MemoryStorage();
    const a = new LocalCollectionRepository(storage),
      b = new LocalCollectionRepository(storage);
    const initial = await a.load();
    await b.load();
    await a.deleteRecord(initial.draft.records[0].id, initial.revision);
    expect((await b.load()).draft.records).toHaveLength(6);
  });
  it("archives the public exhibition without deleting its data", async () => {
    const repo = new LocalCollectionRepository(new MemoryStorage());
    let state = await repo.load();
    state = await repo.archive(state.revision);
    expect(state.published.exhibition.status).toBe("archived");
    expect(state.published.records).toHaveLength(7);
  });
});

describe("storage failure recovery", () => {
  it("does not cache an initialization that failed to persist", async () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("quota");
    };
    const repo = new LocalCollectionRepository(storage);
    await expect(repo.load()).rejects.toThrow("salvar");
    await expect(repo.load()).rejects.toThrow("salvar");
  });
  it("rejects orphaned media from persisted storage", async () => {
    const storage = new MemoryStorage();
    const state = createSeed();
    state.draft.media[0].recordId = crypto.randomUUID();
    storage.setItem(COLLECTION_KEY, JSON.stringify(state));
    await expect(new LocalCollectionRepository(storage).load()).rejects.toThrow(
      "inválido",
    );
  });
  it("keeps the guided reading order stable when a record is edited", async () => {
    const repo = new LocalCollectionRepository(new MemoryStorage());
    let state = await repo.load();
    const before = selectArtworks(state.draft).map((w) => w.id);
    const edit = selectRecordDraft(state.draft, before[0]);
    edit.record.title = "Título atualizado";
    state = await repo.saveRecord(edit, state.revision);
    expect(selectArtworks(state.draft).map((w) => w.id)).toEqual(before);
  });
});
