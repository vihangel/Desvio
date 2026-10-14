import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { ModelFormat } from "../domain/constants";
import { useEffect, useState } from "react";
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
export default function ImportedGLB({
  url,
  baseHeight = 1.04,
  format = "glb",
}: {
  url: string;
  format?: ModelFormat;
  baseHeight?: number;
}) {
  const [object, setObject] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    let owned: THREE.Group | undefined;
    setObject(null);
    setFailed(false);
    const loaded = (model: THREE.Group) => {
      if (!mounted) {
        disposeModel(model);
        return;
      }
      owned = model;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
      const wrapper = new THREE.Group();
      wrapper.add(model);
      wrapper.scale.setScalar(1.5 / Math.max(0.01, size.x, size.y, size.z));
      setObject(wrapper);
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
  if (failed) throw new Error("Falha ao carregar GLB.");
  return object ? (
    <primitive object={object} position={[0, baseHeight, 0]} dispose={null} />
  ) : (
    <mesh position={[0, baseHeight + 0.5, 0]}>
      <icosahedronGeometry args={[0.43, 1]} />
      <meshStandardMaterial color="#a6a69c" wireframe />
    </mesh>
  );
}
