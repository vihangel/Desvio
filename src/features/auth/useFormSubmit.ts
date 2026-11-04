import { useState, type FormEvent } from "react";
import { errorMessage } from "../../domain/errors";
// Submit state shared by the sign-in forms: busy flag and readable error.
export function useFormSubmit(fallback: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = (task: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (failure) {
      setError(errorMessage(failure, fallback));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, submit };
}
