import { expect, it } from "vitest";
import { fitImage } from "../src/gallery/imageDimensions";
it("preserves the catalogue image aspect ratio within the frame", () => {
  const size = fitImage({ width: 270, height: 295 });
  expect(size.width / size.height).toBeCloseTo(270 / 295);
  expect(size.width).toBeLessThanOrEqual(1.88);
  expect(size.height).toBeLessThanOrEqual(2.37);
});
it("keeps dimensionless SVG editorial panels visible", () => {
  const size = fitImage({ width: 0, height: 0 });
  expect(size.width).toBeGreaterThan(0);
  expect(size.height).toBeGreaterThan(0);
  expect(Number.isFinite(size.height)).toBe(true);
});
