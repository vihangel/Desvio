import { useEffect, useState } from "react";
import type { CollectionSnapshot } from "../domain/entities";
import { loadLinsckerPreview } from "./services";
export function useDemoMontage(
  published: CollectionSnapshot | undefined,
  enabled: boolean,
) {
  const [overlay, setOverlay] = useState<{
    base: CollectionSnapshot;
    snapshot: CollectionSnapshot;
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!published || !enabled) return;
    let active = true;
    setError("");
    void loadLinsckerPreview(published).then(
      (snapshot) => {
        if (active) setOverlay({ base: published, snapshot });
      },
      (error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "Falha ao carregar montagem.",
          );
      },
    );
    return () => {
      active = false;
    };
  }, [published, enabled]);
  return {
    snapshot:
      enabled && overlay?.base === published && overlay
        ? overlay.snapshot
        : published,
    error,
  };
}
