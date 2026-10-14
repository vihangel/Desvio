import { useState } from "react";
import type { CollectionSnapshot, Exhibition } from "../../domain/entities";
export default function ExhibitionEditor({
  snapshot,
  live,
  busy,
  onSave,
  onPublish,
  onArchive,
}: {
  snapshot: CollectionSnapshot;
  live: boolean;
  busy: boolean;
  onSave: (exhibition: Exhibition) => Promise<boolean>;
  onPublish: () => Promise<boolean>;
  onArchive: () => Promise<boolean>;
}) {
  const [exhibition, setExhibition] = useState(snapshot.exhibition);
  const unsaved =
    JSON.stringify(exhibition) !== JSON.stringify(snapshot.exhibition);
  return (
    <section className="room-admin">
      <h2>Dados da exposição</h2>
      <p>
        {live
          ? "A exposição está no ar: o site mostra as obras publicadas."
          : "A exposição está fora do ar: o site não mostra nenhuma obra."}
      </p>
      <fieldset disabled={busy}>
        <label>
          Título
          <input
            value={exhibition.title}
            onChange={(e) =>
              setExhibition({ ...exhibition, title: e.target.value })
            }
          />
        </label>
        <div className="room-admin-grid">
          <label>
            Início
            <input
              type="date"
              value={exhibition.beginsAt}
              onChange={(e) =>
                setExhibition({ ...exhibition, beginsAt: e.target.value })
              }
            />
          </label>
          <label>
            Encerramento
            <input
              type="date"
              min={exhibition.beginsAt}
              value={exhibition.endsAt}
              onChange={(e) =>
                setExhibition({ ...exhibition, endsAt: e.target.value })
              }
            />
          </label>
        </div>
        <div className="editor-actions">
          <button
            className="primary"
            disabled={!unsaved}
            onClick={() => void onSave(exhibition)}
          >
            Salvar dados da exposição
          </button>
          {!live && (
            <button className="outline" onClick={() => void onPublish()}>
              Colocar exposição no ar
            </button>
          )}
          {live && (
            <button
              className="danger"
              onClick={() => {
                if (
                  window.confirm(
                    "Tirar a exposição do ar? Visitantes deixam de ver as obras até você publicar de novo.",
                  )
                )
                  void onArchive();
              }}
            >
              Tirar exposição do ar
            </button>
          )}
        </div>
        {unsaved && <p className="editor-hint">Há alterações não salvas.</p>}
      </fieldset>
    </section>
  );
}
