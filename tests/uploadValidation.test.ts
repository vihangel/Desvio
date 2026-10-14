import { expect, it } from "vitest";
import { validateGlb, validateImage } from "../src/domain/uploadValidation";
function glb(json: unknown) {
  const text = JSON.stringify(json);
  const padded = text.padEnd(Math.ceil(text.length / 4) * 4, " ");
  const bytes = new ArrayBuffer(20 + padded.length);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, padded.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(bytes, 20).set(new TextEncoder().encode(padded));
  return bytes;
}
it("accepts a self-contained GLB and rejects malformed or external assets", () => {
  expect(() =>
    validateGlb(glb({ asset: { version: "2.0" }, scenes: [] })),
  ).not.toThrow();
  expect(() => validateGlb(new ArrayBuffer(4))).toThrow("GLB");
  expect(() =>
    validateGlb(
      glb({
        asset: { version: "2.0" },
        images: [{ uri: "https://external.example/texture.png" }],
      }),
    ),
  ).toThrow("incorporados");
});
it("checks image bytes instead of trusting file MIME", () => {
  expect(() =>
    validateImage(new TextEncoder().encode("fake").buffer, "image/png"),
  ).toThrow("conteúdo");
  expect(() =>
    validateImage(new Uint8Array([255, 216, 255, 224]).buffer, "image/jpeg"),
  ).not.toThrow();
});
