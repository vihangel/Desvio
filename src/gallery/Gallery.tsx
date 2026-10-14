import type { GalleryNavigation } from "./types";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import type { Artwork, ExhibitionRoom } from "../domain/entities";
import Scene from "./Scene";
function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    if ("fov" in camera) {
      camera.fov =
        (2 *
          Math.atan(
            Math.tan((50 * Math.PI) / 360) /
              Math.min(1, size.width / size.height),
          ) *
          180) /
        Math.PI;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);
  return null;
}

export default function Gallery(props: {
  onSelect: (a: Artwork) => void;
  onVideoFocus: (art: Artwork, focused: boolean) => void;
  onRoom: (r: number) => void;
  enabled: boolean;
  works: Artwork[];
  rooms: ExhibitionRoom[];
  jumpTo: GalleryNavigation;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      style={{ touchAction: "none" }}
      shadows
      camera={{ fov: 50, near: 0.1, far: 65, position: [0, 1.7, 3.3] }}
    >
      <ResponsiveCamera />
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
