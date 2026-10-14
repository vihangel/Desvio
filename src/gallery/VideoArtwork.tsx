import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import * as THREE from "three";
import type { Artwork } from "../domain/entities";
import YouTubeVideo from "../shared/YouTubeVideo";
export default function VideoArtwork({
  art,
  enabled,
  onSelect,
  onVideoFocus,
}: {
  onVideoFocus: (art: Artwork, focused: boolean) => void;
  art: Artwork;
  enabled: boolean;
  onSelect: (art: Artwork) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [visited, setVisited] = useState(false);
  const state = useRef(false);
  const elapsed = useRef(0);
  const artwork = useRef(art);
  artwork.current = art;
  useEffect(
    () => () => onVideoFocus(artwork.current, false),
    [art.id, onVideoFocus],
  );
  useFrame(({ camera }, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.2) return;
    elapsed.current = 0;
    const target = new THREE.Vector3(...art.placement.position);
    const toward = target.clone().sub(camera.position);
    const distance = toward.length();
    const view = camera.getWorldDirection(new THREE.Vector3());
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(
      new THREE.Euler(...art.placement.rotation),
    );
    const next =
      enabled &&
      distance < 5 &&
      view.dot(toward.normalize()) > 0.94 &&
      normal.dot(camera.position.clone().sub(target).normalize()) > 0.6;
    if (next !== state.current) {
      state.current = next;
      setFocused(next);
      onVideoFocus(art, next);
      if (next) setVisited(true);
    }
  });
  return (
    <group
      position={art.placement.position}
      rotation={art.placement.rotation}
      scale={Math.min(...art.placement.scale)}
    >
      <mesh
        position={[0, 0, -0.075]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(art);
        }}
      >
        <boxGeometry args={[2.1, 1.5, 0.13]} />
        <meshStandardMaterial color="#161616" />
      </mesh>
      {/* Hidden while a dialog is open: drei puts Html above everything by
          default, which made the scene player cover the dialog's player. */}
      {visited && enabled && (
        <Html
          transform
          occlude
          zIndexRange={[1, 0]}
          position={[0, 0, 0.035]}
          distanceFactor={1}
          style={{ pointerEvents: "none" }}
        >
          <div className="scene-video-preview" inert style={{ width: 640 }}>
            <YouTubeVideo
              url={art.videoUrl!}
              title={art.title}
              active={focused}
            />
          </div>
        </Html>
      )}
      <Text
        position={[0, -1, 0]}
        fontSize={0.11}
        maxWidth={2}
        color="#413d37"
        onClick={() => onSelect(art)}
      >
        {art.title}
      </Text>
      {!visited && (
        <Text
          position={[0, 0, 0.04]}
          fontSize={0.16}
          color="#fff"
          onClick={() => onSelect(art)}
        >
          Vídeo · aproxime-se de frente
        </Text>
      )}
    </group>
  );
}
