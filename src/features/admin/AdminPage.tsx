import { useState } from "react";
import ArtworkDialog from "../../shared/ArtworkDialog";
import VisitPage from "../visit/VisitPage";
import type { Artwork, CollectionState } from "../../domain/entities";
import type { MediaService } from "../../domain/media";
import type { CollectionRepository } from "../../domain/repository";
import { selectArtworks } from "../../domain/selectors";
import { useAdminEditor } from "./useAdminEditor";
import RecordEditor from "./RecordEditor";
import ExhibitionEditor from "./ExhibitionEditor";
export default function AdminPage({
  state,
  repository,
  mediaService,
  onChange,
  onExit,
}: {
  mediaService: MediaService;
  state: CollectionState;
  repository: CollectionRepository;
  onChange: (state: CollectionState) => void;
  onExit: () => void;
}) {
  const [preview, setPreview] = useState(false);
  const [tab, setTab] = useState<
    "records" | "artists" | "exhibition" | "preview"
  >("records");
  const [selected, setSelected] = useState<Artwork | null>(null);
  const editor = useAdminEditor(state, repository, onChange, mediaService);
  const works = selectArtworks(state.draft);
  if (!preview)
    return (
      <main className="admin admin-gate">
        <div className="eyebrow">ÁREA ADMINISTRATIVA</div>
        <h1>Gestão do Desvio</h1>
        <p>
          Editor demonstrativo local. Autenticação e permissões reais serão
          conectadas com o Supabase.
        </p>
        <button className="primary" onClick={() => setPreview(true)}>
          Entrar no editor demonstrativo
        </button>
        <button className="outline" onClick={onExit}>
          Voltar ao museu
        </button>
      </main>
    );
  return (
    <>
      <div className="admin-preview-banner">
        <b>Ambiente de edição demonstrativo</b>
        <span>Alterações e publicação apenas neste navegador.</span>
        <button disabled={editor.busy} onClick={onExit}>
          Sair da edição
        </button>
      </div>
      <main className="admin">
        <div className="eyebrow">DESVIO · GESTÃO DO ACERVO</div>
        <h1>Curadoria e organização</h1>
        <p>
          Salvar altera o rascunho. O acervo público só muda após revisão e
          publicação local.
        </p>
        <div className="admin-tabs">
          <button disabled={editor.busy} onClick={() => setTab("records")}>
            Registros ({works.length})
          </button>
          <button disabled={editor.busy} onClick={() => setTab("artists")}>
            Artistas
          </button>
          <button disabled={editor.busy} onClick={() => setTab("exhibition")}>
            Exposição e salas
          </button>
        </div>
        <button
          disabled={editor.busy}
          className="outline"
          onClick={() => setTab("preview")}
        >
          Prévia 3D do rascunho
        </button>
        {editor.notice && (
          <p className="editor-feedback" role="status">
            {editor.notice}
          </p>
        )}
        {tab === "records" && (
          <div className="admin-workspace">
            <section className="admin-records">
              <div className="admin-heading">
                <h2>Registros</h2>
                <button
                  disabled={editor.busy}
                  className="primary"
                  onClick={editor.create}
                >
                  + Adicionar
                </button>
              </div>
              {works.map((w) => (
                <button
                  disabled={editor.busy}
                  key={w.id}
                  className={
                    editor.draft?.record.id === w.id
                      ? "record active"
                      : "record"
                  }
                  onClick={() => editor.edit(w.id)}
                >
                  {w.image ? (
                    <img src={w.image} alt="" />
                  ) : (
                    <span className="record-icon">◈</span>
                  )}
                  <span>
                    <b>{w.title}</b>
                    <small>
                      {w.author} ·{" "}
                      {state.draft.rooms.find((r) => r.id === w.roomId)?.name}
                    </small>
                  </span>
                </button>
              ))}
              <button
                disabled={editor.busy}
                className="reset-link"
                onClick={() => void editor.reset()}
              >
                Restaurar acervo de exemplo
              </button>
            </section>
            {editor.draft ? (
              <RecordEditor
                draft={editor.draft}
                snapshot={state.draft}
                busy={editor.busy}
                onChange={editor.setDraft}
                onPlace={editor.place}
                onUpload={editor.upload}
                onSave={editor.save}
                onCancel={editor.discard}
                onDelete={editor.remove}
              />
            ) : (
              <section className="editor-panel">
                <h2>Selecione um registro</h2>
                <p>Edite o cadastro e escolha um slot disponível.</p>
              </section>
            )}
          </div>
        )}
        {tab === "artists" && (
          <div className="artist-grid">
            {state.draft.artists.map((a) => (
              <article key={a.id}>
                <small>{a.location}</small>
                <h2>{a.name}</h2>
                <p>{a.bio}</p>
                <a href={a.source} target="_blank" rel="noopener noreferrer">
                  Fonte de pesquisa ↗
                </a>
              </article>
            ))}
          </div>
        )}
        {tab === "exhibition" && (
          <ExhibitionEditor
            key={state.revision}
            snapshot={state.draft}
            busy={editor.busy}
            onSave={editor.saveExhibition}
            onReview={editor.review}
            onPublish={editor.publish}
            onArchive={editor.archive}
          />
        )}
      </main>
      {tab === "preview" && (
        <VisitPage
          works={works}
          rooms={state.draft.rooms}
          onSelect={setSelected}
          disabled={!!selected}
          initialGuided={false}
        />
      )}
      {selected && (
        <ArtworkDialog selected={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
