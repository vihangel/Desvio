import type { RecordDraft } from "../../domain/entities";
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
  const room = { id: placement.roomId };
  const changeMedia = (patch: Partial<typeof media>) =>
    onChange({ ...draft, media: { ...media, ...patch } });
  return (
    <>
      <label>
        Tipo de mídia
        <select
          value={media.type}
          onChange={(e) =>
            onPlace(
              room.id,
              undefined,
              e.target.value as "image" | "model" | "video",
            )
          }
        >
          <option value="image">Imagem</option>
          <option value="model">Objeto 3D (GLB, STL ou OBJ)</option>
          <option value="video">Vídeo do YouTube</option>
        </select>
      </label>
      <label>
        {media.type === "image"
          ? "Imagem"
          : media.type === "video"
            ? "Link do YouTube"
            : "Objeto 3D"}{" "}
        — endereço
        <input
          value={
            media.path
              ? "Arquivo enviado"
              : media.src?.startsWith("data:")
                ? ""
                : (media.src ?? "")
          }
          disabled={!!media.path}
          placeholder={
            media.src?.startsWith("data:")
              ? "Imagem local selecionada"
              : "https://…"
          }
          onChange={(e) =>
            changeMedia({
              src: e.target.value,
              bucket: undefined,
              path: undefined,
            })
          }
        />
      </label>
      {media.path && (
        <button
          onClick={() =>
            changeMedia({ src: undefined, bucket: undefined, path: undefined })
          }
        >
          Usar endereço externo
        </button>
      )}
      {media.type !== "video" && (
        <label className="upload-label">
          Enviar arquivo
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
      )}
      {media.type === "model" && (
        <p
          className={
            media.src || media.path ? "file-status ok" : "file-status missing"
          }
          role="status"
        >
          {media.path
            ? `✓ Arquivo 3D anexado (${(media.modelFormat ?? "glb").toUpperCase()}).`
            : media.src
              ? "✓ Arquivo 3D anexado por endereço."
              : "Nenhum arquivo 3D anexado. Envie um GLB, STL ou OBJ."}
        </p>
      )}
      {media.type === "model" && (
        <label>
          Formato do modelo
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
        </label>
      )}
      {media.type === "video" && (
        <small>
          Use vídeo público ou não listado com incorporação habilitada. A prévia
          ao olhar é silenciosa; o som exige ação do visitante.
        </small>
      )}
      <label>
        Descrição acessível da mídia
        <input
          value={media.alt}
          onChange={(e) => changeMedia({ alt: e.target.value })}
        />
      </label>
      <label>
        Direitos
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
      </label>
      <label>
        Créditos da mídia
        <input
          value={media.attribution}
          onChange={(e) => changeMedia({ attribution: e.target.value })}
        />
      </label>
      {media.rights === "licensed" && (
        <label>
          Referência da autorização
          <textarea
            value={media.authorization ?? ""}
            onChange={(e) => changeMedia({ authorization: e.target.value })}
          />
        </label>
      )}
      <small className="editor-hint">
        {remote
          ? "Imagens de até 5 MB. GLB, STL ou OBJ de até 150 MB: o Desvio reduz as texturas e comprime a malha antes de enviar (até 24 MB depois de otimizado)."
          : "Imagens de até 1 MB. GLB, STL ou OBJ são otimizados antes do uso (até 12 MB depois); objetos 3D ficam só nesta sessão de demonstração."}
      </small>
    </>
  );
}
