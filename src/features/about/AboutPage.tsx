// Institutional page outlined in docs/ROADMAP.md (M5). The wording follows
// the roadmap's base text and still awaits editorial approval.
const sections = [
  { id: "o-que-e", title: "O que é o Desvio?" },
  { id: "por-que", title: "Por que um acervo de arte dissidente?" },
  { id: "quem", title: "Quem constrói" },
  { id: "residencias", title: "Residências" },
  { id: "visitar", title: "Como visitar" },
  { id: "participar", title: "Como participar" },
  { id: "direitos", title: "Direitos e ética" },
  { id: "transparencia", title: "Etapas e transparência" },
];
export default function AboutPage({
  onVisit,
  onCollection,
}: {
  onVisit: () => void;
  onCollection: () => void;
}) {
  return (
    <main className="admin about-page">
      <div className="eyebrow">DESVIO · SOBRE O MUSEU</div>
      <h1>Sobre o Desvio</h1>
      <p className="about-lead">
        O Museu do Desvio é uma iniciativa virtual dedicada à valorização,
        preservação e circulação de produções artísticas dissidentes em Mato
        Grosso.
      </p>
      <nav className="about-index" aria-label="Nesta página">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>
      <section id="o-que-e">
        <h2>O que é o Desvio?</h2>
        <p>
          Um museu virtual que busca construir um espaço de memória, encontro e
          experimentação, em diálogo com as pessoas artistas e suas próprias
          propostas expográficas. O acervo combina obras em duas e três
          dimensões, exposições temporárias e novas linguagens imersivas,
          respeitando autoria, contexto, acessibilidade e direitos de
          reprodução.
        </p>
        <p>
          Mais do que uma cópia digital de salas físicas, o Desvio quer permitir
          contemplar obras em 2D, experienciar objetos 3D e acessar narrativas
          contextualizadas, com liberdade para visitas não lineares. A
          tecnologia é meio de mediação, não um fim em si.
        </p>
      </section>
      <section id="por-que">
        <h2>Por que um acervo de arte dissidente?</h2>
        <p>
          Para guardar memória, fazer circular e abrir espaço para
          experimentação e preservação de produções que costumam ficar fora dos
          circuitos tradicionais, sem reduzir trajetórias a sofrimento.
        </p>
      </section>
      <section id="quem">
        <h2>Quem constrói</h2>
        <p>
          Direção de <b>Linscker Marim</b>. Codireção e desenvolvimento de{" "}
          <b>Vih Angel</b>.
        </p>
        <p>
          Pessoas curadoras e residentes são apresentadas aqui depois que a
          participação de cada uma é confirmada.
        </p>
      </section>
      <section id="residencias">
        <h2>Residências</h2>
        <p>
          A proposta é que pessoas artistas residentes tenham uma sala própria
          no museu, sejam autoras da expografia dessa sala e possam atualizar
          suas exposições ao longo do tempo, com revisão curatorial. As
          exposições anteriores ficam registradas como arquivo histórico.
        </p>
        <p>
          As condições de cada residência são combinadas diretamente com a
          equipe e publicadas em uma política própria.
        </p>
      </section>
      <section id="visitar">
        <h2>Como visitar</h2>
        <ul>
          <li>
            <b>Visita livre:</b> caminhe pelas salas do Museu 3D no seu ritmo,
            pelo teclado ou pelos controles na tela do celular.
          </li>
          <li>
            <b>Visita guiada:</b> siga um percurso pelas obras com a ficha de
            cada uma.
          </li>
          <li>
            <b>Acervo:</b> veja as obras em lista, com descrições, créditos e
            fontes, sem precisar da visita 3D.
          </li>
        </ul>
        <div className="about-actions">
          <button className="primary" onClick={onVisit}>
            Entrar no Museu 3D
          </button>
          <button className="outline" onClick={onCollection}>
            Ver o acervo
          </button>
        </div>
      </section>
      <section id="participar">
        <h2>Como participar</h2>
        <p>
          Propostas artísticas, parcerias, sugestões e pedidos de correção são
          bem-vindos. Os canais oficiais de contato estão sendo definidos pela
          equipe e serão publicados aqui.
        </p>
      </section>
      <section id="direitos">
        <h2>Direitos e ética</h2>
        <p>
          Cada obra traz créditos de autoria e da mídia. Reproduções e versões
          digitais só são publicadas com autorização, e imagens de catálogo
          usadas na montagem são identificadas como tal. Pessoas artistas podem
          pedir correções ou a retirada de conteúdo a qualquer momento.
        </p>
      </section>
      <section id="transparencia">
        <h2>Etapas e transparência</h2>
        <p>
          O Desvio está em fase de construção. Nesta etapa, não há financiamento
          e o trabalho é voluntário. Eventuais editais futuros serão comunicados
          aqui, sem promessas antecipadas.
        </p>
      </section>
    </main>
  );
}
