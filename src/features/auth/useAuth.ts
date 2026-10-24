import { useEffect, useRef, useState } from "react";
const OFFLINE =
  "Não foi possível falar com o servidor. Verifique a conexão e tente de novo.";
// Browsers report a dropped connection as a bare "Failed to fetch".
const friendly = (error: unknown) =>
  error instanceof TypeError || /fetch|network|load failed/i.test(String(error))
    ? OFFLINE
    : error instanceof Error
      ? error.message
      : "Falha ao conferir acesso.";
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
  const retry = useRef<() => void>(() => {});
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
        // A failed check (often a dropped connection) keeps whoever was
        // signed in; the next successful check settles the identity.
        if (active && token === request)
          setState((s) => ({ ...s, loading: false, error: friendly(error) }));
      }
    };
    retry.current = () => void refresh();
    void refresh();
    const unsubscribe = service.subscribe((event) => {
      if (event !== "refreshed") void refresh();
    });
    // Check again as soon as the connection comes back.
    const online = () => void refresh();
    window.addEventListener("online", online);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("online", online);
    };
  }, [service]);
  return { ...state, retry: () => retry.current() };
}
