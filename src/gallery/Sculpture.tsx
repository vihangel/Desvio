import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Artwork } from "../domain/entities";
import ImportedGLB from "./ImportedGLB";
export default function Sculpture({
  art,
  onClick,
}: {
  art: Artwork;
  onClick: () => void;
}) {
  const sculpture = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (sculpture.current) sculpture.current.rotation.y += d * 0.15;
  });
  return (
    <group
      position={art.placement.position}
      rotation={art.placement.rotation}
      scale={art.placement.scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[1.4, 1.04, 1.4]} />
        <meshStandardMaterial color="#c7c2b8" />
      </mesh>
      {art.modelUrl ? (
        <ImportedGLB url={art.modelUrl} />
      ) : (
        <mesh position={[0, 1.76, 0]} ref={sculpture} castShadow>
          <torusKnotGeometry args={[0.65, 0.21, 128, 16, 2, 3]} />
          <meshStandardMaterial
            color="#b67f5c"
            roughness={0.34}
            metalness={0.22}
          />
        </mesh>
      )}
    </group>
  );
}
