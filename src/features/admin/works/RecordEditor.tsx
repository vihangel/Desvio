import type {
  CollectionRecord,
  CollectionSnapshot,
  MediaType,
  RecordDraft,
} from "../../../domain/entities";
import {
  RECORD_STATUSES,
  asRecordStatus,
  recordStatusHints,
  recordStatusLabels,
} from "../../../domain/publication";
import { editableRooms, type Access } from "../../../domain/access";
import {
  FormPage,
  Section,
  SegmentedField,
  StatusPill,
  TextAreaField,
  UnsavedPill,
} from "../ui";
import AudioFields from "./AudioFields";
import MediaFields from "./MediaFields";
import PlacementFields from "./PlacementFields";
import { RecordInformation, RecordTechnicalDetails } from "./RecordFields";
const statusOptions = RECORD_STATUSES.map((value) => ({
  value,
  label: recordStatusLabels[value],
}));
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
  onPlace: (roomId: string, slotId?: string, type?: MediaType) => void;
  onUploadAudio: (file: File) => void;
  onUpload: (file: File) => void;
  onSave: () => void;
  onSavePreview: () => void;
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
  const { record, media } = draft;
  const changeRecord = (patch: Partial<CollectionRecord>) =>
    onChange({ ...draft, record: { ...record, ...patch } });
  const artist = access.kind === "artist";
  const status = asRecordStatus(record.status);
  return (
    <FormPage
      title={isNew ? "Nova obra" : record.title || "Obra sem título"}
      backLabel="Obras"
      onBack={onBack}
      badge={
        dirty ? (
          <UnsavedPill />
        ) : record.reviewRequested ? (
          <StatusPill tone="review">
            {artist ? "Em revisão da curadoria" : "Enviada pela pessoa artista"}
          </StatusPill>
        ) : (
          <StatusPill tone={status}>{recordStatusLabels[status]}</StatusPill>
        )
      }
      busy={busy}
      dirty={dirty}
      saveLabel={artist ? "Salvar e enviar" : "Salvar"}
      onSave={onSave}
      onDiscard={isNew ? undefined : onDiscard}
      extraActions={
        <button
          type="button"
          className="outline"
          disabled={busy}
          onClick={onSavePreview}
        >
          {dirty ? "Salvar e ver na sala" : "Ver na sala 3D"}
        </button>
      }
    >
      <Section title="Publicação">
        {artist ? (
          <p className="callout">
            Ao salvar, a obra vai para a curadoria e fica fora do site até ser
            aprovada.
            {status === "published" &&
              " Esta obra está no site agora: se você editar, ela sai do ar até a aprovação."}
          </p>
        ) : (
          <>
            <SegmentedField
              label="Status da obra"
              name="record-status"
              value={status}
              options={statusOptions}
              onChange={(next) => changeRecord({ status: next })}
            />
            <small className="field-hint">{recordStatusHints[status]}</small>
          </>
        )}
      </Section>
      <RecordInformation
        record={record}
        snapshot={snapshot}
        onChange={changeRecord}
      />
      <RecordTechnicalDetails record={record} onChange={changeRecord} />
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
      {(media.rights === "licensed" || media.narration) && (
        <Section title="Autorização">
          <TextAreaField
            label="Referência da autorização"
            hint="Obrigatória para publicar com mídia de reprodução autorizada ou com narração. Fica só para a equipe; não aparece no site."
            value={media.authorization ?? ""}
            onChange={(authorization) =>
              onChange({ ...draft, media: { ...media, authorization } })
            }
          />
        </Section>
      )}
      <Section title="Lugar na exposição">
        <PlacementFields
          draft={draft}
          snapshot={snapshot}
          rooms={editableRooms(access, snapshot)}
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
          <button type="button" className="danger-outline" onClick={onDelete}>
            Excluir esta obra
          </button>
        </Section>
      )}
    </FormPage>
  );
}
