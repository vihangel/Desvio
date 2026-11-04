import { useEffect, useRef } from "react";
const FOCUSABLE =
  "button:not(:disabled),a[href],audio,iframe,input:not(:disabled),select:not(:disabled),textarea:not(:disabled)";
// Modal behaviour shared by every dialog: focus moves in (to `initial`, or the
// dialog itself), Tab stays inside, Esc closes, and focus returns on close.
export function useDialogFocus<T extends HTMLElement>(
  onClose: () => void,
  initial?: (dialog: T) => HTMLElement | null | undefined,
) {
  const dialog = useRef<T>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const firstFocus = useRef(initial);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    (element && firstFocus.current?.(element))?.focus();
    if (element && !element.contains(document.activeElement)) element.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key !== "Tab" || !dialog.current) return;
      const items = dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items.length) return;
      const first = items[0],
        last = items[items.length - 1],
        active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return dialog;
}
