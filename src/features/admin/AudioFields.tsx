import { useState } from "react";
import type { RecordDraft } from "../../domain/entities";
import { CAPTIONS_LIMIT, validateCaptions } from "../../domain/validation";
import { Field } from "./ui";
export default function AudioFields({
  draft,
  onChange,
  onUpload,
  remote,
}: {
  draft: RecordDraft;
  onChange: (draft: RecordDraft) => void;
  onUpload: (file?: File) => Promise<void>;
  remote: boolean;
}) {
  const audio = draft.media.narration;
  const [captionsError, setCaptionsError] = useState("");
  const update = (patch: Partial<NonNullable<typeof audio>>) =>
    onChange({
      ...draft,
      media: {
        ...draft.media,
        narration: {
          credits: "",
          transcript: "",
          authorized: false,
          ...audio,
          ...patch,
        },
      },
    });
  return (
    <>
      <div className="upload-box">
        <span className="field-label">Áudio</span>
        <p className={audio ? "file-status ok" : "file-status"}>
          {audio?.path
            ? "✓ Áudio enviado."
            : audio?.src
              ? "✓ Usando endereço externo."
              : "Nenhum áudio anexado."}
        </p>
        {audio?.src && <audio controls src={audio.src} />}
        <label className="file-button">
          {audio ? "Trocar áudio" : "Escolher áudio"}
          <input
            type="file"
            accept=".mp3,.wav,.ogg,.m4a"
            onChange={(e) => {
              void onUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <small className="field-hint">
          MP3, WAV, OGG ou M4A
          {remote ? " de até 20 MB" : " de até 12 MB, só nesta sessão"}.
        </small>
      </div>
      <details className="advanced">
        <summary>Usar um endereço na internet</summary>
        <Field label="Endereço do áudio">
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            disabled={!!audio?.path}
            value={audio?.path ? "" : (audio?.src ?? "")}
            onChange={(e) =>
              update({
                src: e.target.value,
                bucket: undefined,
                path: undefined,
              })
            }
          />
        </Field>
      </details>
      {audio && (
        <>
          <Field label="Créditos da voz">
            <input
              value={audio.credits}
              onChange={(e) => update({ credits: e.target.value })}
            />
          </Field>
          <Field
            label="Transcrição"
            hint="Texto do áudio, para acessibilidade."
          >
            <textarea
              value={audio.transcript}
              onChange={(e) => update({ transcript: e.target.value })}
            />
          </Field>
          <div className="upload-box">
            <span className="field-label">Legenda sincronizada (opcional)</span>
            <p className={audio.captions ? "file-status ok" : "file-status"}>
              {audio.captions
                ? `✓ Legenda anexada (${audio.captions.split("-->").length - 1} trechos).`
                : "Nenhuma legenda anexada."}
            </p>
            <label className="file-button">
              {audio.captions ? "Trocar legenda" : "Escolher arquivo .vtt"}
              <input
                type="file"
                accept=".vtt,text/vtt"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    if (file.size > CAPTIONS_LIMIT)
                      throw new Error("Arquivo de legenda acima de 200 KB.");
                    const text = await file.text();
                    validateCaptions(text);
                    setCaptionsError("");
                    update({ captions: text });
                  } catch (error) {
                    setCaptionsError(
                      error instanceof Error
                        ? error.message
                        : "Não foi possível ler a legenda.",
                    );
                  }
                }}
              />
            </label>
            {captionsError && (
              <p className="file-status missing" role="alert">
                {captionsError}
              </p>
            )}
            {audio.captions && (
              <button
                className="link-button danger-link"
                onClick={() => update({ captions: undefined })}
              >
                Remover legenda
              </button>
            )}
            <small className="field-hint">
              Arquivo WebVTT com o texto e os tempos de cada fala. Aparece
              durante o áudio; quem usa leitor de tela recebe a transcrição.
            </small>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={audio.authorized}
              onChange={(e) => update({ authorized: e.target.checked })}
            />
            A pessoa autorizou a reprodução da voz
          </label>
          <Field
            label="Referência da autorização"
            hint="Obrigatória para publicar com áudio. Fica só para a equipe."
          >
            <textarea
              value={draft.media.authorization ?? ""}
              onChange={(e) =>
                onChange({
                  ...draft,
                  media: { ...draft.media, authorization: e.target.value },
                })
              }
            />
          </Field>
          <button
            className="link-button danger-link"
            onClick={() =>
              onChange({
                ...draft,
                media: { ...draft.media, narration: undefined },
              })
            }
          >
            Remover áudio da obra
          </button>
        </>
      )}
    </>
  );
}
