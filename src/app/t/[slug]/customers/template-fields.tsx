"use client";

import { useState } from "react";

import { CustomFieldInput } from "@/components/crud/custom-field-input";
import { TemplateFieldsRenderer } from "@/components/crud/template-fields-renderer";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field } from "@/components/ui/field";
import type { TemplateField, TemplateLayout } from "@/lib/validations/template";

// Template field keys rendered as a date picker (stored as yyyy-MM-dd text in
// custom_data). `nasc` (birth date) also shows a derived age + life-stage pill.
const DATE_FIELD_KEYS = new Set(["nasc"]);

/** Human age + life-stage from a yyyy-MM-dd birth date (pt-BR, pet life stages). */
export function describePetAge(value: string | null | undefined): { age: string; stage: string; tone: string } | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return describeAge(date);
}

function describeAge(date: Date): { age: string; stage: string; tone: string } {
  const now = new Date();
  let months =
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  if (now.getDate() < date.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const age =
    years === 0
      ? `${months} ${months === 1 ? "mês" : "meses"}`
      : remMonths === 0
        ? `${years} ${years === 1 ? "ano" : "anos"}`
        : `${years} ${years === 1 ? "ano" : "anos"} e ${remMonths} ${remMonths === 1 ? "mês" : "meses"}`;
  const stage = years < 1 ? "Filhote" : years < 7 ? "Adulto" : "Idoso";
  const tone =
    years < 1
      ? "border-[var(--lime-400)] bg-(--lime-50) text-foreground"
      : years < 7
        ? "border-border text-foreground"
        : "border-border bg-muted text-muted-foreground";
  return { age, stage, tone };
}

function TemplateDateField({
  name,
  label,
  required,
  value,
  withAge,
}: {
  name: string;
  label: string;
  required?: boolean;
  value?: unknown;
  withAge?: boolean;
}) {
  const initial =
    typeof value === "string" && value ? new Date(`${value}T00:00:00`) : undefined;
  const [date, setDate] = useState<Date | undefined>(
    initial && !Number.isNaN(initial.getTime()) ? initial : undefined,
  );
  const info = withAge && date ? describeAge(date) : null;
  return (
    <Field
      label={
        info ? (
          <span className="flex items-center gap-2">
            {label}
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${info.tone}`}>
              {info.stage} · {info.age}
            </span>
          </span>
        ) : (
          label
        )
      }
      htmlFor={name}
      required={required}
    >
      <DatePicker id={name} name={name} value={date} onChange={setDate} />
    </Field>
  );
}

/**
 * Renders the dynamic custom_data inputs for a niche template. Shared by the
 * customer form, the customer-form pets repeater and the standalone entity form.
 *
 * Native `required` is intentionally NOT set: in the multi-step customer form
 * required inputs can live on a hidden step, which would make native validation
 * throw on a non-focusable control. The asterisk (visual) stays via Field, and
 * the authoritative validation runs server-side (validateCustomData).
 *
 * `prefix` namespaces both the field id and the FormData name — use a per-row
 * prefix (e.g. `pet0_custom_`) so repeated groups don't collide.
 */
export function TemplateFieldInputs({
  fields,
  prefix = "custom_",
  values,
  layout,
}: {
  fields: TemplateField[];
  prefix?: string;
  values?: Record<string, unknown>;
  layout?: TemplateLayout;
}) {
  // A structured (step/block) template delegates to the shared renderer; the
  // pet-specific specialisations below only apply to the flat (legacy) layout.
  if (layout && layout.steps.length > 0) {
    return <TemplateFieldsRenderer fields={fields} layout={layout} values={values} prefix={prefix} />;
  }
  return (
    <>
      {fields.map((field) => {
        const name = `${prefix}${field.key}`;
        const value = values?.[field.key];
        // Pet-specific specialisations kept local: the birth-date (`nasc`) field
        // renders a date picker with a derived age/life-stage pill, and weight
        // fields (key ending `_kg`) get a "kg" suffix. Everything else delegates
        // to the shared renderer (all types + widgets).
        if (field.type === "text" && DATE_FIELD_KEYS.has(field.key)) {
          return (
            <TemplateDateField
              key={field.key}
              name={name}
              label={field.label}
              required={field.required}
              value={value}
              withAge={field.key === "nasc"}
            />
          );
        }
        if (field.type === "number" && field.key.endsWith("_kg")) {
          return (
            <Field key={field.key} label={field.label} htmlFor={name} required={field.required}>
              <AffixInput
                id={name}
                name={name}
                suffix="kg"
                type="number"
                inputMode="decimal"
                step="0.01"
                defaultValue={value != null ? String(value) : ""}
              />
            </Field>
          );
        }
        return <CustomFieldInput key={field.key} field={field} value={value} prefix={prefix} />;
      })}
    </>
  );
}
