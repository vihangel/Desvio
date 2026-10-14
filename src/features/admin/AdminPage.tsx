import LocalImport from "./LocalImport";
import RoomEditor from "./RoomEditor";
import ArtistEditor from "./ArtistEditor";
import { useState } from "react";
import ArtworkDialog from "../../shared/ArtworkDialog";
import VisitPage from "../visit/VisitPage";
import type { Artwork, CollectionState } from "../../domain/entities";
import type { MediaService } from "../../domain/media";
import type { CollectionRepository } from "../../domain/repository";
import { selectArtworks } from "../../domain/selectors";
import {
  RECORD_STATUSES,
  asRecordStatus,
  isOnAir,
  recordStatusLabels,
  type RecordStatus,
} from "../../domain/publication";
import { useAdminEditor } from "./useAdminEditor";
import RecordEditor from "./RecordEditor";
import ExhibitionEditor from "./ExhibitionEditor";
const filterLabels: Record<RecordStatus, string> = {
  published: "Publicadas",
  draft: "Rascunhos",
  archived: "Desativadas",
};
export default function AdminPage({
  state,
  repository,
  mediaService,
  accountEmail,
  onChange,
  onExit,
  onSignOut,
  loadLocalDraft,
}: {
  loadLocalDraft?: () => Promise<
    import("../../domain/entities").CollectionSnapshot
  >;
  mediaService: MediaService;
  state: CollectionState;
  repository: CollectionRepository;
  accountEmail?: string;
  onChange: (state: CollectionState) => void;
  onExit: () => void;
  onSignOut?: () => void;
}) {
  const remote = repository.mode === "supabase";
  const [focusWork, setFocusWork] = useState<string>();
  const [entered, setEntered] = useState(remote);
  const [tab, setTab] = useState<
    "records" | "artists" | "exhibition" | "preview"
  >("records");
  const [filter, setFilter] = useState<RecordStatus | "all">("all");
  const [selected, setSelected] = useState<Artwork | null>(null);
  const editor = useAdminEditor(state, repository, onChange, mediaService);
  const { draft } = state;
  const records = draft.records.map((record) => {
    const media = draft.media.find((m) => m.recordId === record.id);
    const placement = draft.placements.find((p) => p.recordId === record.id);
    return {
      record,
      status: asRecordStatus(record.status),
      image: media?.type === "image" ? media.src : undefined,
      author: [
        ...record.credits.map(
          (c) => draft.artists.find((a) => a.id === c.artistId)?.name,
        ),
        record.creditNote,
      ]
        .filter(Boolean)
        .join(" e "),
      room: draft.rooms.find((r) => r.id === placement?.roomId)?.name,
    };
  });
  const counts = Object.fromEntries(
    RECORD_STATUSES.map((s) => [
      s,
      records.filter((r) => r.status === s).length,
    ]),
  ) as Record<RecordStatus, number>;
  const visible = records.filter(
    (r) => filter === "all" || r.status === filter,
  );
  const onAir = isOnAir(draft);
  const leaveRecord = () =>
    !editor.dirty ||
    window.confirm("Esta obra tem alterações não salvas. Descartar?");
  if (!entered)
    return (
      <main className="admin admin-gate">
        <div className="eyebrow">ÁREA ADMINISTRATIVA</div>
        <h1>Gestão do Desvio</h1>
        <p>
          Modo demonstrativo: as alterações ficam só neste navegador e não vão
          para o Supabase.
        </p>
        <button className="primary" onClick={() => setEntered(true)}>
          Entrar no editor demonstrativo
        </button>
        <button className="outline" onClick={onExit}>
          Voltar ao museu
        </button>
      </main>
    );
  const tabs = [
    ["records", `Obras (${records.length})`],
    ["artists", `Artistas (${draft.artists.length})`],
    ["exhibition", "Salas e exposição"],
  ] as const;
  return (
    <div
      className={
        tab === "preview" ? "admin-shell admin-shell-preview" : "admin-shell"
      }
    >
      <div className="admin-preview-banner">
        <b>{remote ? "Conectado ao Supabase" : "Modo demonstrativo local"}</b>
        <span>
          {remote
            ? accountEmail
              ? `Entrou como ${accountEmail}`
              : "Sessão de curadoria"
            : "Nada aqui vai para o banco de dados."}
        </span>
        <button disabled={editor.busy} onClick={onExit}>
          Ver o site
        </button>
        {onSignOut && (
          <button disabled={editor.busy} onClick={onSignOut}>
            Sair da conta
          </button>
        )}
      </div>
      {tab !== "preview" && (
        <main className="admin">
          <div className="eyebrow">DESVIO · GESTÃO DO ACERVO</div>
          <h1>Curadoria e organização</h1>
          <section className={onAir ? "site-status" : "site-status off-air"}>
            <p>
              <b>
                {onAir
                  ? `${counts.published} obra(s) publicada(s) no site.`
                  : "A exposição está fora do ar: o site não mostra obras."}
              </b>{" "}
              {onAir
                ? "Obras com status Publicada aparecem no site; ao salvar, as mudanças vão direto para lá."
                : "Coloque a exposição no ar em “Salas e exposição”."}
            </p>
            <button
              className="outline"
              disabled={editor.busy}
              onClick={() => {
                setFocusWork(undefined);
                setTab("preview");
              }}
            >
              Prévia 3D
            </button>
          </section>
          <div className="admin-tabs" role="tablist">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? "active" : undefined}
                disabled={editor.busy}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {editor.notice && !editor.draft && (
            <p className="editor-feedback" role="status">
              {editor.notice}
            </p>
          )}
          {tab === "records" && (
            <div className="admin-workspace">
              <section className="admin-records">
                <div className="admin-heading">
                  <h2>Obras</h2>
                  <button
                    disabled={editor.busy}
                    className="primary"
                    onClick={() => leaveRecord() && editor.create()}
                  >
                    + Nova obra
                  </button>
                </div>
                <div className="status-filter" aria-label="Filtrar por status">
                  <button
                    className={filter === "all" ? "active" : undefined}
                    onClick={() => setFilter("all")}
                  >
                    Todas ({records.length})
                  </button>
                  {RECORD_STATUSES.map((s) => (
                    <button
                      key={s}
                      className={filter === s ? "active" : undefined}
                      onClick={() => setFilter(s)}
                    >
                      {filterLabels[s]} ({counts[s]})
                    </button>
                  ))}
                </div>
                {visible.map((w) => (
                  <button
                    disabled={editor.busy}
                    key={w.record.id}
                    className={
                      editor.draft?.record.id === w.record.id
                        ? "record active"
                        : "record"
                    }
                    onClick={() => leaveRecord() && editor.edit(w.record.id)}
                  >
                    {w.image ? (
                      <img src={w.image} alt="" />
                    ) : (
                      <span className="record-icon">◈</span>
                    )}
                    <span>
                      <b>{w.record.title}</b>
                      <small>
                        {w.author}
                        {w.room && ` · ${w.room}`}
                      </small>
                      <span className={`status-pill status-${w.status}`}>
                        {recordStatusLabels[w.status]}
                      </span>
                    </span>
                  </button>
                ))}
                {!visible.length && (
                  <p className="editor-hint">Nenhuma obra com este status.</p>
                )}
                {!remote && (
                  <button
                    disabled={editor.busy}
                    className="reset-link"
                    onClick={() => void editor.reset()}
                  >
                    Restaurar acervo de exemplo
                  </button>
                )}
              </section>
              {editor.draft ? (
                <RecordEditor
                  draft={editor.draft}
                  snapshot={draft}
                  dirty={editor.dirty}
                  busy={editor.busy}
                  remote={remote}
                  onChange={editor.setDraft}
                  onPlace={editor.place}
                  onUpload={editor.upload}
                  onUploadAudio={editor.uploadAudio}
                  onSave={editor.save}
                  notice={editor.notice}
                  onSavePreview={async () => {
                    const id = editor.draft?.record.id;
                    if (await editor.save()) {
                      setFocusWork(id);
                      setTab("preview");
                    }
                  }}
                  onCancel={() => leaveRecord() && editor.discard()}
                  onDelete={editor.remove}
                  onSwap={editor.swap}
                />
              ) : (
                <section className="editor-panel">
                  <h2>Selecione uma obra</h2>
                  <p>
                    Escolha uma obra na lista para editar, ou crie uma nova.
                    Cada obra tem um status: <b>Publicada</b> aparece no site,{" "}
                    <b>Rascunho</b> fica só para a equipe e <b>Desativada</b>{" "}
                    fica guardada fora do site.
                  </p>
                </section>
              )}
            </div>
          )}
          {tab === "artists" && (
            <ArtistEditor
              key={state.revision}
              artists={draft.artists}
              busy={editor.busy}
              onSave={editor.saveArtist}
            />
          )}
          {tab === "exhibition" && (
            <>
              <RoomEditor
                key={`rooms-${state.revision}`}
                snapshot={draft}
                busy={editor.busy}
                onSave={editor.saveRoom}
                onDelete={editor.deleteRoom}
                onOrder={editor.reorderRooms}
              />
              <ExhibitionEditor
                key={`exhibition-${state.revision}`}
                snapshot={draft}
                live={onAir}
                busy={editor.busy}
                onSave={editor.saveExhibition}
                onPublish={editor.publish}
                onArchive={editor.archive}
              />
            </>
          )}
          {remote && loadLocalDraft && (
            <LocalImport
              repository={repository}
              revision={state.revision}
              load={loadLocalDraft}
              onChange={onChange}
            />
          )}
        </main>
      )}
      {tab === "preview" && (
        <>
          <div className="admin-preview-toolbar">
            <button onClick={() => setTab("records")}>
              ← Voltar ao editor
            </button>
            <span>
              Prévia com obras publicadas e rascunhos. Desativadas não aparecem.
            </span>
          </div>
          <VisitPage
            works={selectArtworks(draft)}
            rooms={draft.rooms}
            onSelect={setSelected}
            disabled={!!selected}
            initialWorkId={focusWork}
            initialGuided={false}
          />
        </>
      )}
      {selected && (
        <ArtworkDialog selected={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
