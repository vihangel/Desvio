import AudioFields from "./AudioFields";
import type { CollectionSnapshot, RecordDraft } from "../../domain/entities";
import PlacementFields from "./PlacementFields";
import MediaFields from "./MediaFields";
import {
  RECORD_STATUSES,
  asRecordStatus,
  recordStatusHints,
  recordStatusLabels,
} from "../../domain/publication";
import { editableRooms, type Access } from "../../domain/access";
import { CheckboxList, Field, FormPage, Section, StatusPill } from "./ui";
type Props = {
  draft: RecordDraft;
  snapshot: CollectionSnapshot;
  access: Access;
  isNew: boolean;
  dirty: boolean;
  busy: boolean;
  remote: boolean;
  canDelete: boolean;
  onChange: (draft: RecordDraft) => void;
  onPlace: (
    roomId: string,
    slotId?: string,
    type?: "image" | "model" | "video",
  ) => void;
  onUploadAudio: (file?: File) => Promise<void>;
  onUpload: (file?: File) => Promise<void>;
  onSave: () => Promise<boolean>;
  onSavePreview: () => Promise<void>;
  onBack: () => void;
  onDiscard: () => void;
  onSwap: (id: string) => Promise<void>;
  onDelete: () => void;
};
export default function RecordEditor({
  draft,
  snapshot,
  access,
  isNew,
  dirty,
  busy,
  remote,
  canDelete,
  onChange,
  onPlace,
  onUpload,
  onUploadAudio,
  onSave,
  onSavePreview,
  onBack,
  onDiscard,
  onDelete,
  onSwap,
}: Props) {
  const { record } = draft;
  const changeRecord = (patch: Partial<typeof record>) =>
    onChange({ ...draft, record: { ...record, ...patch } });
  const artist = access.kind === "artist";
  const status = asRecordStatus(record.status);
  const rooms = editableRooms(access, snapshot);
  return (
    <FormPage
      title={isNew ? "Nova obra" : record.title || "Obra sem título"}
      backLabel="Obras"
      onBack={onBack}
      badge={
        dirty ? (
          <StatusPill tone="unsaved">Alterações não salvas</StatusPill>
        ) : record.reviewRequested ? (
          <StatusPill tone="review">
            {artist ? "Em revisão da curadoria" : "Enviada pela artista"}
          </StatusPill>
        ) : (
          <StatusPill tone={status}>{recordStatusLabels[status]}</StatusPill>
        )
      }
      actions={
        <>
          <button
            className="primary"
            disabled={busy || !dirty}
            onClick={() => void onSave()}
          >
            {busy ? "Salvando…" : artist ? "Salvar e enviar" : "Salvar"}
          </button>
          <button
            className="outline"
            disabled={busy}
            onClick={() => void onSavePreview()}
          >
            {dirty ? "Salvar e ver na sala" : "Ver na sala 3D"}
          </button>
          {dirty && !isNew && (
            <button className="link-button" disabled={busy} onClick={onDiscard}>
              Descartar alterações
            </button>
          )}
        </>
      }
    >
      <fieldset className="form-fields" disabled={busy}>
        {artist ? (
          <Section title="Publicação">
            <p className="callout">
              Ao salvar, a obra vai para a curadoria e fica fora do site até ser
              aprovada.
              {status === "published" &&
                " Esta obra está no site agora: se você editar, ela sai do ar até a aprovação."}
            </p>
          </Section>
        ) : (
          <Section title="Publicação">
            <div
              className="segmented"
              role="radiogroup"
              aria-label="Status da obra"
            >
              {RECORD_STATUSES.map((s) => (
                <label key={s} className={status === s ? "selected" : ""}>
                  <input
                    type="radio"
                    name="record-status"
                    checked={status === s}
                    onChange={() => changeRecord({ status: s })}
                  />
                  {recordStatusLabels[s]}
                </label>
              ))}
            </div>
            <small className="field-hint">{recordStatusHints[status]}</small>
          </Section>
        )}
        <Section title="Informações">
          <Field label="Título">
            <input
              value={record.title}
              onChange={(e) => changeRecord({ title: e.target.value })}
            />
          </Field>
          <CheckboxList
            legend="Pessoas artistas"
            options={snapshot.artists.map((a) => ({
              value: a.id,
              label: a.name,
            }))}
            value={record.credits.map((c) => c.artistId)}
            onChange={(ids) =>
              changeRecord({
                credits: ids.map((artistId) => ({ artistId, role: "artista" })),
              })
            }
          />
          <Field
            label="Créditos complementares"
            hint="Para coletivos ou pessoas sem cadastro. Ex.: “e coletivo”."
          >
            <input
              value={record.creditNote}
              onChange={(e) => changeRecord({ creditNote: e.target.value })}
            />
          </Field>
          <div className="field-row">
            <Field label="Ano">
              <input
                type="number"
                inputMode="numeric"
                value={record.year ?? ""}
                onChange={(e) =>
                  changeRecord({
                    year: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Field>
            <Field label="Categoria" hint="Ex.: Obra têxtil, Videoarte.">
              <input
                value={record.kind}
                onChange={(e) => changeRecord({ kind: e.target.value })}
              />
            </Field>
          </div>
          <Field
            label="Descrição"
            hint="Obrigatória para publicar. Aparece na ficha da obra."
          >
            <textarea
              rows={5}
              value={record.description}
              onChange={(e) => changeRecord({ description: e.target.value })}
            />
          </Field>
          <Field
            label="Fonte documental"
            hint="Link para a origem das informações (opcional)."
          >
            <input
              type="url"
              inputMode="url"
              placeholder="https://"
              value={record.source ?? ""}
              onChange={(e) => changeRecord({ source: e.target.value })}
            />
          </Field>
        </Section>
        <Section title="Mídia">
          <MediaFields
            draft={draft}
            onChange={onChange}
            onPlace={onPlace}
            onUpload={onUpload}
            remote={remote}
          />
        </Section>
        <Section
          title="Narração da pessoa artista"
          description="Opcional. Um áudio com a voz da pessoa artista, tocado na ficha da obra."
        >
          <AudioFields
            draft={draft}
            onChange={onChange}
            onUpload={onUploadAudio}
            remote={remote}
          />
        </Section>
        <Section title="Lugar na exposição">
          <PlacementFields
            draft={draft}
            snapshot={snapshot}
            rooms={rooms}
            onPlace={onPlace}
            onChange={onChange}
            onSwap={isNew ? undefined : onSwap}
            dirty={dirty}
          />
        </Section>
        {!isNew && canDelete && (
          <Section
            title="Excluir obra"
            tone="danger"
            description={
              artist
                ? "Remove a obra definitivamente."
                : "Remove a obra definitivamente. Para só tirar do site, mude o status para Desativada."
            }
          >
            <button className="danger-outline" onClick={onDelete}>
              Excluir esta obra
            </button>
          </Section>
        )}
      </fieldset>
    </FormPage>
  );
}
