export function NotFound({
  text,
  onBack,
}: {
  text: string;
  onBack: () => void;
}) {
  return (
    <div className="empty-state">
      <p>{text}</p>
      <button type="button" className="outline" onClick={onBack}>
        Voltar à lista
      </button>
    </div>
  );
}
