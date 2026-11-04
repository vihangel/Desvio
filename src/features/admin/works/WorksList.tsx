import { useState } from "react";
import type { CollectionSnapshot } from "../../../domain/entities";
import {
  RECORD_STATUSES,
  asRecordStatus,
  recordStatusLabels,
  type RecordStatus,
} from "../../../domain/publication";
import { canEditRecord, type Access } from "../../../domain/access";
import { ItemCard, ListPage, StatusPill } from "../ui";
const filterLabels: Record<RecordStatus, string> = {
  published: "Publicadas",
  draft: "Rascunhos",
  archived: "Desativadas",
};
const mediaIcons = { video: "▶", model: "◈", image: "▣" };
type Filter = RecordStatus | "review" | "all";
function workItems(snapshot: CollectionSnapshot, access: Access) {
  return snapshot.records
    .filter((record) => canEditRecord(access, snapshot, record.id))
    .map((record) => {
      const media = snapshot.media.find((m) => m.recordId === record.id);
      const placement = snapshot.placements.find(
        (p) => p.recordId === record.id,
      );
      return {
        record,
        status: asRecordStatus(record.status),
        image: media?.type === "image" ? media.src : undefined,
        icon: mediaIcons[media?.type ?? "image"],
        author: [
          ...record.credits.map(
            (c) => snapshot.artists.find((a) => a.id === c.artistId)?.name,
          ),
          record.creditNote,
        ]
          .filter(Boolean)
          .join(" e "),
        room: snapshot.rooms.find((r) => r.id === placement?.roomId)?.name,
      };
    });
}
type WorkItem = ReturnType<typeof workItems>[number];
const matchesFilter = (work: WorkItem, filter: Filter) =>
  filter === "all" ||
  (filter === "review"
    ? !!work.record.reviewRequested
    : work.status === filter);
export default function WorksList({
  snapshot,
  access,
  onOpen,
  onCreate,
  canCreate,
}: {
  snapshot: CollectionSnapshot;
  access: Access;
  onOpen: (id: string) => void;
  onCreate: () => void;
  canCreate: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const artist = access.kind === "artist";
  const works = workItems(snapshot, access);
  const count = (f: Filter) => works.filter((w) => matchesFilter(w, f)).length;
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const visible = works.filter(
    (w) =>
      matchesFilter(w, filter) &&
      (!term ||
        `${w.record.title} ${w.author} ${w.room}`
          .toLocaleLowerCase("pt-BR")
          .includes(term)),
  );
  const filters: Filter[] = [
    "all",
    ...(count("review") ? (["review"] as const) : []),
    ...RECORD_STATUSES,
  ];
  return (
    <ListPage
      title={artist ? "Obras das suas salas" : "Obras"}
      description={
        artist
          ? "Toque em uma obra para editar. Obras novas ou editadas vão para a curadoria antes de aparecer no site."
          : "Toque em uma obra para editar. Só obras Publicadas aparecem no site."
      }
      action={
        canCreate && (
          <button type="button" className="primary" onClick={onCreate}>
            + Nova obra
          </button>
        )
      }
    >
      <div className="list-tools">
        <input
          type="search"
          placeholder="Buscar por título, artista ou sala"
          aria-label="Buscar obras"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chip-row" role="group" aria-label="Filtrar por status">
          {filters.map((f) => (
            <button
              type="button"
              key={f}
              aria-pressed={filter === f}
              className={filter === f ? "chip active" : "chip"}
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? "Todas"
                : f === "review"
                  ? artist
                    ? "Em revisão"
                    : "Para revisar"
                  : filterLabels[f]}{" "}
              <span>{count(f)}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="card-list">
        {visible.map((w) => (
          <li key={w.record.id}>
            <ItemCard
              thumb={
                w.image ? (
                  <img src={w.image} alt="" />
                ) : (
                  <span className="item-thumb" aria-hidden="true">
                    {w.icon}
                  </span>
                )
              }
              onOpen={() => onOpen(w.record.id)}
            >
              <b>{w.record.title}</b>
              <small>{[w.author, w.room].filter(Boolean).join(" · ")}</small>
              <span className="item-pills">
                <StatusPill tone={w.status}>
                  {artist && w.status === "published"
                    ? "No site"
                    : recordStatusLabels[w.status]}
                </StatusPill>
                {w.record.reviewRequested && (
                  <StatusPill tone="review">
                    {artist ? "Em revisão" : "Enviada pela pessoa artista"}
                  </StatusPill>
                )}
              </span>
            </ItemCard>
          </li>
        ))}
      </ul>
      {!visible.length && (
        <p className="empty-state">
          {works.length
            ? "Nenhuma obra encontrada com esses filtros."
            : artist
              ? "Ainda não há obras nas suas salas."
              : "Nenhuma obra cadastrada."}
        </p>
      )}
    </ListPage>
  );
}
