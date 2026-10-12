import type { Artwork } from "../../domain/entities";
export default function CatalogPage({
  works,
  onSelect: open,
}: {
  works: Artwork[];
  onSelect: (work: Artwork) => void;
}) {
  return (
    <main className="admin public-collection">
      <div className="eyebrow">DESVIO · ACERVO TRANS DE MATO GROSSO</div>
      <h1>Obras e projetos</h1>
      <p>
        Explore os registros curatoriais e as fontes públicas. Os painéis são
        ilustrativos e não reproduzem obras originais.
      </p>
      <div className="public-work-grid">
        {works
          .filter((w) => w.rights !== "demo")
          .map((w) => (
            <button
              key={w.id}
              onClick={() => open(w)}
              className="public-work-card"
            >
              {w.image && (
                <img src={w.image} alt={"Painel editorial: " + w.title} />
              )}
              <span className="public-work-copy">
                <small>
                  {w.kind || "Registro"} · {w.year ?? "Ano a confirmar"}
                </small>
                <b>{w.title}</b>
                <span>{w.author}</span>
                <span className="view-details">Conhecer registro ↗</span>
              </span>
            </button>
          ))}
      </div>
    </main>
  );
}
