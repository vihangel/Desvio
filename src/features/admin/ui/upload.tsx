import type { ReactNode } from "react";
// The file picker itself. The input is cleared so the same file can be picked
// again after an error.
export function FileButton({
  label,
  accept,
  onFile,
}: {
  label: string;
  accept: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className="file-button">
      {label}
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
// A file field: what is attached now, an optional preview, and how to change it.
export function UploadBox({
  label,
  status,
  tone,
  children,
  buttonLabel,
  accept,
  onFile,
  error,
  hint,
  footer,
}: {
  label: string;
  status: string;
  tone?: "ok" | "missing";
  children?: ReactNode;
  buttonLabel: string;
  accept: string;
  onFile: (file: File) => void;
  error?: string;
  hint: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="upload-box">
      <span className="field-label">{label}</span>
      <p className={tone ? `file-status ${tone}` : "file-status"}>{status}</p>
      {children}
      <FileButton label={buttonLabel} accept={accept} onFile={onFile} />
      {error && (
        <p className="file-status missing" role="alert">
          {error}
        </p>
      )}
      {footer}
      <small className="field-hint">{hint}</small>
    </div>
  );
}
