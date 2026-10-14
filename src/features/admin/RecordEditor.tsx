import AudioFields from "./AudioFields";
import type { CollectionSnapshot, RecordDraft } from "../../domain/entities";
import {
  RECORD_STATUSES,
  asRecordStatus,
  recordStatusHints,
  recordStatusLabels,
} from "../../domain/publication";
import PlacementFields from "./PlacementFields";
import MediaFields from "./MediaFields";
type Props = {
  draft: RecordDraft;
  snapshot: CollectionSnapshot;
  dirty: boolean;
  busy: boolean;
  remote: boolean;
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
  notice: string;
  onCancel: () => void;
  onSwap: (id: string) => Promise<void>;
  onDelete: () => Promise<void>;
};
export default function RecordEditor({
  draft,
  snapshot,
  dirty,
  busy,
  remote,
  onChange,
  onPlace,
  onUpload,
  onUploadAudio,
  onSave,
  onSavePreview,
  notice,
  onCancel,
  onDelete,
  onSwap,
}: Props) {
  const { record } = draft;
  const changeRecord = (patch: Partial<typeof record>) =>
    onChange({ ...draft, record: { ...record, ...patch } });
  const exists = snapshot.records.some((r) => r.id === record.id);
  return (
    <section className="editor-panel">
      <div className="editor-title">
        <h2>{exists ? "Editar obra" : "Nova obra"}</h2>
        {dirty && (
          <span className="status-pill status-unsaved">
            Alterações não salvas
          </span>
        )}
      </div>
      <fieldset className="status-choice" disabled={busy}>
        <legend>Status</legend>
        <div role="radiogroup" aria-label="Status da obra">
          {RECORD_STATUSES.map((status) => (
            <label
              key={status}
              className={
                asRecordStatus(record.status) === status ? "selected" : ""
              }
            >
              <input
                type="radio"
                name="record-status"
                checked={asRecordStatus(record.status) === status}
                onChange={() => changeRecord({ status })}
              />
              {recordStatusLabels[status]}
            </label>
          ))}
        </div>
        <small>{recordStatusHints[asRecordStatus(record.status)]}</small>
      </fieldset>
      <fieldset disabled={busy}>
        <label>
          Título
          <input
            value={record.title}
            onChange={(e) => changeRecord({ title: e.target.value })}
          />
        </label>
        <label>
          Pessoas artistas
          <select
            multiple
            value={record.credits.map((c) => c.artistId)}
            onChange={(e) =>
              changeRecord({
                credits: Array.from(e.target.selectedOptions).map((o) => ({
                  artistId: o.value,
                  role: "artista",
                })),
              })
            }
          >
            {snapshot.artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Créditos complementares / coletivo
          <input
            value={record.creditNote}
            onChange={(e) => changeRecord({ creditNote: e.target.value })}
          />
        </label>
        <div className="editor-two">
          <label>
            Ano
            <input
              type="number"
              value={record.year ?? ""}
              onChange={(e) =>
                changeRecord({
                  year: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
          <label>
            Categoria
            <input
              value={record.kind}
              onChange={(e) => changeRecord({ kind: e.target.value })}
            />
          </label>
        </div>
        <label>
          Descrição
          <textarea
            rows={5}
            value={record.description}
            onChange={(e) => changeRecord({ description: e.target.value })}
          />
        </label>
        <label>
          Fonte documental
          <input
            type="url"
            value={record.source ?? ""}
            onChange={(e) => changeRecord({ source: e.target.value })}
          />
        </label>
        <MediaFields
          draft={draft}
          onChange={onChange}
          onPlace={onPlace}
          onUpload={onUpload}
          remote={remote}
        />
        <AudioFields
          draft={draft}
          onChange={onChange}
          onUpload={onUploadAudio}
          remote={remote}
        />
        <PlacementFields
          draft={draft}
          snapshot={snapshot}
          onPlace={onPlace}
          onChange={onChange}
          onSwap={exists ? onSwap : undefined}
        />
        {notice && (
          <p className="editor-feedback" role="status">
            {notice}
          </p>
        )}
        <p className="editor-hint">
          {remote
            ? "As alterações são gravadas no Supabase ao salvar."
            : "Modo demonstrativo: as alterações ficam só neste navegador."}
        </p>
        <div className="editor-actions">
          <button
            className="primary"
            disabled={!dirty}
            onClick={() => void onSave()}
          >
            {busy ? "Salvando…" : "Salvar"}
          </button>
          <button className="outline" onClick={() => void onSavePreview()}>
            {dirty ? "Salvar e ver na sala 3D" : "Ver na sala 3D"}
          </button>
          <button className="outline" onClick={onCancel}>
            {dirty ? "Descartar alterações" : "Fechar"}
          </button>
          {exists && (
            <button className="danger" onClick={() => void onDelete()}>
              Excluir obra
            </button>
          )}
        </div>
      </fieldset>
    </section>
  );
}
