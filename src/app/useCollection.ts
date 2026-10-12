import { useCallback, useEffect, useState } from "react";
import type { CollectionState } from "../domain/entities";
import type { CollectionRepository } from "../domain/repository";
export function useCollection(repository: CollectionRepository) {
  const [state, setState] = useState<CollectionState>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setState(await repository.load());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar o acervo.");
    } finally {
      setLoading(false);
    }
  }, [repository]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const recover = async () => {
    try {
      setState(await repository.resetDemo(state?.revision ?? 0));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao restaurar.");
    }
  };
  return { state, setState, loading, error, reload, recover };
}
