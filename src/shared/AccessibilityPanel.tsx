import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { preferences, usePreferences, type TextSize } from "./preferences";
const sizes: [TextSize, string][] = [
  ["normal", "Normal"],
  ["large", "Grande"],
  ["xlarge", "Muito grande"],
];
function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="a11y-toggle">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <b>{label}</b>
        <small>{hint}</small>
      </span>
    </label>
  );
}
export default function AccessibilityPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const prefs = usePreferences();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items =
        panel.current.querySelectorAll<HTMLElement>("button, input");
      const first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return createPortal(
    <div className="scrim" onClick={onClose}>
      <div
        ref={panel}
        className="a11y-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a11y-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="a11y-panel-header">
          <h2 id="a11y-title">Acessibilidade</h2>
          <button className="dismiss" aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </div>
        <fieldset className="a11y-sizes">
          <legend>Tamanho do texto</legend>
          <div>
            {sizes.map(([size, label]) => (
              <label
                key={size}
                className={prefs.textSize === size ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="text-size"
                  checked={prefs.textSize === size}
                  onChange={() => preferences.set({ textSize: size })}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Toggle
          label="Alto contraste"
          hint="Fundo branco, texto preto e bordas reforçadas."
          checked={prefs.highContrast}
          onChange={(highContrast) => preferences.set({ highContrast })}
        />
        <Toggle
          label="Leitura facilitada"
          hint="Mais espaço entre letras e linhas, e links sublinhados."
          checked={prefs.easyReading}
          onChange={(easyReading) => preferences.set({ easyReading })}
        />
        <Toggle
          label="Som no museu 3D"
          hint="Os vídeos começam sem som. Ligue para ouvir ao ficar de frente para eles."
          checked={prefs.sound}
          onChange={(sound) => preferences.set({ sound })}
        />
        <Toggle
          label="Tradução em Libras (VLibras)"
          hint="Mostra o tradutor de Libras do Governo Federal. Ele é carregado de vlibras.gov.br."
          checked={prefs.libras}
          onChange={(libras) => preferences.set({ libras })}
        />
        <button className="link-button" onClick={() => preferences.reset()}>
          Voltar ao padrão
        </button>
      </div>
    </div>,
    document.body,
  );
}
