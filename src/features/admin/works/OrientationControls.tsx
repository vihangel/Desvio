import type { Vector3 } from "../../../domain/entities";
export const toDegrees = (rad: number) =>
  ((Math.round((rad * 180) / Math.PI) % 360) + 360) % 360;
export const toRadians = (deg: number) =>
  (((deg % 360) + 360) % 360) * (Math.PI / 180);
const axes = [
  { index: 0, label: "Deitar / levantar", step: 90 },
  { index: 1, label: "Girar", step: 45 },
  { index: 2, label: "Tombar de lado", step: 90 },
] as const;
// Quarter turns are easier than typing angles for a file that arrived lying down.
export default function OrientationControls({
  rotation,
  onChange,
}: {
  rotation: Vector3;
  onChange: (rotation: Vector3) => void;
}) {
  const turn = (index: number, degrees: number) => {
    const next = [...rotation] as Vector3;
    next[index] = toRadians(toDegrees(rotation[index]) + degrees);
    onChange(next);
  };
  return (
    <div className="orientation">
      <span className="field-label">Orientação do objeto</span>
      <small className="field-hint">
        Arquivos STL e OBJ às vezes chegam deitados: use “Deitar / levantar” até
        o objeto ficar em pé. Ele continua apoiado no pedestal.
      </small>
      {axes.map((axis) => (
        <div key={axis.index} className="orientation-row">
          <span>{axis.label}</span>
          <button
            type="button"
            className="outline"
            aria-label={`${axis.label} −${axis.step}°`}
            onClick={() => turn(axis.index, -axis.step)}
          >
            ↺ {axis.step}°
          </button>
          <output>{toDegrees(rotation[axis.index])}°</output>
          <button
            type="button"
            className="outline"
            aria-label={`${axis.label} +${axis.step}°`}
            onClick={() => turn(axis.index, axis.step)}
          >
            ↻ {axis.step}°
          </button>
        </div>
      ))}
      <button
        type="button"
        className="link-button"
        onClick={() => onChange([0, 0, 0])}
      >
        Voltar à orientação original
      </button>
    </div>
  );
}
