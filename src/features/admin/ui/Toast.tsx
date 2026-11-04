import { useEffect } from "react";
import type { Notice } from "../useNotice";
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
      <button type="button" aria-label="Fechar aviso" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
