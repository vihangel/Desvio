import type { CollectionSnapshot, RecordDraft } from "../../domain/entities";
import { roomSlots } from "../../domain/slots";
type Props = {
  draft: RecordDraft;
  snapshot: CollectionSnapshot;
  busy: boolean;
  onChange: (draft: RecordDraft) => void;
  onPlace: (roomId: string, slotId?: string, type?: "image" | "model") => void;
  onUpload: (file?: File) => Promise<void>;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onDelete: () => Promise<void>;
};
export default function RecordEditor({
  draft,
  snapshot,
  busy,
  onChange,
  onPlace,
  onUpload,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const { record, media, placement } = draft;
  const room = snapshot.rooms.find((r) => r.id === placement.roomId)!;
  const changeRecord = (patch: Partial<typeof record>) =>
    onChange({ ...draft, record: { ...record, ...patch } });
  const changeMedia = (patch: Partial<typeof media>) =>
    onChange({ ...draft, media: { ...media, ...patch } });
  const exists = snapshot.records.some((r) => r.id === record.id);
  return (
    <section className="editor-panel">
      <h2>{exists ? "Editar registro" : "Adicionar registro"}</h2>
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
        <label>
          Tipo de mídia
          <select
            value={media.type}
            onChange={(e) =>
              onPlace(room.id, undefined, e.target.value as "image" | "model")
            }
          >
            <option value="image">Imagem</option>
            <option value="model">Modelo GLB</option>
          </select>
        </label>
        <div className="editor-two">
          <label>
            Sala
            <select value={room.id} onChange={(e) => onPlace(e.target.value)}>
              {snapshot.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Posição
            <select
              value={placement.slotId}
              onChange={(e) => onPlace(room.id, e.target.value)}
            >
              {roomSlots(room)
                .filter((s) => s.type === media.type)
                .map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    disabled={snapshot.placements.some(
                      (p) =>
                        p.recordId !== record.id &&
                        p.roomId === room.id &&
                        p.slotId === s.id,
                    )}
                  >
                    {s.id}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label>
          {media.type === "image" ? "Imagem" : "Modelo GLB"} — endereço
          <input
            value={media.src?.startsWith("data:") ? "" : (media.src ?? "")}
            placeholder={
              media.src?.startsWith("data:")
                ? "Imagem local selecionada"
                : "https://…"
            }
            onChange={(e) => changeMedia({ src: e.target.value })}
          />
        </label>
        <label className="upload-label">
          Arquivo local
          <input
            type="file"
            accept={
              media.type === "image"
                ? "image/png,image/jpeg,image/webp"
                : ".glb"
            }
            onChange={(e) => {
              void onUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
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
          Imagens locais de até 1 MB. GLB de até 12 MB, disponível somente nesta
          sessão. Dados e publicação são locais neste modo.
        </small>
        <div className="editor-actions">
          <button className="primary" onClick={() => void onSave()}>
            Salvar rascunho
          </button>
          <button className="outline" onClick={onCancel}>
            Cancelar
          </button>
          {exists && (
            <button className="danger" onClick={() => void onDelete()}>
              Excluir do rascunho
            </button>
          )}
        </div>
      </fieldset>
    </section>
  );
}
