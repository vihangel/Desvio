import { useCallback, useEffect, useRef, useState } from "react";
import type { CollectionState } from "../domain/entities";
import type { CollectionRepository } from "../domain/repository";
export function useCollection(
  repository: CollectionRepository,
  accessKey = "",
) {
  const [state, setState] = useState<CollectionState>();
  const [loadedKey, setLoadedKey] = useState(accessKey);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const request = useRef(0);
  const reload = useCallback(async () => {
    const token = ++request.current;
    setLoading(true);
    setState(undefined);
    setError("");
    try {
      const next = await repository.load();
      if (token === request.current) {
        setState(next);
        setLoadedKey(accessKey);
      }
    } catch (error) {
      if (token === request.current)
        setError(
          error instanceof Error ? error.message : "Falha ao carregar acervo.",
        );
    } finally {
      if (token === request.current) setLoading(false);
    }
  }, [repository, accessKey]);
  useEffect(() => {
    void reload();
    return () => {
      request.current++;
    };
  }, [reload]);
  const recover = async () => {
    try {
      setState(await repository.resetDemo(state?.revision ?? 0));
      setLoadedKey(accessKey);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Falha ao restaurar.");
    }
  };
  return {
    state: loadedKey === accessKey ? state : undefined,
    setState,
    loading,
    error,
    reload,
    recover,
  };
}
