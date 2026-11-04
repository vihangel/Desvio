import type { Artist } from "../../domain/entities";
import type { Access } from "../../domain/access";
// Who is signed in and how to leave. In the demo it also previews each role.
export default function AdminBanner({
  access,
  artists,
  remote,
  accountEmail,
  onDemoAccess,
  onExit,
  onChangePassword,
  onSignOut,
}: {
  access: Access;
  artists: Artist[];
  remote: boolean;
  accountEmail?: string;
  onDemoAccess: (artistId: string) => void;
  onExit: () => void;
  onChangePassword?: () => void;
  onSignOut?: () => void;
}) {
  const artistName =
    access.kind === "artist"
      ? artists.find((a) => a.id === access.artistId)?.name
      : undefined;
  return (
    <section className="admin-preview-banner" aria-label="Sessão">
      <b>
        {access.kind === "artist"
          ? `Área da pessoa artista${artistName ? ` · ${artistName}` : ""}`
          : remote
            ? "Curadoria"
            : "Modo demonstrativo"}
      </b>
      <span>
        {remote ? accountEmail : "Nada aqui vai para o banco de dados."}
      </span>
      {!remote && (
        <label className="demo-access">
          Ver como
          <select
            value={access.kind === "artist" ? access.artistId : ""}
            onChange={(e) => onDemoAccess(e.target.value)}
          >
            <option value="">Curadoria</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <button type="button" onClick={onExit}>
        Ver o site
      </button>
      {onChangePassword && (
        <button type="button" onClick={onChangePassword}>
          Trocar senha
        </button>
      )}
      {onSignOut && (
        <button type="button" onClick={onSignOut}>
          Sair
        </button>
      )}
    </section>
  );
}
