import { useState } from "react";
import type { CollectionSnapshot, Exhibition } from "../../domain/entities";
import { Field, Section, StatusPill, useConfirm } from "./ui";
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
  const confirm = useConfirm();
  const unsaved =
    JSON.stringify(exhibition) !== JSON.stringify(snapshot.exhibition);
  return (
    <Section
      title="Exposição"
      description={
        <>
          <StatusPill tone={live ? "published" : "archived"}>
            {live ? "No ar" : "Fora do ar"}
          </StatusPill>{" "}
          {live
            ? "O site mostra as obras publicadas."
            : "O site não mostra nenhuma obra."}
        </>
      }
    >
      <fieldset className="form-fields" disabled={busy}>
        <Field label="Título da exposição">
          <input
            value={exhibition.title}
            onChange={(e) =>
              setExhibition({ ...exhibition, title: e.target.value })
            }
          />
        </Field>
        <div className="field-row">
          <Field label="Início">
            <input
              type="date"
              value={exhibition.beginsAt}
              onChange={(e) =>
                setExhibition({ ...exhibition, beginsAt: e.target.value })
              }
            />
          </Field>
          <Field label="Encerramento">
            <input
              type="date"
              min={exhibition.beginsAt}
              value={exhibition.endsAt}
              onChange={(e) =>
                setExhibition({ ...exhibition, endsAt: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="inline-actions">
          <button
            className="primary"
            disabled={!unsaved}
            onClick={() => void onSave(exhibition)}
          >
            Salvar exposição
          </button>
          {live ? (
            <button
              className="danger-outline"
              onClick={async () => {
                if (
                  await confirm({
                    title: "Tirar a exposição do ar?",
                    body: "Visitantes deixam de ver todas as obras até você colocá-la no ar de novo. Os status das obras não mudam.",
                    confirmLabel: "Tirar do ar",
                    tone: "danger",
                  })
                )
                  void onArchive();
              }}
            >
              Tirar do ar
            </button>
          ) : (
            <button className="outline" onClick={() => void onPublish()}>
              Colocar no ar
            </button>
          )}
        </div>
      </fieldset>
    </Section>
  );
}
