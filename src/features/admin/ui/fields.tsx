import {
  useEffect,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
type FieldProps = { label: string; hint?: ReactNode };
// A label with its control and the help text right below the control.
export function Field({
  label,
  hint,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}
type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>;
export function TextField({
  label,
  hint,
  value,
  onChange,
  suggestions,
  ...input
}: FieldProps &
  InputProps & {
    value: string;
    onChange: (value: string) => void;
    // Values already in use, offered while still accepting anything else.
    suggestions?: string[];
  }) {
  const listId = useId();
  return (
    <Field label={label} hint={hint}>
      <input
        {...input}
        list={suggestions?.length ? listId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {!!suggestions?.length && (
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
    </Field>
  );
}
export function UrlField(
  props: FieldProps &
    InputProps & { value: string; onChange: (value: string) => void },
) {
  return (
    <TextField type="url" inputMode="url" placeholder="https://" {...props} />
  );
}
export function TextAreaField({
  label,
  hint,
  value,
  onChange,
  ...textarea
}: FieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
    value: string;
    onChange: (value: string) => void;
  }) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        {...textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
export type SelectOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};
export function SelectField<T extends string>({
  label,
  hint,
  value,
  options,
  disabled,
  onChange,
}: FieldProps & {
  value: T;
  options: readonly SelectOption<T>[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
// Mutually exclusive options shown side by side.
export function SegmentedField<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label
          key={option.value}
          className={value === option.value ? "selected" : ""}
        >
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
// Multiple choice that works with thumbs: checkboxes instead of <select multiple>.
export function CheckboxList({
  legend,
  options,
  value,
  onChange,
  hint,
}: {
  legend: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  hint?: ReactNode;
}) {
  return (
    <fieldset className="checkbox-list">
      <legend className="field-label">{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, option.value]
                    : value.filter((v) => v !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint && <small className="field-hint">{hint}</small>}
    </fieldset>
  );
}
const formatNumber = (n: number | null) =>
  n === null
    ? ""
    : n.toLocaleString("pt-BR", {
        maximumFractionDigits: 2,
        useGrouping: false,
      });
const parseNumber = (text: string) => {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(n) ? n : undefined;
};
// Accepts "1,5", "-" and an empty field while typing; only valid values inside
// the range reach the form, and the range is explained under the field.
function NumericField({
  label,
  hint,
  value,
  min,
  max,
  unit,
  integer = false,
  optional = false,
  onChange,
}: FieldProps & {
  value: number | null;
  min: number;
  max: number;
  unit?: string;
  integer?: boolean;
  optional?: boolean;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(formatNumber(value));
  const accepts = (next: string) => {
    if (optional && !next.trim()) return true;
    const parsed = parseNumber(next);
    return (
      parsed !== undefined &&
      parsed >= min &&
      parsed <= max &&
      (!integer || Number.isInteger(parsed))
    );
  };
  useEffect(() => {
    if ((parseNumber(text) ?? null) !== value) setText(formatNumber(value));
    // Only external changes (e.g. "Voltar à posição sugerida") rewrite the text.
  }, [value]);
  const invalid = !accepts(text);
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="number-input">
        <input
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          value={text}
          aria-invalid={invalid}
          onChange={(e) => {
            setText(e.target.value);
            if (accepts(e.target.value))
              onChange(parseNumber(e.target.value) ?? null);
          }}
          onBlur={() => {
            if (invalid) setText(formatNumber(value));
          }}
        />
        {unit && <span>{unit}</span>}
      </span>
      <small className={invalid ? "field-hint field-error" : "field-hint"}>
        {invalid
          ? `Use ${integer ? "um número inteiro" : "um valor"} de ${formatNumber(min)} a ${formatNumber(max)}.`
          : hint}
      </small>
    </label>
  );
}
export function NumberField({
  onChange,
  ...props
}: FieldProps & {
  value: number;
  min: number;
  max: number;
  unit?: string;
  integer?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <NumericField
      {...props}
      onChange={(value) => {
        if (value !== null) onChange(value);
      }}
    />
  );
}
export function YearField(
  props: FieldProps & {
    value: number | null;
    onChange: (value: number | null) => void;
  },
) {
  return <NumericField {...props} min={0} max={9999} integer optional />;
}
