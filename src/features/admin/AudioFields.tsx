import type { RecordDraft } from "../../domain/entities";
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
    <section>
      <h3>Narração do artista</h3>
      <label>
        Anexar áudio
        <input
          type="file"
          accept=".mp3,.wav,.ogg,.m4a"
          onChange={(e) => {
            void onUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <label>
        Ou endereço do áudio
        <input
          type="url"
          disabled={!!audio?.path}
          value={audio?.path ? "" : (audio?.src ?? "")}
          onChange={(e) =>
            update({ src: e.target.value, bucket: undefined, path: undefined })
          }
        />
      </label>
      <small>
        {remote
          ? "Áudio até 20 MB, persistente no Storage."
          : "Áudio até 12 MB, disponível somente nesta sessão."}
      </small>
      {audio && (
        <>
          <label>
            Créditos da voz
            <input
              value={audio.credits}
              onChange={(e) => update({ credits: e.target.value })}
            />
          </label>
          <label>
            Transcrição
            <textarea
              value={audio.transcript}
              onChange={(e) => update({ transcript: e.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={audio.authorized}
              onChange={(e) => update({ authorized: e.target.checked })}
            />{" "}
            Autorização de reprodução da voz registrada
          </label>
          <label>
            Referência da autorização da mídia e da voz
            <textarea
              value={draft.media.authorization ?? ""}
              onChange={(e) =>
                onChange({
                  ...draft,
                  media: { ...draft.media, authorization: e.target.value },
                })
              }
            />
          </label>
          <button
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
    </section>
  );
}
