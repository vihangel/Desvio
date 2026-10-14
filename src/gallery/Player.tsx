import type { GalleryNavigation } from "./types";
import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mobileInput } from "./mobileControls";
export default function Player({
  enabled,
  onRoom,
  jumpTo,
  roomCount,
}: {
  roomCount: number;
  enabled: boolean;
  onRoom: (room: number) => void;
  jumpTo: GalleryNavigation;
}) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0),
    pitch = useRef(0);
  const look = useRef(false);
  const lastRoom = useRef(-1);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const activePointer = useRef<number | null>(null);
  let previousX = 0,
    previousY = 0;
  useEffect(() => {
    camera.position.set(0, 1.7, 3.3);
    camera.rotation.order = "YXZ";
    const kd = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code)
      ) {
        e.preventDefault();
        keys.current[e.code] = true;
      }
    };
    const ku = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const down = (e: PointerEvent) => {
      if (!enabledRef.current) return;
      if (e.pointerType === "touch" && e.clientX < window.innerWidth * 0.42)
        return;
      if (e.target === gl.domElement) {
        look.current = true;
        activePointer.current = e.pointerId;
        previousX = e.clientX;
        previousY = e.clientY;
        gl.domElement.setPointerCapture?.(e.pointerId);
      }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === activePointer.current) {
        look.current = false;
        activePointer.current = null;
      }
    };
    const move = (e: PointerEvent) => {
      if (!enabledRef.current) return;
      if (!look.current || e.pointerId !== activePointer.current) return;
      const dx = e.clientX - previousX,
        dy = e.clientY - previousY;
      previousX = e.clientX;
      previousY = e.clientY;
      yaw.current -= dx * 0.004;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - dy * 0.004,
        -1.2,
        1.2,
      );
    };
    const blur = () => {
      keys.current = {};
      look.current = false;
      activePointer.current = null;
      mobileInput.forward = 0;
      mobileInput.strafe = 0;
    };
    window.addEventListener("blur", blur);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    gl.domElement.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    gl.domElement.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("blur", blur);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      gl.domElement.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      gl.domElement.removeEventListener("pointermove", move);
    };
  }, [camera, gl]);
  useEffect(() => {
    if (jumpTo.focus) {
      const placement = jumpTo.focus;
      const normal = new THREE.Vector3(0, 0, 1).applyEuler(
        new THREE.Euler(...placement.rotation),
      );
      camera.position.fromArray(placement.position).addScaledVector(normal, 3);
      camera.position.y = 1.7;
      camera.lookAt(new THREE.Vector3(...placement.position));
      yaw.current = camera.rotation.y;
      pitch.current = camera.rotation.x;
    } else camera.position.set(0, 1.7, 3.3 - 12 * jumpTo.room);
  }, [camera, jumpTo.room, jumpTo.version, jumpTo.focus]);
  useFrame((_, delta) => {
    if (!enabled) {
      keys.current = {};
      look.current = false;
      mobileInput.forward = 0;
      mobileInput.strafe = 0;
      return;
    }
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    if (enabled) {
      const f = new THREE.Vector3();
      camera.getWorldDirection(f);
      f.y = 0;
      f.normalize();
      const s = new THREE.Vector3()
        .crossVectors(f, new THREE.Vector3(0, 1, 0))
        .normalize();
      const d = new THREE.Vector3();
      if (keys.current.KeyW || keys.current.ArrowUp) d.add(f);
      if (keys.current.KeyS || keys.current.ArrowDown) d.sub(f);
      if (keys.current.KeyA || keys.current.ArrowLeft) d.sub(s);
      if (keys.current.KeyD || keys.current.ArrowRight) d.add(s);
      d.addScaledVector(f, mobileInput.forward);
      d.addScaledVector(s, mobileInput.strafe);
      if (d.lengthSq()) {
        d.normalize().multiplyScalar(Math.min(delta, 0.05) * 3.2);
        const p = camera.position.clone().add(d);
        p.x = THREE.MathUtils.clamp(p.x, -4.65, 4.65);
        p.z = THREE.MathUtils.clamp(p.z, 6 - roomCount * 12 + 0.25, 5.7);
        if (
          Array.from({ length: roomCount - 1 }, (_, i) => -6 - i * 12).some(
            (z) =>
              (camera.position.z > z && p.z <= z) ||
              (camera.position.z < z && p.z >= z),
          )
        ) {
          if (Math.abs(p.x) > 1.55) p.z = camera.position.z;
        }
        camera.position.copy(p);
      }
    }
    camera.position.y = 1.7;
    const room = THREE.MathUtils.clamp(
      Math.floor((6 - camera.position.z) / 12),
      0,
      roomCount - 1,
    );
    if (lastRoom.current !== room) {
      lastRoom.current = room;
      onRoom(room);
    }
  });
  return null;
}
