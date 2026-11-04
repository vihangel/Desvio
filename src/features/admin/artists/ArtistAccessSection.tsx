import { useState } from "react";
import type { Artist, ExhibitionRoom } from "../../../domain/entities";
import type { AccessCredentials } from "../../../domain/accounts";
import type { ArtistAccounts } from "../useArtistAccounts";
import { Section, TextField, useConfirm } from "../ui";
import CredentialsCard from "./CredentialsCard";
// The login of an artist: rooms it unlocks, password and removal.
export default function ArtistAccessSection({
  artist,
  rooms,
  accounts,
  busy,
  onOpenRooms,
}: {
  artist: Artist;
  rooms: ExhibitionRoom[];
  accounts: ArtistAccounts;
  busy: boolean;
  onOpenRooms: () => void;
}) {
  const [email, setEmail] = useState("");
  const [credentials, setCredentials] = useState<AccessCredentials>();
  const confirm = useConfirm();
  const linked = accounts.accounts?.filter((a) => a.artistId === artist.id);
  const createAccess = async () => {
    const created = await accounts.create(email, artist.id);
    if (created) {
      setCredentials(created);
      setEmail("");
    }
  };
  return (
    <Section
      title="Acesso da pessoa artista"
      description="Com acesso, a pessoa entra em /admin e edita as salas vinculadas a ela e as obras dessas salas. As obras que ela salvar voltam para a curadoria antes de aparecer no site."
    >
      <p className={rooms.length ? "callout" : "callout callout-warning"}>
        {rooms.length
          ? `Salas vinculadas: ${rooms.map((r) => r.name).join(", ")}.`
          : "Nenhuma sala vinculada ainda. Sem sala, a pessoa entra mas não tem o que editar."}{" "}
        <button type="button" className="link-button" onClick={onOpenRooms}>
          Gerenciar salas
        </button>
      </p>
      {credentials && (
        <CredentialsCard
          artistName={artist.name}
          credentials={credentials}
          onClose={() => setCredentials(undefined)}
        />
      )}
      {linked?.map((account) => (
        <div key={account.userId} className="account-row">
          <span>
            <b>{account.email}</b>
            <small>
              {account.lastSignInAt
                ? `Último acesso em ${new Date(account.lastSignInAt).toLocaleDateString("pt-BR")}`
                : "Ainda não entrou"}
            </small>
          </span>
          <span className="inline-actions">
            <button
              type="button"
              className="outline"
              onClick={async () => {
                if (
                  await confirm({
                    title: "Gerar uma nova senha?",
                    body: "A senha atual deixa de funcionar. Você vai copiar a nova e enviar para a pessoa.",
                    confirmLabel: "Gerar nova senha",
                  })
                ) {
                  const next = await accounts.resetPassword(account);
                  if (next) setCredentials(next);
                }
              }}
            >
              Gerar nova senha
            </button>
            <button
              type="button"
              className="danger-outline"
              onClick={() => void accounts.remove(account)}
            >
              Remover acesso
            </button>
          </span>
        </div>
      ))}
      {!linked?.length && (
        <div
          className="invite-form"
          onKeyDown={(e) => {
            // Inside the profile form, Enter here creates the access only.
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (email.trim()) void createAccess();
          }}
        >
          <TextField
            label="E-mail da pessoa"
            hint="Cria o acesso na hora, com uma senha gerada. Nenhum e-mail é enviado: você copia os dados e manda para a pessoa."
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={setEmail}
          />
          <button
            type="button"
            className="outline"
            disabled={busy || !email.trim()}
            onClick={() => void createAccess()}
          >
            Criar acesso
          </button>
        </div>
      )}
    </Section>
  );
}
