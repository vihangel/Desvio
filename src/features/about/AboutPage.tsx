import {
  ArrowRight,
  Compass,
  Footprints,
  Library,
  MessageCircle,
  Scale,
  Sprout,
} from "lucide-react";
// Institutional page outlined in docs/ROADMAP.md (M5). The wording follows
// the roadmap's base text and still awaits editorial approval.
const facts = [
  ["Onde", "Museu virtual, a partir de Mato Grosso"],
  ["O quê", "Obras em 2D, 3D e vídeo, com narrativas"],
  ["Fase", "Em construção, com trabalho voluntário"],
];
const residency = [
  ["Sala própria", "Cada pessoa residente tem uma sala no museu."],
  ["Autoria da expografia", "A pessoa artista decide como montar a sala."],
  ["Revisão curatorial", "A curadoria acompanha e revisa as propostas."],
  ["Arquivo histórico", "Exposições anteriores ficam registradas."],
];
export default function AboutPage({
  onVisit,
  onCollection,
}: {
  onVisit: (guided?: boolean) => void;
  onCollection: () => void;
}) {
  return (
    <main className="about">
      <section className="about-hero">
        <div>
          <div className="eyebrow">SOBRE O MUSEU</div>
          <h1>
            Sobre o <em>Desvio</em>
          </h1>
          <p>
            O Museu do Desvio é uma iniciativa virtual dedicada à valorização,
            preservação e circulação de produções artísticas dissidentes em Mato
            Grosso.
          </p>
        </div>
        <dl className="about-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="about-strip" aria-hidden="true">
        <img src="/art/desvio-fios.svg" alt="" />
        <img src="/art/desvio-manga.svg" alt="" />
        <img src="/art/desvio-homem.svg" alt="" />
        <img src="/art/desvio-transformacao.svg" alt="" />
      </div>

      <section className="about-row" id="o-que-e">
        <h2>
          <span>01</span> O que é o Desvio?
        </h2>
        <div>
          <p className="about-quote">
            Um espaço de memória, encontro e experimentação, em diálogo com as
            pessoas artistas e suas próprias propostas expográficas.
          </p>
          <p>
            O acervo combina obras em duas e três dimensões, exposições
            temporárias e novas linguagens imersivas, respeitando autoria,
            contexto, acessibilidade e direitos de reprodução.
          </p>
          <p>
            Mais do que copiar salas físicas, o Desvio quer permitir contemplar
            obras em 2D, experienciar objetos 3D e acessar narrativas de forma
            mais acessível a todos.
          </p>
        </div>
      </section>

      <section className="about-row" id="por-que">
        <h2>
          <span>02</span> Por que um acervo de arte dissidente?
        </h2>
        <div>
          <p>
            Para guardar memória, fazer circular e abrir espaço para
            experimentação e preservação de produções que costumam ficar fora
            dos circuitos tradicionais.
          </p>
        </div>
      </section>

      <section className="about-row" id="quem">
        <h2>
          <span>03</span> Quem constrói
        </h2>
        <div>
          <ul className="about-people">
            <li>
              <span aria-hidden="true">LM</span>
              <b>Linscker Marim</b>
              <small>Direção</small>
            </li>
            <li>
              <span aria-hidden="true">VA</span>
              <b>Vih Angel</b>
              <small>Codireção e desenvolvimento</small>
            </li>
          </ul>
        </div>
      </section>

      <section className="about-band" id="residencias">
        <div className="about-band-inner">
          <div className="eyebrow">04 · RESIDÊNCIAS</div>
          <h2>Uma sala para cada pessoa residente</h2>
          <ol>
            {residency.map(([title, text]) => (
              <li key={title}>
                <b>{title}</b>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p>
            As condições de cada residência são combinadas diretamente com a
            equipe e publicadas em uma política própria.
          </p>
        </div>
      </section>

      <section className="about-visit" id="visitar">
        <h2>
          <span>05</span> Como visitar
        </h2>
        <div className="about-cards">
          <button className="about-card" onClick={() => onVisit(false)}>
            <Footprints size={22} aria-hidden="true" />
            <b>Visita livre</b>
            <span>
              Caminhe pelas salas do Museu 3D no seu ritmo, pelo teclado ou
              pelos controles na tela do celular.
            </span>
            <em>
              Entrar no museu <ArrowRight size={15} aria-hidden="true" />
            </em>
          </button>
          <button className="about-card" onClick={() => onVisit(true)}>
            <Compass size={22} aria-hidden="true" />
            <b>Visita guiada</b>
            <span>Siga um percurso pelas obras, com a ficha de cada uma.</span>
            <em>
              Começar a visita <ArrowRight size={15} aria-hidden="true" />
            </em>
          </button>
          <button className="about-card" onClick={onCollection}>
            <Library size={22} aria-hidden="true" />
            <b>Acervo</b>
            <span>
              Veja as obras em lista, com descrições, créditos e fontes, sem
              precisar da visita 3D.
            </span>
            <em>
              Ver o acervo <ArrowRight size={15} aria-hidden="true" />
            </em>
          </button>
        </div>
      </section>

      <section className="about-closing">
        <article id="participar">
          <MessageCircle size={22} aria-hidden="true" />
          <h2>Como participar</h2>
          <p>
            Propostas artísticas, parcerias, sugestões e pedidos de correção são
            bem-vindos. Os canais oficiais de contato estão sendo definidos pela
            equipe e serão publicados aqui.
          </p>
        </article>
        <article id="direitos">
          <Scale size={22} aria-hidden="true" />
          <h2>Direitos e ética</h2>
          <p>
            Cada obra traz créditos de autoria e da mídia. Reproduções e versões
            digitais só são publicadas com autorização, e imagens de catálogo
            usadas na montagem são identificadas como tal. Pedidos de correção
            ou retirada são atendidos pela equipe.
          </p>
        </article>
        <article id="transparencia">
          <Sprout size={22} aria-hidden="true" />
          <h2>Etapas e transparência</h2>
          <p>
            O Desvio está em construção. Nesta etapa, não há financiamento e o
            trabalho é voluntário. Eventuais editais futuros serão comunicados
            aqui.
          </p>
        </article>
      </section>
    </main>
  );
}
