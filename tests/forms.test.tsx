import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSeed } from "../src/infrastructure/local/seed";
import { selectRecordDraft } from "../src/domain/selectors";
import { CURATOR } from "../src/domain/access";
import ArtistEditor from "../src/features/admin/artists/ArtistEditor";
import RecordEditor from "../src/features/admin/works/RecordEditor";
import RoomEditor from "../src/features/admin/rooms/RoomEditor";
import ExhibitionEditor from "../src/features/admin/rooms/ExhibitionEditor";
import { NumberField, TextField, YearField } from "../src/features/admin/ui";
import type { ArtistAccounts } from "../src/features/admin/useArtistAccounts";
const snapshot = createSeed().draft;
const noop = () => {};
const save = async () => true;
const draft = selectRecordDraft(snapshot, snapshot.records[0].id);
const accounts: ArtistAccounts = {
  available: true,
  accounts: [
    {
      userId: "u",
      artistId: snapshot.artists[0].id,
      email: "a@example.com",
      lastSignInAt: null,
    },
  ],
  reload: async () => {},
  create: async () => undefined,
  resetPassword: async () => undefined,
  remove: async () => {},
};
const recordEditor = (patch: Partial<typeof draft.media> = {}) => (
  <RecordEditor
    draft={{ ...draft, media: { ...draft.media, ...patch } }}
    snapshot={snapshot}
    access={CURATOR}
    isNew={false}
    dirty
    busy={false}
    remote
    canDelete
    onChange={noop}
    onPlace={noop}
    onUpload={noop}
    onUploadAudio={noop}
    onSave={noop}
    onSavePreview={noop}
    onBack={noop}
    onDiscard={noop}
    onSwap={async () => {}}
    onDelete={noop}
  />
);
const forms: [string, ReactElement][] = [
  ["obra", recordEditor()],
  [
    "artista",
    <ArtistEditor
      initial={snapshot.artists[0]}
      isNew={false}
      snapshot={snapshot}
      busy={false}
      remote
      accounts={accounts}
      onSave={save}
      onDelete={noop}
      onBack={noop}
      onUploadPhoto={async () => undefined}
      onDirty={noop}
      onOpenRooms={noop}
    />,
  ],
  [
    "artista sem acesso",
    <ArtistEditor
      initial={snapshot.artists[0]}
      isNew={false}
      snapshot={snapshot}
      busy={false}
      remote
      accounts={{ ...accounts, accounts: [] }}
      onSave={save}
      onDelete={noop}
      onBack={noop}
      onUploadPhoto={async () => undefined}
      onDirty={noop}
      onOpenRooms={noop}
    />,
  ],
  [
    "sala",
    <RoomEditor
      initial={snapshot.rooms[0]}
      isNew={false}
      snapshot={snapshot}
      access={CURATOR}
      busy={false}
      onSave={save}
      onDelete={noop}
      onBack={noop}
      onDirty={noop}
    />,
  ],
  [
    "exposição",
    <ExhibitionEditor
      snapshot={snapshot}
      live
      busy={false}
      onSave={save}
      onPublish={save}
      onArchive={save}
      onDirty={noop}
    />,
  ],
];
describe("admin forms", () => {
  it.each(forms)("%s: only the save button submits", (_name, form) => {
    const html = renderToStaticMarkup(form);
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.filter((b) => !/type="(button|submit)"/.test(b))).toEqual(
      [],
    );
    expect(buttons.filter((b) => b.includes('type="submit"'))).toHaveLength(1);
    expect(html.match(/<form/g)).toHaveLength(1);
  });
  it("asks for the authorization once, and only when it is needed", () => {
    const label = /Referência da autorização/g;
    const count = (html: string) => html.match(label)?.length ?? 0;
    const narration = {
      credits: "",
      transcript: "",
      authorized: false,
      src: "https://example.com/a.mp3",
    };
    expect(
      count(renderToStaticMarkup(recordEditor({ rights: "preview" }))),
    ).toBe(0);
    expect(
      count(renderToStaticMarkup(recordEditor({ rights: "licensed" }))),
    ).toBe(1);
    expect(
      count(
        renderToStaticMarkup(recordEditor({ rights: "licensed", narration })),
      ),
    ).toBe(1);
  });
  it("offers the technical sheet shown on the public record", () => {
    const html = renderToStaticMarkup(recordEditor());
    for (const label of ["Técnica", "Dimensões", "Materiais"])
      expect(html).toContain(label);
  });
  it("suggests existing values but accepts free text", () => {
    const html = renderToStaticMarkup(
      <TextField
        label="Categoria"
        suggestions={["Videoarte"]}
        value=""
        onChange={noop}
      />,
    );
    expect(html).toContain("<datalist");
    expect(html).toContain('value="Videoarte"');
  });
  it("marks out-of-range numbers instead of sending them", () => {
    const range = renderToStaticMarkup(
      <NumberField
        label="Obras"
        integer
        min={1}
        max={6}
        value={9}
        onChange={noop}
      />,
    );
    expect(range).toContain('aria-invalid="true"');
    expect(range).toContain("número inteiro de 1 a 6");
    const year = renderToStaticMarkup(
      <YearField label="Ano" value={null} onChange={noop} />,
    );
    expect(year).toContain('aria-invalid="false"');
  });
});
