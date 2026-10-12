import { useEffect, useState } from "react";
import { mobileInput } from "../../gallery/mobileControls";
export default function MobileJoystick({ disabled }: { disabled: boolean }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(
    () => () => {
      mobileInput.forward = 0;
      mobileInput.strafe = 0;
    },
    [],
  );
  useEffect(() => {
    if (disabled) {
      mobileInput.forward = 0;
      mobileInput.strafe = 0;
      setPosition({ x: 0, y: 0 });
    }
  }, [disabled]);
  const reset = () => {
    mobileInput.forward = 0;
    mobileInput.strafe = 0;
    setPosition({ x: 0, y: 0 });
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const box = e.currentTarget.getBoundingClientRect();
    const radius = box.width * 0.34;
    const x = Math.max(
      -1,
      Math.min(1, (e.clientX - (box.left + box.width / 2)) / radius),
    );
    const y = Math.max(
      -1,
      Math.min(1, (e.clientY - (box.top + box.height / 2)) / radius),
    );
    const length = Math.max(1, Math.hypot(x, y));
    mobileInput.strafe = x / length;
    mobileInput.forward = -y / length;
    setPosition({ x: x / length, y: y / length });
  };
  return (
    <div className="mobile-controls">
      <div
        className="joystick"
        aria-label="Controle de movimentação"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons) move(e);
        }}
        onPointerUp={reset}
        onPointerCancel={reset}
      >
        <div
          className="joystick-stick"
          style={{
            transform: `translate(calc(-50% + ${position.x * 35}px),calc(-50% + ${position.y * 35}px))`,
          }}
        />
      </div>
      <span className="look-hint">Arraste à direita para olhar</span>
    </div>
  );
}
