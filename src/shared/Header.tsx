type Page = "home" | "visit" | "catalog" | "artists";
export default function Header({ go }: { go: (page: Page) => void }) {
  return (
    <header>
      <button
        className="brand"
        aria-label="Desvio — início"
        onClick={() => go("home")}
      >
        <img
          src="/brand/desvio-logo.svg"
          alt="Desvio"
          width={132}
          height={45}
        />
        <small aria-hidden="true">MUSEU VIRTUAL</small>
      </button>
      <nav aria-label="Navegação principal">
        <button onClick={() => go("home")}>Início</button>
        <button onClick={() => go("visit")}>Museu 3D</button>
        <button onClick={() => go("catalog")}>Obras</button>
        <button onClick={() => go("artists")}>Artistas</button>
      </nav>
    </header>
  );
}
