import type { CollectionSnapshot, Exhibition } from "../../../domain/entities";
import { useFormDraft } from "../useFormDraft";
import { Section, StatusPill, TextField, useConfirm } from "../ui";
export default function ExhibitionEditor({
  snapshot,
  live,
  busy,
  onSave,
  onPublish,
  onArchive,
  onDirty,
}: {
  snapshot: CollectionSnapshot;
  live: boolean;
  busy: boolean;
  onSave: (exhibition: Exhibition) => Promise<boolean>;
  onPublish: () => Promise<boolean>;
  onArchive: () => Promise<boolean>;
  onDirty: (dirty: boolean) => void;
}) {
  const {
    value: exhibition,
    setValue,
    dirty,
  } = useFormDraft(snapshot.exhibition, false, onDirty);
  const confirm = useConfirm();
  const change = (patch: Partial<Exhibition>) =>
    setValue((current) => ({ ...current, ...patch }));
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
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && dirty) void onSave(exhibition);
        }}
      >
        <fieldset className="form-fields" disabled={busy}>
          <TextField
            label="Título da exposição"
            value={exhibition.title}
            onChange={(title) => change({ title })}
          />
          <div className="field-row">
            <TextField
              label="Início"
              type="date"
              value={exhibition.beginsAt}
              onChange={(beginsAt) => change({ beginsAt })}
            />
            <TextField
              label="Encerramento"
              type="date"
              min={exhibition.beginsAt}
              value={exhibition.endsAt}
              onChange={(endsAt) => change({ endsAt })}
            />
          </div>
          <div className="inline-actions">
            <button type="submit" className="primary" disabled={!dirty}>
              Salvar exposição
            </button>
            {live ? (
              <button
                type="button"
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
              <button
                type="button"
                className="outline"
                onClick={() => void onPublish()}
              >
                Colocar no ar
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </Section>
  );
}
