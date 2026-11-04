// The message to show for anything thrown, with a fallback for non-errors.
export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;
