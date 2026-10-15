import { useEffect, useState } from "react";
import type { AuthIdentity, AuthService } from "../../domain/auth";
export function useAuth(service: AuthService | undefined) {
  const [state, setState] = useState({
    userId: "",
    email: "",
    editor: false,
    role: null as AuthIdentity["role"],
    artistId: null as string | null,
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
            s.role === next.role &&
            s.artistId === next.artistId &&
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
            role: null,
            artistId: null,
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
