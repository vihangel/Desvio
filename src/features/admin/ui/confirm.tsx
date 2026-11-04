import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "../../../shared/useDialogFocus";

export type ConfirmRequest = {
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
function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest;
  onClose: (ok: boolean) => void;
}) {
  const dialog = useDialogFocus<HTMLDivElement>(
    () => onClose(false),
    (element) => element.querySelector<HTMLElement>("[data-confirm]"),
  );
  return createPortal(
    <div className="scrim confirm-scrim" onClick={() => onClose(false)}>
      <div
        ref={dialog}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title">{request.title}</h2>
        {request.body && <div className="confirm-body">{request.body}</div>}
        <div className="confirm-actions">
          <button
            type="button"
            className="outline"
            onClick={() => onClose(false)}
          >
            {request.cancelLabel ?? "Cancelar"}
          </button>
          <button
            type="button"
            data-confirm
            className={request.tone === "danger" ? "danger-solid" : "primary"}
            onClick={() => onClose(true)}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
// One accessible dialog for every destructive or discarding action.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<
    ConfirmRequest & { resolve: (ok: boolean) => void }
  >();
  const confirm = useCallback(
    (next: ConfirmRequest) =>
      new Promise<boolean>((resolve) => setRequest({ ...next, resolve })),
    [],
  );
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <ConfirmDialog
          request={request}
          onClose={(ok) => {
            request.resolve(ok);
            setRequest(undefined);
          }}
        />
      )}
    </ConfirmContext.Provider>
  );
}
