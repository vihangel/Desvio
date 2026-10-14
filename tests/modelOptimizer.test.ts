import { describe, expect, it } from "vitest";
import { Document, NodeIO } from "@gltf-transform/core";
import { optimizeModel } from "../src/infrastructure/media/modelOptimizer";
import { optimizeForUpload } from "../src/features/admin/modelUpload";
import { validateGlb } from "../src/domain/uploadValidation";
import type {
  ModelOptimization,
  ModelOptimizationOptions,
} from "../src/domain/media";
// A dense grid: many duplicated vertices and enough triangles to simplify.
async function gridGlb(size = 120) {
  const document = new Document();
  const buffer = document.createBuffer();
  const positions: number[] = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const z = Math.sin(x / 9) * Math.cos(y / 11) * 0.2;
      const quad = [
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y],
        [x + 1, y + 1],
        [x, y + 1],
      ];
      for (const [qx, qy] of quad) positions.push(qx / size, qy / size, z);
    }
  const accessor = document
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array(positions))
    .setBuffer(buffer);
  const primitive = document
    .createPrimitive()
    .setAttribute("POSITION", accessor);
  const mesh = document.createMesh().addPrimitive(primitive);
  document.createScene().addChild(document.createNode().setMesh(mesh));
  return new NodeIO().writeBinary(document);
}
const source = (bytes: Uint8Array, name = "obra.glb") => ({
  name,
  type: "model/gltf-binary",
  size: bytes.byteLength,
  arrayBuffer: async () => bytes.slice().buffer as ArrayBuffer,
});
describe("model optimizer", () => {
  it("compresses a GLB with Meshopt and keeps it a valid embedded GLB", async () => {
    const input = await gridGlb();
    const result = await optimizeModel(source(input));
    const output = await result.file.arrayBuffer();
    expect(result.file.name).toBe("obra.glb");
    expect(output.byteLength).toBeLessThan(input.byteLength / 3);
    expect(() => validateGlb(output)).not.toThrow();
    expect(new TextDecoder().decode(output.slice(0, 2000))).toContain(
      "EXT_meshopt_compression",
    );
    expect(result.triangles).toBe(120 * 120 * 2);
  });
  it("reduces triangles only when simplification is requested", async () => {
    const input = await gridGlb();
    const plain = await optimizeModel(source(input));
    const simplified = await optimizeModel(source(input), { simplify: 0.25 });
    expect(plain.optimizedTriangles).toBe(plain.triangles);
    expect(simplified.optimizedTriangles).toBeLessThan(plain.triangles / 2);
  });
  it("rejects files that are not 3D models", async () => {
    await expect(
      optimizeModel(source(new Uint8Array(64), "obra.glb")),
    ).rejects.toThrow();
  });
});
describe("upload escalation", () => {
  const fake =
    (sizes: (o: ModelOptimizationOptions) => number, triangles = 1000) =>
    async (options: ModelOptimizationOptions): Promise<ModelOptimization> => ({
      file: {
        name: "m.glb",
        type: "model/gltf-binary",
        size: sizes(options),
        arrayBuffer: async () => new ArrayBuffer(0),
      },
      originalSize: 90_000_000,
      triangles,
      optimizedTriangles: options.simplify
        ? Math.round(triangles * options.simplify)
        : triangles,
    });
  const file = {
    name: "m.glb",
    type: "",
    size: 90_000_000,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
  it("shrinks textures before asking to simplify", async () => {
    const calls: ModelOptimizationOptions[] = [];
    const result = await optimizeForUpload(
      file,
      24_000_000,
      (o) => {
        calls.push(o);
        return fake((o) => (o.maxTextureSize === 1024 ? 9e6 : 30e6))(o);
      },
      () => {},
      () => {
        throw new Error("should not ask");
      },
    );
    expect(result.file.size).toBe(9e6);
    expect(calls).toEqual([{}, { maxTextureSize: 1024 }]);
  });
  it("asks before simplifying and fails clearly if refused", async () => {
    const optimize = fake((o) => (o.simplify ? 20e6 : 40e6));
    await expect(
      optimizeForUpload(
        file,
        24e6,
        optimize,
        () => {},
        () => false,
      ),
    ).rejects.toThrow("Simplifique");
    const result = await optimizeForUpload(
      file,
      24e6,
      optimize,
      () => {},
      () => true,
    );
    expect(result.file.size).toBe(20e6);
  });
  it("offers simplification for very dense models that already fit", async () => {
    let asked = false;
    const result = await optimizeForUpload(
      file,
      24e6,
      fake(() => 5e6, 4_000_000),
      () => {},
      () => (asked = true),
    );
    expect(asked).toBe(true);
    expect(result.optimizedTriangles).toBeLessThanOrEqual(1_500_000);
  });
});
