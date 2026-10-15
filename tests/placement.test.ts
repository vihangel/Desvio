import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createSeed } from "../src/infrastructure/local/seed";
import { selectRecordDraft } from "../src/domain/selectors";
import { validateRecord } from "../src/domain/validation";
import { fitModel } from "../src/gallery/ImportedGLB";
describe("placement validation", () => {
  const { draft } = createSeed();
  const model = draft.records.find((r) => r.kind === "Demonstração técnica")!;
  const base = () => selectRecordDraft(draft, model.id);
  it("accepts any orientation for 3D works", () => {
    const work = base();
    work.placement.rotation = [(270 * Math.PI) / 180, 0, 0];
    expect(() => validateRecord(work, draft)).not.toThrow();
  });
  it("names the field, its range and the current value", () => {
    const work = base();
    work.placement.position = [6, 0, work.placement.position[2]];
    expect(() => validateRecord(work, draft)).toThrow(/Lateral.*4,8.*está 6/);
    const deep = base();
    deep.placement.position = [0, 0, deep.placement.position[2] - 10];
    expect(() => validateRecord(deep, draft)).toThrow(/Profundidade.*5,7/);
    const big = base();
    big.placement.scale = [5, 5, 5];
    expect(() => validateRecord(big, draft)).toThrow(/Tamanho.*0,1 e 4/);
  });
});
describe("fitting a model on its base", () => {
  it("stands a lying model up around its own centre and rests it at y = 0", () => {
    // A tall shape lying along Z, far from the origin, as STL files often are.
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 2));
    mesh.position.set(5, 3, -4);
    const fitted = fitModel(new THREE.Group().add(mesh), [-Math.PI / 2, 0, 0]);
    fitted.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fitted);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    expect(box.min.y).toBeCloseTo(0, 5);
    expect(size.y).toBeCloseTo(1.5, 5);
    expect(size.x).toBeCloseTo(0.15, 5);
    expect(center.x).toBeCloseTo(0, 5);
    expect(center.z).toBeCloseTo(0, 5);
  });
});
