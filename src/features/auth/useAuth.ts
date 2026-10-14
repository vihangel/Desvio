import { useEffect, useState } from "react";
import type { AuthService } from "../../domain/auth";
export function useAuth(service: AuthService | undefined) {
  const [state, setState] = useState({
    userId: "",
    email: "",
    editor: false,
    loading: !!service,
    error: "",
  });
  useEffect(() => {
    if (!service) return;
    let active = true;
    let request = 0;
    // Keep the current identity while revalidating: flipping `editor` off on
    // every session event unmounted the admin and discarded unsaved edits.
    const refresh = async () => {
      const token = ++request;
      try {
        const next = await service.current();
        if (active && token === request)
          setState((s) =>
            s.userId === next.userId &&
            s.editor === next.editor &&
            s.email === next.email &&
            !s.loading &&
            !s.error
              ? s
              : { ...s, ...next, loading: false, error: "" },
          );
      } catch (error) {
        if (active && token === request)
          setState((s) => ({
            ...s,
            userId: "",
            email: "",
            editor: false,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Falha ao conferir acesso.",
          }));
      }
    };
    void refresh();
    const unsubscribe = service.subscribe((event) => {
      if (event !== "refreshed") void refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [service]);
  return state;
}
