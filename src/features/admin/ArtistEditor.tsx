import { useEffect, useState } from "react";
import type { Artist, CollectionSnapshot } from "../../domain/entities";
import type { AccessCredentials, ArtistAccount } from "../../domain/accounts";
import { Field, FormPage, Section, StatusPill, useConfirm } from "./ui";
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "?";
export function Avatar({
  artist,
  size = 48,
}: {
  artist: Artist;
  size?: number;
}) {
  return artist.photo?.src ? (
    <img
      className="avatar"
      src={artist.photo.src}
      alt=""
      width={size}
      height={size}
    />
  ) : (
    <span
      className="avatar avatar-initials"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials(artist.name)}
    </span>
  );
}
export function ArtistsList({
  snapshot,
  accounts,
  onOpen,
  onCreate,
}: {
  snapshot: CollectionSnapshot;
  accounts?: ArtistAccount[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <section className="list-page">
      <div className="list-header">
        <div>
          <h1>Pessoas artistas</h1>
          <p className="section-description">
            Perfis exibidos na página Artistas. Toque para editar, trocar a foto
            ou convidar a pessoa para cuidar das próprias salas.
          </p>
        </div>
        <button className="primary" onClick={onCreate}>
          + Nova pessoa artista
        </button>
      </div>
      <ul className="card-list">
        {snapshot.artists.map((artist) => {
          const works = snapshot.records.filter((r) =>
            r.credits.some((c) => c.artistId === artist.id),
          ).length;
          const account = accounts?.find((a) => a.artistId === artist.id);
          return (
            <li key={artist.id}>
              <button className="item-card" onClick={() => onOpen(artist.id)}>
                <Avatar artist={artist} />
                <span className="item-text">
                  <b>{artist.name}</b>
                  <small>
                    {[artist.location, `${works} obra(s)`]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                  {account && (
                    <span className="item-pills">
                      <StatusPill
                        tone={account.lastSignInAt ? "published" : "draft"}
                      >
                        {account.lastSignInAt
                          ? "Tem acesso"
                          : "Ainda não entrou"}
                      </StatusPill>
                    </span>
                  )}
                </span>
                <span className="item-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!snapshot.artists.length && (
        <p className="empty-state">Nenhuma pessoa artista cadastrada.</p>
      )}
    </section>
  );
}
export default function ArtistEditor({
  initial,
  isNew,
  snapshot,
  busy,
  remote,
  accounts,
  onSave,
  onDelete,
  onBack,
  onUploadPhoto,
  onDirty,
  onCreateAccess,
  onResetPassword,
  onRemoveAccount,
  onOpenRooms,
}: {
  initial: Artist;
  isNew: boolean;
  snapshot: CollectionSnapshot;
  busy: boolean;
  remote: boolean;
  accounts?: ArtistAccount[];
  onSave: (artist: Artist) => Promise<boolean>;
  onDelete: (artist: Artist) => void;
  onBack: () => void;
  onUploadPhoto: (file: File) => Promise<Artist["photo"]>;
  onDirty: (dirty: boolean) => void;
  onCreateAccess?: (email: string) => Promise<AccessCredentials | undefined>;
  onResetPassword?: (
    account: ArtistAccount,
  ) => Promise<AccessCredentials | undefined>;
  onRemoveAccount?: (account: ArtistAccount) => Promise<void>;
  onOpenRooms: () => void;
}) {
  const [artist, setArtist] = useState(initial);
  const [email, setEmail] = useState("");
  const [credentials, setCredentials] = useState<AccessCredentials>();
  const confirm = useConfirm();
  const dirty = isNew || JSON.stringify(artist) !== JSON.stringify(initial);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const rooms = snapshot.rooms.filter((r) => r.artistIds?.includes(artist.id));
  const works = snapshot.records.filter((r) =>
    r.credits.some((c) => c.artistId === artist.id),
  );
  const linked = accounts?.filter((a) => a.artistId === artist.id) ?? [];
  return (
    <FormPage
      title={isNew ? "Nova pessoa artista" : initial.name}
      backLabel="Artistas"
      onBack={onBack}
      badge={
        dirty && !isNew ? (
          <StatusPill tone="unsaved">Alterações não salvas</StatusPill>
        ) : undefined
      }
      actions={
        <>
          <button
            className="primary"
            disabled={busy || !dirty}
            onClick={() => void onSave(artist)}
          >
            {busy ? "Salvando…" : "Salvar"}
          </button>
          {dirty && !isNew && (
            <button
              className="link-button"
              disabled={busy}
              onClick={() => setArtist(initial)}
            >
              Descartar alterações
            </button>
          )}
        </>
      }
    >
      <fieldset className="form-fields" disabled={busy}>
        <Section
          title="Foto de perfil"
          description="Aparece na página Artistas."
        >
          <div className="photo-field">
            <Avatar artist={artist} size={96} />
            <div>
              <label className="file-button">
                {artist.photo ? "Trocar foto" : "Escolher foto"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const photo = await onUploadPhoto(file);
                    if (photo) setArtist((a) => ({ ...a, photo }));
                  }}
                />
              </label>
              {artist.photo && (
                <button
                  className="link-button danger-link"
                  onClick={() =>
                    setArtist(({ photo: _photo, ...rest }) => rest)
                  }
                >
                  Remover foto
                </button>
              )}
              <small className="field-hint">
                JPEG, PNG ou WebP. A imagem é reduzida automaticamente
                {remote ? " antes de enviar" : ""}.
              </small>
            </div>
          </div>
        </Section>
        <Section title="Informações">
          <Field label="Nome">
            <input
              value={artist.name}
              autoComplete="off"
              onChange={(e) => setArtist({ ...artist, name: e.target.value })}
            />
          </Field>
          <Field label="Localização" hint="Ex.: Cuiabá, MT.">
            <input
              value={artist.location}
              onChange={(e) =>
                setArtist({ ...artist, location: e.target.value })
              }
            />
          </Field>
          <Field label="Biografia">
            <textarea
              rows={6}
              value={artist.bio}
              onChange={(e) => setArtist({ ...artist, bio: e.target.value })}
            />
          </Field>
          <Field
            label="Fonte"
            hint="Link de onde vêm as informações da trajetória (opcional)."
          >
            <input
              type="url"
              inputMode="url"
              placeholder="https://"
              value={artist.source}
              onChange={(e) => setArtist({ ...artist, source: e.target.value })}
            />
          </Field>
        </Section>
        {isNew && onCreateAccess && (
          <Section
            title="Acesso da pessoa artista"
            description="Para a pessoa entrar no admin e cuidar das próprias salas."
          >
            <p className="callout">
              Salve a pessoa artista primeiro. Depois, nesta mesma tela, você
              cria o acesso com o e-mail dela e recebe uma senha para enviar.
            </p>
          </Section>
        )}
        {!isNew && onCreateAccess && (
          <Section
            title="Acesso da pessoa artista"
            description="Com acesso, a pessoa entra em /admin e edita as salas vinculadas a ela e as obras dessas salas. As obras que ela salvar voltam para a curadoria antes de aparecer no site."
          >
            <p className={rooms.length ? "callout" : "callout callout-warning"}>
              {rooms.length
                ? `Salas vinculadas: ${rooms.map((r) => r.name).join(", ")}.`
                : "Nenhuma sala vinculada ainda. Sem sala, a pessoa entra mas não tem o que editar."}{" "}
              <button className="link-button" onClick={onOpenRooms}>
                Gerenciar salas
              </button>
            </p>
            {credentials && (
              <CredentialsCard
                artistName={initial.name}
                credentials={credentials}
                onClose={() => setCredentials(undefined)}
              />
            )}
            {linked.map((account) => (
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
                    className="outline"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: "Gerar uma nova senha?",
                          body: "A senha atual deixa de funcionar. Você vai copiar a nova e enviar para a pessoa.",
                          confirmLabel: "Gerar nova senha",
                        })
                      ) {
                        const next = await onResetPassword?.(account);
                        if (next) setCredentials(next);
                      }
                    }}
                  >
                    Gerar nova senha
                  </button>
                  <button
                    className="danger-outline"
                    onClick={() => void onRemoveAccount?.(account)}
                  >
                    Remover acesso
                  </button>
                </span>
              </div>
            ))}
            {!linked.length && (
              <form
                className="invite-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const created = await onCreateAccess(email);
                  if (created) {
                    setCredentials(created);
                    setEmail("");
                  }
                }}
              >
                <Field
                  label="E-mail da pessoa"
                  hint="Cria o acesso na hora, com uma senha gerada. Nenhum e-mail é enviado: você copia os dados e manda para a pessoa."
                >
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <button className="outline" disabled={busy}>
                  Criar acesso
                </button>
              </form>
            )}
          </Section>
        )}
        {!isNew && (
          <Section
            title="Excluir pessoa artista"
            tone="danger"
            description={
              works.length || rooms.length
                ? `Antes de excluir, remova os créditos em ${works.length} obra(s) e desvincule de ${rooms.length} sala(s).`
                : "Remove o perfil e o acesso da pessoa, se houver."
            }
          >
            <button
              className="danger-outline"
              disabled={!!works.length || !!rooms.length}
              onClick={async () => {
                if (
                  await confirm({
                    title: `Excluir ${initial.name}?`,
                    body: "O perfil some da página Artistas e o acesso da pessoa é removido. Não dá para desfazer.",
                    confirmLabel: "Excluir",
                    tone: "danger",
                  })
                )
                  onDelete(initial);
              }}
            >
              Excluir pessoa artista
            </button>
          </Section>
        )}
      </fieldset>
    </FormPage>
  );
}
// Shown once after creating access or a new password; the app keeps no copy.
function CredentialsCard({
  artistName,
  credentials,
  onClose,
}: {
  artistName: string;
  credentials: AccessCredentials;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState("");
  const login = `${window.location.origin}/admin`;
  const message = `Olá! Seu acesso ao Desvio está pronto.\n\nEndereço: ${login}\nE-mail: ${credentials.email}\nSenha: ${credentials.password}\n\nDepois de entrar, você pode trocar a senha em “Trocar senha”.`;
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied("");
    }
  };
  return (
    <div className="credentials-card" role="status">
      <b>Acesso de {artistName} pronto</b>
      <p>
        Copie e envie para a pessoa por um canal seguro (WhatsApp, Signal,
        e-mail). Esta senha não aparece de novo.
      </p>
      <dl>
        <div>
          <dt>Endereço</dt>
          <dd>{login}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{credentials.email}</dd>
        </div>
        <div>
          <dt>Senha</dt>
          <dd>
            <code>{credentials.password}</code>
          </dd>
        </div>
      </dl>
      <div className="inline-actions">
        <button
          className="primary"
          onClick={() => void copy("message", message)}
        >
          {copied === "message" ? "Mensagem copiada ✓" : "Copiar mensagem"}
        </button>
        <button
          className="outline"
          onClick={() => void copy("password", credentials.password)}
        >
          {copied === "password" ? "Senha copiada ✓" : "Copiar só a senha"}
        </button>
        <button className="link-button" onClick={onClose}>
          Já enviei, fechar
        </button>
      </div>
    </div>
  );
}
