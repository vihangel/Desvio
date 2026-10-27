import { presentationFor } from "../domain/slots";
import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
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
  // Honour the system's "reduce motion" setting.
  const still = useMemo(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useFrame((_, d) => {
    if (sculpture.current && !still) sculpture.current.rotation.y += d * 0.15;
  });
  const onPedestal = presentationFor(art.placement, art.type) === "pedestal";
  const base = onPedestal ? 1.04 : 0;
  const [sx] = art.placement.scale;
  // The pedestal stays upright and fixed; orientation and size apply to the
  // work alone, which always rests on top of the pedestal (or the floor).
  return (
    <group
      position={art.placement.position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {onPedestal && (
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[1.4, 1.04, 1.4]} />
          <meshStandardMaterial color="#c7c2b8" />
        </mesh>
      )}
      {art.modelUrl ? (
        <ImportedGLB
          url={art.modelUrl}
          format={art.modelFormat}
          baseHeight={base}
          rotation={art.placement.rotation}
          scale={sx}
        />
      ) : art.kind === "Demonstração técnica" && art.rights === "demo" ? (
        <group
          position={[0, base + 0.72 * sx, 0]}
          rotation={art.placement.rotation}
          scale={sx}
        >
          <mesh ref={sculpture} castShadow>
            <torusKnotGeometry args={[0.65, 0.21, 128, 16, 2, 3]} />
            <meshStandardMaterial
              color="#b67f5c"
              roughness={0.34}
              metalness={0.22}
            />
          </mesh>
        </group>
      ) : (
        <Html center position={[0, 1.5, 0]}>
          <span className="missing-model">
            Modelo 3D indisponível. Reenvie o arquivo no editor.
          </span>
        </Html>
      )}
    </group>
  );
}
