import type { Artist, Artwork } from "../../domain/entities";
export default function ArtistsPage({
  artists,
  works,
  onSelect: open,
}: {
  artists: Artist[];
  works: Artwork[];
  onSelect: (work: Artwork) => void;
}) {
  return (
    <main className="admin">
      <div className="eyebrow">DESVIO · PESSOAS ARTISTAS</div>
      <h1>Artistas do acervo</h1>
      <p>Conheça as trajetórias documentadas nesta pesquisa curatorial.</p>
      <div className="artist-grid">
        {artists.map((a) => (
          <article key={a.id}>
            {a.photo?.src && (
              <img
                className="artist-photo"
                src={a.photo.src}
                alt={`Retrato de ${a.name}`}
                loading="lazy"
              />
            )}
            <small>{a.location}</small>
            <h2>{a.name}</h2>
            <p>{a.bio}</p>
            <h3>Registros no Desvio</h3>
            {works
              .filter((w) => w.artistIds.includes(a.id))
              .map((w) => (
                <button
                  className="artist-work-link"
                  key={w.id}
                  onClick={() => open(w)}
                >
                  {w.title} ↗
                </button>
              ))}
            {a.source && (
              <a href={a.source} target="_blank" rel="noopener noreferrer">
                Fonte da trajetória ↗
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
