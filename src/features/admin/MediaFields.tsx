import type { RecordDraft } from "../../domain/entities";
import { Field } from "./ui";
const typeLabels = {
  image: "Imagem",
  model: "Objeto 3D",
  video: "Vídeo do YouTube",
} as const;
export default function MediaFields({
  draft,
  onChange,
  onPlace,
  onUpload,
  remote,
}: {
  draft: RecordDraft;
  onChange: (draft: RecordDraft) => void;
  onPlace: (
    roomId: string,
    slotId?: string,
    type?: "image" | "model" | "video",
  ) => void;
  onUpload: (file?: File) => Promise<void>;
  remote: boolean;
}) {
  const { media, placement } = draft;
  const changeMedia = (patch: Partial<typeof media>) =>
    onChange({ ...draft, media: { ...media, ...patch } });
  const attached = !!(media.path || media.src);
  return (
    <>
      <div className="segmented" role="radiogroup" aria-label="Tipo de mídia">
        {(["image", "model", "video"] as const).map((type) => (
          <label key={type} className={media.type === type ? "selected" : ""}>
            <input
              type="radio"
              name="media-type"
              checked={media.type === type}
              onChange={() => onPlace(placement.roomId, undefined, type)}
            />
            {typeLabels[type]}
          </label>
        ))}
      </div>
      <small className="field-hint">
        Trocar o tipo apaga o arquivo atual e escolhe uma posição compatível na
        sala.
      </small>
      {media.type === "video" ? (
        <Field
          label="Link do YouTube"
          hint="Vídeo público ou não listado, com incorporação permitida."
        >
          <input
            type="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={media.src ?? ""}
            onChange={(e) =>
              changeMedia({
                src: e.target.value,
                bucket: undefined,
                path: undefined,
              })
            }
          />
        </Field>
      ) : (
        <>
          <div className="upload-box">
            <span className="field-label">
              {media.type === "image" ? "Arquivo da imagem" : "Arquivo 3D"}
            </span>
            <p className={attached ? "file-status ok" : "file-status missing"}>
              {media.path
                ? `✓ Arquivo enviado${media.type === "model" ? ` (${(media.modelFormat ?? "glb").toUpperCase()})` : ""}.`
                : media.src?.startsWith("data:")
                  ? "✓ Imagem local selecionada."
                  : media.src?.startsWith("/")
                    ? "✓ Imagem do acervo do site."
                    : media.src?.startsWith("blob:")
                      ? "✓ Arquivo carregado nesta sessão."
                      : media.src
                        ? "✓ Usando endereço externo."
                        : media.type === "model"
                          ? "Nenhum arquivo 3D anexado."
                          : "Nenhuma imagem anexada."}
            </p>
            {media.type === "image" && media.src && (
              <img className="upload-preview" src={media.src} alt="" />
            )}
            <label className="file-button">
              {attached ? "Trocar arquivo" : "Escolher arquivo"}
              <input
                type="file"
                accept={
                  media.type === "image"
                    ? "image/png,image/jpeg,image/webp"
                    : ".glb,.stl,.obj"
                }
                onChange={(e) => {
                  void onUpload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <small className="field-hint">
              {media.type === "image"
                ? remote
                  ? "PNG, JPEG ou WebP de até 5 MB."
                  : "PNG, JPEG ou WebP de até 1 MB."
                : remote
                  ? "GLB, STL ou OBJ de até 150 MB. O Desvio reduz texturas e comprime a malha antes de enviar."
                  : "GLB, STL ou OBJ. Na demonstração, o arquivo fica só nesta sessão."}
            </small>
          </div>
          <details className="advanced">
            <summary>
              Usar um endereço na internet em vez de enviar arquivo
            </summary>
            <Field label="Endereço do arquivo">
              <input
                type="url"
                inputMode="url"
                placeholder="https://"
                value={
                  media.path || media.src?.startsWith("data:")
                    ? ""
                    : (media.src ?? "")
                }
                onChange={(e) =>
                  changeMedia({
                    src: e.target.value,
                    bucket: undefined,
                    path: undefined,
                  })
                }
              />
            </Field>
            {media.type === "model" && (
              <Field label="Formato do modelo">
                <select
                  value={media.modelFormat ?? "glb"}
                  onChange={(e) =>
                    changeMedia({
                      modelFormat: e.target.value as "glb" | "stl" | "obj",
                    })
                  }
                >
                  <option value="glb">GLB com materiais</option>
                  <option value="stl">STL sem texturas</option>
                  <option value="obj">OBJ sem materiais externos</option>
                </select>
              </Field>
            )}
          </details>
        </>
      )}
      <Field
        label="Descrição acessível"
        hint="Descreva o que se vê, para quem usa leitor de tela."
      >
        <input
          value={media.alt}
          onChange={(e) => changeMedia({ alt: e.target.value })}
        />
      </Field>
      <Field
        label="Créditos da mídia"
        hint="Quem fotografou, filmou ou modelou."
      >
        <input
          value={media.attribution}
          onChange={(e) => changeMedia({ attribution: e.target.value })}
        />
      </Field>
      <Field label="Direitos de uso">
        <select
          value={media.rights}
          onChange={(e) =>
            changeMedia({ rights: e.target.value as typeof media.rights })
          }
        >
          <option value="preview">Imagem de catálogo para montagem</option>
          <option value="demo">Demonstração</option>
          <option value="reference">Painel editorial de pesquisa</option>
          <option value="licensed">Reprodução autorizada</option>
        </select>
      </Field>
      {media.rights === "licensed" && (
        <Field
          label="Referência da autorização"
          hint="Fica só para a equipe; não aparece no site."
        >
          <textarea
            value={media.authorization ?? ""}
            onChange={(e) => changeMedia({ authorization: e.target.value })}
          />
        </Field>
      )}
    </>
  );
}
