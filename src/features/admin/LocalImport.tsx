import { useState } from "react";
import type {
  CollectionSnapshot,
  CollectionState,
} from "../../domain/entities";
import type { CollectionRepository } from "../../domain/repository";
export default function LocalImport({
  repository,
  revision,
  load,
  onChange,
}: {
  repository: CollectionRepository;
  revision: number;
  load: () => Promise<CollectionSnapshot>;
  onChange: (state: CollectionState) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  if (!repository.importLocalSnapshot) return null;
  return (
    <details className="editor-feedback local-import">
      <summary>Trazer as edições feitas no modo local deste navegador</summary>
      <p>
        Encontramos um acervo salvo neste navegador (modo demonstrativo).
        Importar substitui as obras salvas no Supabase pelas deste navegador; as
        que estiverem com status Publicada passam a aparecer no site. Imagens
        são enviadas ao Storage; modelos 3D e áudios temporários precisam ser
        reenviados depois.
      </p>
      <button
        className="outline"
        disabled={busy}
        onClick={async () => {
          if (
            !window.confirm(
              "Substituir o acervo salvo no Supabase pelo deste navegador? As obras publicadas dele vão para o site.",
            )
          )
            return;
          setBusy(true);
          try {
            const snapshot = await load();
            const next = await repository.importLocalSnapshot!(
              snapshot,
              revision,
            );
            onChange(next);
            setNotice(
              "Importado. Confira as obras e reenvie arquivos 3D/áudio se preciso.",
            );
          } catch (error) {
            setNotice(
              error instanceof Error ? error.message : "Falha ao importar.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Importando…" : "Importar para o Supabase"}
      </button>
      {notice && <p role="status">{notice}</p>}
    </details>
  );
}
