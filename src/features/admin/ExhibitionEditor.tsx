import { useState } from "react";
import type { CollectionSnapshot, Exhibition } from "../../domain/entities";
export default function ExhibitionEditor({
  snapshot,
  busy,
  onSave,
  onReview,
  onPublish,
  onArchive,
}: {
  snapshot: CollectionSnapshot;
  busy: boolean;
  onSave: (exhibition: Exhibition) => Promise<boolean>;
  onReview: () => Promise<boolean>;
  onPublish: () => Promise<boolean>;
  onArchive: () => Promise<boolean>;
}) {
  const [exhibition, setExhibition] = useState(snapshot.exhibition);
  const labels = {
    draft: "Rascunho",
    in_review: "Em revisão",
    published: "Publicada",
    archived: "Arquivada",
  };
  const unsaved =
    JSON.stringify(exhibition) !== JSON.stringify(snapshot.exhibition);
  return (
    <section className="room-admin">
      <h2>Exposição e salas</h2>
      <p>
        Estado: {labels[snapshot.exhibition.status]}. Revisão e publicação são
        simuladas neste navegador.
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
          <button onClick={() => void onSave(exhibition)}>
            Salvar rascunho
          </button>
          <button
            disabled={unsaved || snapshot.exhibition.status === "in_review"}
            onClick={() => void onReview()}
          >
            Enviar para revisão
          </button>
          <button
            disabled={unsaved || snapshot.exhibition.status !== "in_review"}
            onClick={() => void onPublish()}
          >
            Publicar localmente
          </button>
          <button onClick={() => void onArchive()}>Arquivar localmente</button>
        </div>
        {unsaved && <p>Salve as alterações antes de revisar ou publicar.</p>}
      </fieldset>
      {snapshot.rooms.map((r) => (
        <article key={r.id}>
          <b>
            Sala {r.order + 1} · {r.name}
          </b>
          <span>{r.subtitle}</span>
          <small>
            {snapshot.placements.filter((p) => p.roomId === r.id).length}{" "}
            registros
          </small>
        </article>
      ))}
    </section>
  );
}
