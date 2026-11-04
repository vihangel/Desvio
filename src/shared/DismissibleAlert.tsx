// A problem shown across the top of the page, with one way to act on it.
export default function DismissibleAlert({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div role="alert" className="connection-alert">
      <span>{text}</span>
      <button className="outline" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
