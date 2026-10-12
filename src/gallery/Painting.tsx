import { fitImage } from "./imageDimensions";
import { Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Artwork } from "../domain/entities";
export default function Painting({
  art,
  onSelect,
}: {
  art: Artwork;
  onSelect: (a: Artwork) => void;
}) {
  const texture = useTexture(art.image!);
  const { width, height } = fitImage(texture.image);
  return (
    <group
      position={art.placement.position}
      rotation={art.placement.rotation}
      scale={Math.min(...art.placement.scale)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(art);
      }}
    >
      <mesh position={[0, 0, -0.075]} castShadow>
        <boxGeometry args={[2.03, 2.52, 0.13]} />
        <meshStandardMaterial color="#8c715a" />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <Text
        fontSize={0.11}
        position={[0, -1.48, 0.09]}
        color="#413d37"
        maxWidth={2}
      >
        {art.title}
      </Text>
    </group>
  );
}
