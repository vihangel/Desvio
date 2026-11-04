import type {
  MediaAsset,
  MediaType,
  RecordDraft,
  Rights,
} from "../../../domain/entities";
import {
  UPLOAD_LIMITS,
  megabytesLabel,
  type ModelFormat,
} from "../../../domain/constants";
import { isInlineUrl, isSessionUrl } from "../../../domain/mediaUrls";
import {
  SegmentedField,
  SelectField,
  TextField,
  UploadBox,
  UrlField,
} from "../ui";
const typeOptions: { value: MediaType; label: string }[] = [
  { value: "image", label: "Imagem" },
  { value: "model", label: "Objeto 3D" },
  { value: "video", label: "Vídeo do YouTube" },
];
const rightsOptions: { value: Rights; label: string }[] = [
  { value: "preview", label: "Imagem de catálogo para montagem" },
  { value: "demo", label: "Demonstração" },
  { value: "reference", label: "Painel editorial de pesquisa" },
  { value: "licensed", label: "Reprodução autorizada" },
];
const modelFormatOptions: { value: ModelFormat; label: string }[] = [
  { value: "glb", label: "GLB com materiais" },
  { value: "stl", label: "STL sem texturas" },
  { value: "obj", label: "OBJ sem materiais externos" },
];
function fileStatus(media: MediaAsset) {
  if (media.path)
    return `✓ Arquivo enviado${media.type === "model" ? ` (${(media.modelFormat ?? "glb").toUpperCase()})` : ""}.`;
  if (isInlineUrl(media.src)) return "✓ Imagem local selecionada.";
  if (media.src?.startsWith("/")) return "✓ Imagem do acervo do site.";
  if (isSessionUrl(media.src)) return "✓ Arquivo carregado nesta sessão.";
  if (media.src) return "✓ Usando endereço externo.";
  return media.type === "model"
    ? "Nenhum arquivo 3D anexado."
    : "Nenhuma imagem anexada.";
}
function fileHint(type: MediaType, remote: boolean) {
  if (type === "image")
    return `PNG, JPEG ou WebP de até ${megabytesLabel(remote ? UPLOAD_LIMITS.remote.image : UPLOAD_LIMITS.local.image)}.`;
  return remote
    ? `GLB, STL ou OBJ de até ${megabytesLabel(UPLOAD_LIMITS.modelInput)}. O Desvio reduz texturas e comprime a malha antes de enviar.`
    : "GLB, STL ou OBJ. Na demonstração, o arquivo fica só nesta sessão.";
}
export default function MediaFields({
  draft,
  onChange,
  onPlace,
  onUpload,
  remote,
}: {
  draft: RecordDraft;
  onChange: (draft: RecordDraft) => void;
  onPlace: (roomId: string, slotId?: string, type?: MediaType) => void;
  onUpload: (file: File) => void;
  remote: boolean;
}) {
  const { media, placement } = draft;
  const changeMedia = (patch: Partial<MediaAsset>) =>
    onChange({ ...draft, media: { ...media, ...patch } });
  const setAddress = (src: string) =>
    changeMedia({ src, bucket: undefined, path: undefined });
  const attached = !!(media.path || media.src);
  return (
    <>
      <SegmentedField
        label="Tipo de mídia"
        name="media-type"
        value={media.type}
        options={typeOptions}
        onChange={(type) => onPlace(placement.roomId, undefined, type)}
      />
      <small className="field-hint">
        Trocar o tipo apaga o arquivo atual e escolhe uma posição compatível na
        sala.
      </small>
      {media.type === "video" ? (
        <UrlField
          label="Link do YouTube"
          hint="Vídeo público ou não listado, com incorporação permitida."
          placeholder="https://www.youtube.com/watch?v=…"
          value={media.src ?? ""}
          onChange={setAddress}
        />
      ) : (
        <>
          <UploadBox
            label={media.type === "image" ? "Arquivo da imagem" : "Arquivo 3D"}
            status={fileStatus(media)}
            tone={attached ? "ok" : "missing"}
            buttonLabel={attached ? "Trocar arquivo" : "Escolher arquivo"}
            accept={
              media.type === "image"
                ? "image/png,image/jpeg,image/webp"
                : ".glb,.stl,.obj"
            }
            onFile={onUpload}
            hint={fileHint(media.type, remote)}
          >
            {media.type === "image" && media.src && (
              <img className="upload-preview" src={media.src} alt="" />
            )}
          </UploadBox>
          <details className="advanced">
            <summary>
              Usar um endereço na internet em vez de enviar arquivo
            </summary>
            <UrlField
              label="Endereço do arquivo"
              value={
                media.path || isInlineUrl(media.src) ? "" : (media.src ?? "")
              }
              onChange={setAddress}
            />
            {media.type === "model" && (
              <SelectField
                label="Formato do modelo"
                value={media.modelFormat ?? "glb"}
                options={modelFormatOptions}
                onChange={(modelFormat) => changeMedia({ modelFormat })}
              />
            )}
          </details>
        </>
      )}
      <TextField
        label="Descrição acessível"
        hint="Descreva o que se vê, para quem usa leitor de tela."
        value={media.alt}
        onChange={(alt) => changeMedia({ alt })}
      />
      <TextField
        label="Créditos da mídia"
        hint="Quem fotografou, filmou ou modelou."
        value={media.attribution}
        onChange={(attribution) => changeMedia({ attribution })}
      />
      <SelectField
        label="Direitos de uso"
        value={media.rights}
        options={rightsOptions}
        onChange={(rights) => changeMedia({ rights })}
      />
    </>
  );
}
