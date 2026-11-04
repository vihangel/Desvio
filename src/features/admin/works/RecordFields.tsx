import type {
  CollectionRecord,
  CollectionSnapshot,
  TechnicalDetails,
} from "../../../domain/entities";
import {
  CheckboxList,
  Section,
  TextAreaField,
  TextField,
  UrlField,
  YearField,
} from "../ui";
type Props = {
  record: CollectionRecord;
  snapshot: CollectionSnapshot;
  onChange: (patch: Partial<CollectionRecord>) => void;
};
const EMPTY_DETAILS: TechnicalDetails = {
  technique: "",
  dimensions: "",
  materials: "",
};
export function RecordInformation({ record, snapshot, onChange }: Props) {
  const categories = [
    ...new Set(snapshot.records.map((r) => r.kind).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return (
    <Section title="Informações">
      <TextField
        label="Título"
        value={record.title}
        onChange={(title) => onChange({ title })}
      />
      <CheckboxList
        legend="Pessoas artistas"
        options={snapshot.artists.map((a) => ({ value: a.id, label: a.name }))}
        value={record.credits.map((c) => c.artistId)}
        onChange={(ids) =>
          onChange({
            credits: ids.map(
              (artistId) =>
                record.credits.find((c) => c.artistId === artistId) ?? {
                  artistId,
                  role: "artista",
                },
            ),
          })
        }
      />
      <TextField
        label="Créditos complementares"
        hint="Para coletivos ou pessoas sem cadastro. Ex.: “e coletivo”."
        value={record.creditNote}
        onChange={(creditNote) => onChange({ creditNote })}
      />
      <div className="field-row">
        <YearField
          label="Ano"
          hint="Deixe em branco se não souber."
          value={record.year}
          onChange={(year) => onChange({ year })}
        />
        <TextField
          label="Categoria"
          hint="Ex.: Obra têxtil, Videoarte."
          suggestions={categories}
          value={record.kind}
          onChange={(kind) => onChange({ kind })}
        />
      </div>
      <TextAreaField
        label="Descrição"
        hint="Obrigatória para publicar. Aparece na ficha da obra."
        rows={5}
        value={record.description}
        onChange={(description) => onChange({ description })}
      />
      <UrlField
        label="Fonte documental"
        hint="Link para a origem das informações (opcional)."
        value={record.source ?? ""}
        onChange={(source) => onChange({ source })}
      />
    </Section>
  );
}
export function RecordTechnicalDetails({
  record,
  onChange,
}: Omit<Props, "snapshot">) {
  const details = record.technicalDetails ?? EMPTY_DETAILS;
  const change = (patch: Partial<TechnicalDetails>) => {
    const next = { ...details, ...patch };
    // All blank means no technical sheet at all.
    onChange({
      technicalDetails: Object.values(next).some((value) => value.trim())
        ? next
        : undefined,
    });
  };
  return (
    <Section
      title="Ficha técnica"
      description="Opcional. Aparece na ficha da obra; campos em branco não são exibidos."
    >
      <TextField
        label="Técnica"
        hint="Ex.: Fotografia digital, bordado à mão."
        value={details.technique}
        onChange={(technique) => change({ technique })}
      />
      <div className="field-row">
        <TextField
          label="Dimensões"
          hint="Ex.: 40 × 60 cm."
          value={details.dimensions}
          onChange={(dimensions) => change({ dimensions })}
        />
        <TextField
          label="Materiais"
          hint="Ex.: Linha, tecido e madeira."
          value={details.materials}
          onChange={(materials) => change({ materials })}
        />
      </div>
    </Section>
  );
}
