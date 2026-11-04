import { useState } from "react";
import type {
  CollectionSnapshot,
  CollectionState,
} from "../../domain/entities";
import { errorMessage } from "../../domain/errors";
import type { CollectionRepository } from "../../domain/repository";
import { useConfirm } from "./ui";
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
  const confirm = useConfirm();
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
        type="button"
        className="outline"
        disabled={busy}
        onClick={async () => {
          if (
            !(await confirm({
              title: "Substituir o acervo salvo no Supabase?",
              body: "O acervo passa a ser o deste navegador. As obras publicadas dele vão para o site.",
              confirmLabel: "Substituir",
              tone: "danger",
            }))
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
            setNotice(errorMessage(error, "Falha ao importar."));
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
