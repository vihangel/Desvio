import { useState } from "react";
import { UPLOAD_LIMITS } from "../../../domain/constants";
import { errorMessage } from "../../../domain/errors";
import { validateCaptions } from "../../../domain/validation";
import { UploadBox } from "../ui";
async function readCaptions(file: File) {
  if (file.size > UPLOAD_LIMITS.captions)
    throw new Error("Arquivo de legenda acima de 200 KB.");
  const text = await file.text();
  validateCaptions(text);
  return text;
}
export default function CaptionsField({
  captions,
  onChange,
}: {
  captions?: string;
  onChange: (captions: string | undefined) => void;
}) {
  const [error, setError] = useState("");
  return (
    <UploadBox
      label="Legenda sincronizada (opcional)"
      status={
        captions
          ? `✓ Legenda anexada (${captions.split("-->").length - 1} trechos).`
          : "Nenhuma legenda anexada."
      }
      tone={captions ? "ok" : undefined}
      buttonLabel={captions ? "Trocar legenda" : "Escolher arquivo .vtt"}
      accept=".vtt,text/vtt"
      onFile={async (file) => {
        try {
          onChange(await readCaptions(file));
          setError("");
        } catch (e) {
          setError(errorMessage(e, "Não foi possível ler a legenda."));
        }
      }}
      error={error}
      hint="Arquivo WebVTT com o texto e os tempos de cada fala. Aparece durante o áudio; quem usa leitor de tela recebe a transcrição."
      footer={
        captions && (
          <button
            type="button"
            className="link-button danger-link"
            onClick={() => onChange(undefined)}
          >
            Remover legenda
          </button>
        )
      }
    />
  );
}
