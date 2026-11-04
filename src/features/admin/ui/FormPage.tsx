import type { ReactNode } from "react";
export function StatusPill({
  tone,
  children,
}: {
  tone: string;
  children: ReactNode;
}) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}
export const UnsavedPill = () => (
  <StatusPill tone="unsaved">Alterações não salvas</StatusPill>
);
// Full-screen form: back link and title on top, actions pinned at the bottom
// on small screens so "Salvar" is always reachable. Enter saves; every other
// button inside must be type="button". Rules are checked by the domain, which
// explains the problem in words, instead of the browser's validation bubbles.
export function FormPage({
  title,
  backLabel,
  onBack,
  badge,
  children,
  busy,
  dirty,
  canSave = true,
  saveLabel = "Salvar",
  onSave,
  onDiscard,
  extraActions,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
  badge?: ReactNode;
  children: ReactNode;
  busy: boolean;
  dirty: boolean;
  canSave?: boolean;
  saveLabel?: string;
  onSave: () => void;
  // Omitted where there is nothing to go back to (new items).
  onDiscard?: () => void;
  extraActions?: ReactNode;
}) {
  return (
    <form
      className="form-page"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && dirty && canSave) onSave();
      }}
    >
      <div className="form-page-header">
        <button type="button" className="back-link" onClick={onBack}>
          ← {backLabel}
        </button>
        <div className="form-page-title">
          <h1>{title}</h1>
          {badge}
        </div>
      </div>
      <div className="form-page-body">
        <fieldset className="form-fields" disabled={busy}>
          {children}
        </fieldset>
      </div>
      <div className="form-actions">
        <button
          type="submit"
          className="primary"
          disabled={busy || !dirty || !canSave}
        >
          {busy ? "Salvando…" : saveLabel}
        </button>
        {extraActions}
        {dirty && onDiscard && (
          <button
            type="button"
            className="link-button"
            disabled={busy}
            onClick={onDiscard}
          >
            Descartar alterações
          </button>
        )}
      </div>
    </form>
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
