import type {
  Artist,
  CollectionSnapshot,
  StoredFile,
} from "../../../domain/entities";
import type { ArtistAccounts } from "../useArtistAccounts";
import { useFormDraft } from "../useFormDraft";
import {
  FileButton,
  FormPage,
  Section,
  TextAreaField,
  TextField,
  UnsavedPill,
  UrlField,
  useConfirm,
} from "../ui";
import ArtistAccessSection from "./ArtistAccessSection";
import Avatar from "./Avatar";
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
  onOpenRooms,
}: {
  initial: Artist;
  isNew: boolean;
  snapshot: CollectionSnapshot;
  busy: boolean;
  remote: boolean;
  accounts: ArtistAccounts;
  onSave: (artist: Artist) => Promise<boolean>;
  onDelete: (artist: Artist) => void;
  onBack: () => void;
  onUploadPhoto: (file: File) => Promise<StoredFile | undefined>;
  onDirty: (dirty: boolean) => void;
  onOpenRooms: () => void;
}) {
  const {
    value: artist,
    setValue: setArtist,
    dirty,
    reset,
  } = useFormDraft(initial, isNew, onDirty);
  const confirm = useConfirm();
  const change = (patch: Partial<Artist>) =>
    setArtist((current) => ({ ...current, ...patch }));
  const rooms = snapshot.rooms.filter((r) => r.artistIds?.includes(artist.id));
  const works = snapshot.records.filter((r) =>
    r.credits.some((c) => c.artistId === artist.id),
  );
  return (
    <FormPage
      title={isNew ? "Nova pessoa artista" : initial.name}
      backLabel="Artistas"
      onBack={onBack}
      badge={dirty && !isNew ? <UnsavedPill /> : undefined}
      busy={busy}
      dirty={dirty}
      onSave={() => void onSave(artist)}
      onDiscard={isNew ? undefined : reset}
    >
      <Section title="Foto de perfil" description="Aparece na página Artistas.">
        <div className="photo-field">
          <Avatar artist={artist} size={96} />
          <div>
            <FileButton
              label={artist.photo ? "Trocar foto" : "Escolher foto"}
              accept="image/png,image/jpeg,image/webp"
              onFile={async (file) => {
                const photo = await onUploadPhoto(file);
                if (photo) change({ photo });
              }}
            />
            {artist.photo && (
              <button
                type="button"
                className="link-button danger-link"
                onClick={() => setArtist(({ photo: _photo, ...rest }) => rest)}
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
        <TextField
          label="Nome"
          autoComplete="off"
          value={artist.name}
          onChange={(name) => change({ name })}
        />
        <TextField
          label="Localização"
          hint="Ex.: Cuiabá, MT."
          value={artist.location}
          onChange={(location) => change({ location })}
        />
        <TextAreaField
          label="Biografia"
          rows={6}
          value={artist.bio}
          onChange={(bio) => change({ bio })}
        />
        <UrlField
          label="Fonte"
          hint="Link de onde vêm as informações da trajetória (opcional)."
          value={artist.source}
          onChange={(source) => change({ source })}
        />
      </Section>
      {accounts.available &&
        (isNew ? (
          <Section
            title="Acesso da pessoa artista"
            description="Para a pessoa entrar no admin e cuidar das próprias salas."
          >
            <p className="callout">
              Salve a pessoa artista primeiro. Depois, nesta mesma tela, você
              cria o acesso com o e-mail dela e recebe uma senha para enviar.
            </p>
          </Section>
        ) : (
          <ArtistAccessSection
            artist={initial}
            rooms={rooms}
            accounts={accounts}
            busy={busy}
            onOpenRooms={onOpenRooms}
          />
        ))}
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
            type="button"
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
    </FormPage>
  );
}
