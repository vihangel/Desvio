import type { ArtistAudio, RecordDraft } from "../../../domain/entities";
import { UPLOAD_LIMITS, megabytesLabel } from "../../../domain/constants";
import { TextAreaField, TextField, UploadBox, UrlField } from "../ui";
import CaptionsField from "./CaptionsField";
export default function AudioFields({
  draft,
  onChange,
  onUpload,
  remote,
}: {
  draft: RecordDraft;
  onChange: (draft: RecordDraft) => void;
  onUpload: (file: File) => void;
  remote: boolean;
}) {
  const audio = draft.media.narration;
  const setNarration = (narration: ArtistAudio | undefined) =>
    onChange({ ...draft, media: { ...draft.media, narration } });
  const update = (patch: Partial<ArtistAudio>) =>
    setNarration({
      credits: "",
      transcript: "",
      authorized: false,
      ...audio,
      ...patch,
    });
  return (
    <>
      <UploadBox
        label="Áudio"
        status={
          audio?.path
            ? "✓ Áudio enviado."
            : audio?.src
              ? "✓ Usando endereço externo."
              : "Nenhum áudio anexado."
        }
        tone={audio ? "ok" : undefined}
        buttonLabel={audio ? "Trocar áudio" : "Escolher áudio"}
        accept=".mp3,.wav,.ogg,.m4a"
        onFile={onUpload}
        hint={`MP3, WAV, OGG ou M4A de até ${
          remote
            ? megabytesLabel(UPLOAD_LIMITS.remote.audio)
            : `${megabytesLabel(UPLOAD_LIMITS.local.file)}, só nesta sessão`
        }.`}
      >
        {audio?.src && <audio controls src={audio.src} />}
      </UploadBox>
      <details className="advanced">
        <summary>Usar um endereço na internet</summary>
        <UrlField
          label="Endereço do áudio"
          disabled={!!audio?.path}
          value={audio?.path ? "" : (audio?.src ?? "")}
          onChange={(src) =>
            update({ src, bucket: undefined, path: undefined })
          }
        />
      </details>
      {audio && (
        <>
          <TextField
            label="Créditos da voz"
            value={audio.credits}
            onChange={(credits) => update({ credits })}
          />
          <TextAreaField
            label="Transcrição"
            hint="Texto do áudio, para acessibilidade."
            value={audio.transcript}
            onChange={(transcript) => update({ transcript })}
          />
          <CaptionsField
            captions={audio.captions}
            onChange={(captions) => update({ captions })}
          />
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={audio.authorized}
              onChange={(e) => update({ authorized: e.target.checked })}
            />
            A pessoa autorizou a reprodução da voz
          </label>
          <button
            type="button"
            className="link-button danger-link"
            onClick={() => setNarration(undefined)}
          >
            Remover áudio da obra
          </button>
        </>
      )}
    </>
  );
}
