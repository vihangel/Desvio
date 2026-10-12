import { describe, expect, it } from "vitest";
import { createSeed, seedId } from "../src/infrastructure/local/seed";
import { createLinsckerPreview } from "../src/infrastructure/local/linsckerPreview";
import { selectArtworks } from "../src/domain/selectors";
import { validatePublication, validateRecord } from "../src/domain/validation";
import { stateSchema } from "../src/infrastructure/local/schema";
import { pageForPath } from "../src/app/routes";
describe("local Linscker preview", () => {
  it("adds three sourced works without mutating or replacing the collection", () => {
    const state = createSeed();
    const before = structuredClone(state);
    const preview = createLinsckerPreview(state.published);
    expect(state).toEqual(before);
    expect(preview.records).toHaveLength(10);
    const works = selectArtworks(preview).filter((w) => w.rights === "preview");
    expect(works.map((w) => w.title)).toEqual([
      "Além das Amarras",
      "A Neca da Boneca",
      "Retificada",
    ]);
    expect(works.map((w) => w.year)).toEqual([2024, 2023, 2023]);
    expect(
      works.every(
        (w) =>
          w.artistIds.includes(seedId(1)) &&
          w.source?.startsWith(
            "https://www.transgressoesdegenero.com/obras/",
          ) &&
          w.attribution.includes("Linscker"),
      ),
    ).toBe(true);
    expect(
      stateSchema.parse({ ...state, draft: preview }).draft.records,
    ).toHaveLength(10);
  });
  it("uses free slots and preserves existing placements", () => {
    const base = createSeed().published,
      preview = createLinsckerPreview(base);
    expect(preview.placements.slice(0, base.placements.length)).toEqual(
      base.placements,
    );
    const occupied = preview.placements.map((p) => `${p.roomId}:${p.slotId}`);
    expect(new Set(occupied).size).toBe(occupied.length);
    for (const placement of preview.placements) {
      const record = preview.records.find((r) => r.id === placement.recordId)!;
      const media = preview.media.find((m) => m.id === placement.mediaId)!;
      expect(() =>
        validateRecord({ record, media, placement }, preview),
      ).not.toThrow();
    }
  });
  it("blocks editorial publication of local preview images", () => {
    expect(() =>
      validatePublication(createLinsckerPreview(createSeed().published)),
    ).toThrow("prévia local");
  });
  it("opens the preview route during local development", () => {
    expect(pageForPath("/previa/linscker")).toBe("preview");
  });
});
