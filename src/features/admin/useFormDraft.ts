import { useEffect, useState } from "react";
// Local copy of an item being edited. Reports unsaved changes to the admin so
// leaving the screen can ask first.
export function useFormDraft<T>(
  initial: T,
  isNew: boolean,
  onDirty: (dirty: boolean) => void,
) {
  const [value, setValue] = useState(initial);
  const dirty = isNew || JSON.stringify(value) !== JSON.stringify(initial);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  return { value, setValue, dirty, reset: () => setValue(initial) };
}
