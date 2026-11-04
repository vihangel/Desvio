import { useState } from "react";
import type { Artwork } from "../../../domain/entities";
import { selectArtworks } from "../../../domain/selectors";
import ArtworkDialog from "../../../shared/ArtworkDialog";
import VisitPage from "../../visit/VisitPage";
import type { AdminContext } from "./types";
// The 3D museum with drafts included, opened on the work being edited.
export function PreviewScreen({
  admin,
  focus,
}: {
  admin: AdminContext;
  focus?: string;
}) {
  const { view, open } = admin;
  const [selected, setSelected] = useState<Artwork | null>(null);
  return (
    <>
      <div className="admin-preview-toolbar">
        <button
          type="button"
          onClick={() => (focus ? open("works", focus) : open("works"))}
        >
          ← Voltar
        </button>
        <span>
          Inclui rascunhos. Visitantes só veem as obras publicadas; desativadas
          não aparecem.
        </span>
      </div>
      <VisitPage
        key={focus ?? "preview"}
        works={selectArtworks(view)}
        rooms={view.rooms}
        onSelect={setSelected}
        disabled={!!selected}
        initialWorkId={focus}
        initialGuided={false}
      />
      {selected && (
        <ArtworkDialog selected={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
