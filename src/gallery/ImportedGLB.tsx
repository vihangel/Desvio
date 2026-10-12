import { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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
export default function ImportedGLB({ url }: { url: string }) {
  const [object, setObject] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    let owned: THREE.Group | undefined;
    setObject(null);
    setFailed(false);
    new GLTFLoader().load(
      url,
      (gltf) => {
        if (!mounted) {
          disposeModel(gltf.scene);
          return;
        }
        owned = gltf.scene;
        const box = new THREE.Box3().setFromObject(owned);
        const size = box.getSize(new THREE.Vector3());
        owned.position.sub(box.getCenter(new THREE.Vector3()));
        const wrapper = new THREE.Group();
        wrapper.add(owned);
        wrapper.scale.setScalar(1.5 / Math.max(0.01, size.x, size.y, size.z));
        setObject(wrapper);
      },
      undefined,
      () => {
        if (mounted) setFailed(true);
      },
    );
    return () => {
      mounted = false;
      if (owned) disposeModel(owned);
    };
  }, [url]);
  if (failed) throw new Error("Falha ao carregar GLB.");
  return object ? (
    <primitive object={object} position={[0, 1.82, 0]} dispose={null} />
  ) : (
    <mesh position={[0, 1.55, 0]}>
      <icosahedronGeometry args={[0.43, 1]} />
      <meshStandardMaterial color="#a6a69c" wireframe />
    </mesh>
  );
}
