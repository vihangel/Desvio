import type {
  CollectionSnapshot,
  CollectionState,
  EditorialStatus,
} from "./entities";
// Each work has its own status. Visitors see the works marked "published";
// the exhibition status only says whether the whole site is on air.
export const RECORD_STATUSES = ["published", "draft", "archived"] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];
export const recordStatusLabels: Record<RecordStatus, string> = {
  published: "Publicada",
  draft: "Rascunho",
  archived: "Desativada",
};
export const recordStatusHints: Record<RecordStatus, string> = {
  published: "Aparece no site. Ao salvar, as mudanças vão direto para o site.",
  draft: "Fica salva só para a equipe e aparece na prévia 3D.",
  archived: "Fica guardada, fora do site e da prévia 3D.",
};
export const asRecordStatus = (status: EditorialStatus): RecordStatus =>
  status === "in_review" ? "draft" : status;
export const isOnAir = (snapshot: CollectionSnapshot) =>
  snapshot.exhibition.status !== "archived";
export function publicEdition(draft: CollectionSnapshot): CollectionSnapshot {
  const live = new Set(
    draft.records.filter((r) => r.status === "published").map((r) => r.id),
  );
  return structuredClone({
    ...draft,
    exhibition: {
      ...draft.exhibition,
      status: isOnAir(draft) ? "published" : "archived",
    },
    records: draft.records.filter((r) => live.has(r.id)),
    media: draft.media.filter((m) => live.has(m.recordId)),
    placements: draft.placements.filter((p) => live.has(p.recordId)),
  });
}
// States saved before per-work status: whatever was on the site is published.
export function withRecordStatuses(state: CollectionState): CollectionState {
  if (
    state.draft.records.every((r) => r.status !== "in_review") &&
    state.draft.exhibition.status !== "draft" &&
    state.draft.exhibition.status !== "in_review"
  )
    return state;
  const next = structuredClone(state);
  const onSite = new Set(next.published.records.map((r) => r.id));
  next.draft.records.forEach((r) => {
    if (r.status !== "archived")
      r.status = onSite.has(r.id) ? "published" : "draft";
  });
  next.draft.exhibition.status =
    next.published.exhibition.status === "archived" ? "archived" : "published";
  return next;
}
