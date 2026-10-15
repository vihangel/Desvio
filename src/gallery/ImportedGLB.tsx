import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { ModelFormat } from "../domain/constants";
import type { Vector3 } from "../domain/entities";
import { useEffect, useMemo, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as THREE from "three";
function disposeModel(model: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    (Array.isArray(node.material) ? node.material : [node.material]).forEach(
      (material) => {
        materials.add(material);
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) textures.add(value);
        });
      },
    );
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
// Fits a model so it rests on its base: rotated around its own center, then
// re-centred and set down at y = 0, about 1.5 m on its longest side.
export function fitModel(model: THREE.Object3D, rotation: Vector3 = [0, 0, 0]) {
  const oriented = new THREE.Group();
  oriented.rotation.set(...rotation);
  // A shallow clone (shared geometry and materials) keeps the loaded model
  // untouched, so fitting again never empties a group already on screen.
  oriented.add(model.clone());
  oriented.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(oriented);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const fitted = new THREE.Group();
  oriented.position.set(-center.x, -box.min.y, -center.z);
  fitted.add(oriented);
  // Kept apart from `scale`, which the renderer overwrites with the final size.
  fitted.userData.fit = 1.5 / Math.max(0.01, size.x, size.y, size.z);
  fitted.scale.setScalar(fitted.userData.fit);
  return fitted;
}
export default function ImportedGLB({
  url,
  baseHeight = 1.04,
  format = "glb",
  rotation = [0, 0, 0],
  scale = 1,
}: {
  url: string;
  format?: ModelFormat;
  baseHeight?: number;
  rotation?: Vector3;
  scale?: number;
}) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    let owned: THREE.Object3D | undefined;
    setModel(null);
    setFailed(false);
    const loaded = (loadedModel: THREE.Object3D) => {
      if (!mounted) {
        disposeModel(loadedModel);
        return;
      }
      owned = loadedModel;
      setModel(loadedModel);
    };
    const failed = () => {
      if (mounted) setFailed(true);
    };
    if (format === "stl")
      new STLLoader().load(
        url,
        (geometry) => {
          geometry.computeVertexNormals();
          const group = new THREE.Group();
          group.add(
            new THREE.Mesh(
              geometry,
              new THREE.MeshStandardMaterial({
                color: "#b67f5c",
                roughness: 0.65,
              }),
            ),
          );
          loaded(group);
        },
        undefined,
        failed,
      );
    else if (format === "obj")
      new OBJLoader().load(url, loaded, undefined, failed);
    else
      // Uploaded models are stored with Meshopt compression.
      new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .load(url, (gltf) => loaded(gltf.scene), undefined, failed);
    return () => {
      mounted = false;
      if (owned) disposeModel(owned);
    };
  }, [url, format]);
  // Orientation changes only re-fit the loaded model; nothing is downloaded.
  const [rx, ry, rz] = rotation;
  const fitted = useMemo(
    () => (model ? fitModel(model, [rx, ry, rz]) : null),
    [model, rx, ry, rz],
  );
  if (failed) throw new Error("Falha ao carregar GLB.");
  return fitted ? (
    <primitive
      object={fitted}
      position={[0, baseHeight, 0]}
      scale={(fitted.userData.fit as number) * scale}
      dispose={null}
    />
  ) : (
    <mesh position={[0, baseHeight + 0.5, 0]}>
      <icosahedronGeometry args={[0.43, 1]} />
      <meshStandardMaterial color="#a6a69c" wireframe />
    </mesh>
  );
}
