import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Notice } from "./useAdminEditor";

type ConfirmRequest = {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};
const ConfirmContext = createContext<
  (request: ConfirmRequest) => Promise<boolean>
>(async () => false);
export const useConfirm = () => useContext(ConfirmContext);
// One accessible dialog for every destructive or discarding action.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<
    ConfirmRequest & { resolve: (ok: boolean) => void }
  >();
  const confirmButton = useRef<HTMLButtonElement>(null);
  const confirm = useCallback(
    (next: ConfirmRequest) =>
      new Promise<boolean>((resolve) => setRequest({ ...next, resolve })),
    [],
  );
  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(undefined);
  };
  useEffect(() => {
    if (!request) return;
    const previous = document.activeElement as HTMLElement | null;
    confirmButton.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [request]);
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request &&
        createPortal(
          <div className="scrim confirm-scrim" onClick={() => close(false)}>
            <div
              className="confirm-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="confirm-title">{request.title}</h2>
              {request.body && (
                <div className="confirm-body">{request.body}</div>
              )}
              <div className="confirm-actions">
                <button className="outline" onClick={() => close(false)}>
                  {request.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  ref={confirmButton}
                  className={
                    request.tone === "danger" ? "danger-solid" : "primary"
                  }
                  onClick={() => close(true)}
                >
                  {request.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  );
}

// Success and progress fade out; errors stay until dismissed.
export function Toast({
  notice,
  onDismiss,
}: {
  notice: Notice | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!notice || notice.kind === "error") return;
    const timer = window.setTimeout(
      onDismiss,
      notice.kind === "success" ? 5000 : 15000,
    );
    return () => window.clearTimeout(timer);
  }, [notice, onDismiss]);
  if (!notice) return null;
  return (
    <div
      className={`admin-toast toast-${notice.kind}`}
      role={notice.kind === "error" ? "alert" : "status"}
    >
      <span>{notice.text}</span>
      <button aria-label="Fechar aviso" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}

// Full-screen form: back link and title on top, actions pinned at the bottom
// on small screens so "Salvar" is always reachable.
export function FormPage({
  title,
  backLabel,
  onBack,
  badge,
  children,
  actions,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
  badge?: ReactNode;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="form-page">
      <div className="form-page-header">
        <button className="back-link" onClick={onBack}>
          ← {backLabel}
        </button>
        <div className="form-page-title">
          <h1>{title}</h1>
          {badge}
        </div>
      </div>
      <div className="form-page-body">{children}</div>
      <div className="form-actions">{actions}</div>
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  tone,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  tone?: "danger";
}) {
  return (
    <section
      className={
        tone === "danger" ? "form-section danger-zone" : "form-section"
      }
    >
      <h2>{title}</h2>
      {description && <p className="section-description">{description}</p>}
      {children}
    </section>
  );
}

// A label with its control and the help text right below the control.
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

// Multiple choice that works with thumbs: checkboxes instead of <select multiple>.
export function CheckboxList({
  legend,
  options,
  value,
  onChange,
  hint,
}: {
  legend: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  hint?: ReactNode;
}) {
  return (
    <fieldset className="checkbox-list">
      <legend className="field-label">{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, option.value]
                    : value.filter((v) => v !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint && <small className="field-hint">{hint}</small>}
    </fieldset>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: string;
  children: ReactNode;
}) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}
