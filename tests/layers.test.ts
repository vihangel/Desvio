import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(directory, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(directory, entry.name)]
        : [],
  );
}
it("keeps domain independent from UI, storage and SDKs", () => {
  for (const file of sources("src/domain")) {
    expect(readFileSync(file, "utf8"), file).not.toMatch(
      /from\s+["'](?:react|three|@supabase|.*infrastructure|.*features)|\b(?:window|localStorage|sessionStorage)\b/,
    );
  }
});
it("keeps pages and the gallery away from persistence adapters", () => {
  for (const file of [...sources("src/features"), ...sources("src/gallery")]) {
    expect(readFileSync(file, "utf8"), file).not.toMatch(
      /from\s+["'][^"']*infrastructure|\b(?:localStorage|sessionStorage)\b/,
    );
  }
});
