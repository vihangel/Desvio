export default function Wall({
  x,
  y,
  z,
  w,
  h,
  d,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}) {
  return (
    <mesh position={[x, y, z]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color="#ebe7df" roughness={0.93} />
    </mesh>
  );
}
