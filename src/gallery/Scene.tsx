import VideoArtwork from "./VideoArtwork";
import type { GalleryNavigation } from "./types";
import { Suspense } from "react";
import { Text, Html } from "@react-three/drei";
import type { Artwork, ExhibitionRoom } from "../domain/entities";
import Player from "./Player";
import Painting from "./Painting";
import Sculpture from "./Sculpture";
import Wall from "./Wall";
import AssetBoundary from "./AssetBoundary";
export default function Scene({
  onSelect,
  onVideoFocus,
  onRoom,
  enabled,
  works,
  jumpTo,
  rooms,
}: {
  onSelect: (a: Artwork) => void;
  onVideoFocus: (art: Artwork, focused: boolean) => void;
  onRoom: (r: number) => void;
  enabled: boolean;
  works: Artwork[];
  rooms: ExhibitionRoom[];
  jumpTo: GalleryNavigation;
}) {
  return (
    <>
      <color attach="background" args={["#dfdad0"]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight intensity={1.1} />
      <directionalLight position={[3, 7, 2]} intensity={1.8} castShadow />
      <Player
        roomCount={rooms.length}
        enabled={enabled}
        onRoom={onRoom}
        jumpTo={jumpTo}
      />
      {rooms.map((room, i) => {
        const z = -room.order * 12;
        return (
          <group key={room.id}>
            <mesh position={[0, -0.13, z]} receiveShadow>
              <boxGeometry args={[10, 0.25, 12]} />
              <meshStandardMaterial color={i === 1 ? "#beb3a2" : "#d2c7b5"} />
            </mesh>
            <Wall x={-5} y={2} z={z} w={0.2} h={4} d={12} />
            <Wall x={5} y={2} z={z} w={0.2} h={4} d={12} />
            <Wall x={0} y={4} z={z} w={10} h={0.14} d={12} />
            <Text position={[0, 3, z - 5.75]} fontSize={0.3} color="#585047">
              {room.name.toUpperCase()}
            </Text>
            {[-3, 0, 3].map((x) => (
              <group key={x}>
                <pointLight
                  position={[x, 3.65, z]}
                  intensity={17}
                  distance={7}
                  color="#fff1d9"
                />
                <mesh position={[x, 3.92, z]} rotation={[Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[1.5, 1]} />
                  <meshBasicMaterial color="#fff7e8" />
                </mesh>
              </group>
            ))}
            {works
              .filter((a) => a.roomId === room.id)
              .map((a) => (
                <AssetBoundary
                  key={a.id + ":" + (a.image || a.modelUrl || "")}
                  position={a.placement.position}
                >
                  <Suspense
                    fallback={
                      <Html position={a.placement.position}>
                        <span>Carregando…</span>
                      </Html>
                    }
                  >
                    {a.type === "video" && a.videoUrl ? (
                      <VideoArtwork
                        art={a}
                        onVideoFocus={onVideoFocus}
                        enabled={enabled}
                        onSelect={onSelect}
                      />
                    ) : a.type === "image" && a.image ? (
                      <Painting
                        art={a}
                        onSelect={onSelect}
                        densityScale={Math.min(1, 3 / (room.wallSlots ?? 3))}
                      />
                    ) : (
                      <Sculpture art={a} onClick={() => onSelect(a)} />
                    )}
                  </Suspense>
                </AssetBoundary>
              ))}
          </group>
        );
      })}
      {Array.from(
        { length: Math.max(0, rooms.length - 1) },
        (_, i) => -6 - i * 12,
      ).map((z) => (
        <group key={z}>
          <Wall x={-3.35} y={2} z={z} w={3.3} h={4} d={0.22} />
          <Wall x={3.35} y={2} z={z} w={3.3} h={4} d={0.22} />
          <Wall x={0} y={3.55} z={z} w={3.4} h={0.9} d={0.22} />
        </group>
      ))}
      <Wall x={0} y={2} z={6} w={10} h={4} d={0.2} />
      <Wall x={0} y={2} z={6 - rooms.length * 12} w={10} h={4} d={0.2} />
    </>
  );
}
