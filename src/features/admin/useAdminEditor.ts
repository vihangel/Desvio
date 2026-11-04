import { useState } from "react";
import type { CollectionState, RecordDraft } from "../../domain/entities";
import type { CollectionRepository } from "../../domain/repository";
import type { MediaService } from "../../domain/media";
import type { Access } from "../../domain/access";
import { useCollectionActions } from "./useCollectionActions";
import { useMediaUploads } from "./useMediaUploads";
import { useNotice } from "./useNotice";
import { useRecordDraft } from "./useRecordDraft";
import { useConfirm } from "./ui";
// Everything the admin screens do to the collection, in one object.
export function useAdminEditor(
  state: CollectionState,
  repository: CollectionRepository,
  onChange: (state: CollectionState) => void,
  mediaService: MediaService,
  access: Access,
) {
  const confirm = useConfirm();
  const notices = useNotice();
  const { notify } = notices;
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const actions = useCollectionActions(
    state,
    repository,
    onChange,
    mediaService,
    notify,
  );
  const uploads = useMediaUploads({
    draft,
    setDraft,
    mediaService,
    remote: repository.mode === "supabase",
    actions,
    notify,
    confirm,
  });
  const record = useRecordDraft({
    draft,
    setDraft,
    state,
    repository,
    access,
    actions,
    notify,
    releaseUnsaved: uploads.releaseUnsaved,
  });
  return {
    ...notices,
    ...actions,
    ...uploads,
    ...record,
    draft,
    setDraft,
  };
}
export type AdminEditor = ReturnType<typeof useAdminEditor>;
