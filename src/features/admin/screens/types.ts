import type {
  CollectionSnapshot,
  CollectionState,
} from "../../../domain/entities";
import type { Access } from "../../../domain/access";
import type { AdminEditor } from "../useAdminEditor";
import type { AdminSection } from "../useAdminRoute";
// What every admin screen works with.
export type AdminContext = {
  state: CollectionState;
  // The collection as this person may see it (artists: only their rooms).
  view: CollectionSnapshot;
  access: Access;
  curator: boolean;
  remote: boolean;
  editor: AdminEditor;
  setDirty: (dirty: boolean) => void;
  // Ask before leaving unsaved changes.
  open: (section: AdminSection, id?: string) => void;
  // Back to a list when nothing is left to lose.
  toList: (section: AdminSection) => void;
  // Replaces "nova" in the address once the new item has its id.
  replaceWithSaved: (section: AdminSection, id: string) => Promise<boolean>;
};
