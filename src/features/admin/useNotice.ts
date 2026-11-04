import { useCallback, useState } from "react";
export type Notice = {
  id: number;
  text: string;
  kind: "success" | "error" | "info";
};
export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = useCallback(
    (text: string, kind: Notice["kind"] = "info") =>
      setNotice({ id: Date.now(), text, kind }),
    [],
  );
  const dismissNotice = useCallback(() => setNotice(null), []);
  return { notice, notify, dismissNotice };
}
export type Notify = ReturnType<typeof useNotice>["notify"];
