import { ArrowRight, Compass, Footprints } from "lucide-react";
import type { CollectionSnapshot } from "../../domain/entities";
import { selectArtworks } from "../../domain/selectors";
export default function HomePage({
  snapshot,
  onVisit,
}: {
  snapshot: CollectionSnapshot;
  onVisit: (guided: boolean) => void;
}) {
  const artists = snapshot.artists;
  const works = selectArtworks(snapshot);
  return (
    <main className="home">
      <div className="eyebrow">
        ACERVO TRANS DE MATO GROSSO · PESQUISA CURATORIAL
      </div>
      <h1>
        Outras formas
        <br />
        de <em>existir.</em>
      </h1>
      <p>
        Conheça produções trans de Mato Grosso, entre artes visuais, moda e
        audiovisual. Um acervo em construção que começa com Linscker Marim e O
        Sol Ferreira.
      </p>
      <div className="actions">
        <button
          className="primary"
          onClick={() => {
            onVisit(false);
          }}
        >
          <Footprints size={18} /> Explorar livremente <ArrowRight size={17} />
        </button>
        <button
          className="outline"
          onClick={() => {
            onVisit(true);
          }}
        >
          <Compass size={18} /> Visita guiada
        </button>
      </div>
      <section className="feature">
        <div>
          <small>EM EXPOSIÇÃO</small>
          <h2>{snapshot.exhibition.title}</h2>
          <p>
            Esta mostra de pesquisa reúne projetos documentados, painéis
            editoriais e imagens de catálogo para experimentar a montagem.
          </p>
          <span>
            {snapshot.rooms.length} salas · {artists.length} artistas ·{" "}
            {works.filter((w) => w.rights !== "demo").length} registros de
            pesquisa
          </span>
        </div>
        <div className="triptych">
          <img
            src="/art/desvio-fios.svg"
            alt="Painel editorial fios e tramas"
          />
          <img src="/art/desvio-homem.svg" alt="Painel editorial homem-mato" />
          <img
            src="/art/desvio-transformacao.svg"
            alt="Painel editorial videoarte"
          />
        </div>
      </section>
      <div className="artist-grid">
        {artists.map((a) => (
          <article key={a.id}>
            <small>{a.location}</small>
            <h2>{a.name}</h2>
            <p>{a.bio}</p>
            <a href={a.source} target="_blank" rel="noopener noreferrer">
              Conhecer referência ↗
            </a>
          </article>
        ))}
      </div>
      <p className="curatorial-warning">
        Prévia curatorial independente. As pessoas artistas ainda não estão
        vinculadas à plataforma. A reprodução das obras dependerá de
        autorização.
      </p>
    </main>
  );
}
