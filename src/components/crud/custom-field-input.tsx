"use client";

import { Link2, Mail } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import type { AddressValue } from "@/lib/address/types";
import { AddressFormFields } from "@/components/ui/address-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { AffixInput, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CepInput, CurrencyInput, DocumentInput, PhoneInput } from "@/components/ui/masked-inputs";
import { MultiSelect } from "@/components/ui/multiselect";
import { RadioGroup } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { SwitchCard } from "@/components/ui/switch-card";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { resolveWidget, type TemplateField } from "@/lib/validations/template";

/**
 * Renders a single dynamic custom_data input for a niche template field,
 * honouring its `type` and optional `widget`, and submitting form values that
 * {@link readCustomData} (src/lib/custom-data.ts) understands. Shared by every
 * tenant module form so the type→control mapping stays identical everywhere.
 *
 * `prefix` namespaces the FormData name (match it in the action's readCustomData
 * call); for a repeater pass a per-row prefix so groups don't collide.
 *
 * Required is visual-only here (the asterisk via Field); the authoritative
 * check runs server-side in validateCustomData — native `required` is avoided
 * because some inputs render on hidden steps or as non-focusable controls.
 */
export function CustomFieldInput({
  field,
  value,
  prefix = "custom_",
}: {
  field: TemplateField;
  value?: unknown;
  prefix?: string;
}) {
  const name = `${prefix}${field.key}`;
  const widget = resolveWidget(field);
  const str = value != null ? String(value) : "";

  // Row width: the field's explicit `width`, else the type's natural default.
  const defaultFull =
    field.type === "textarea" ||
    field.type === "daterange" ||
    field.type === "address" ||
    field.type === "slider" ||
    field.type === "multiselect" ||
    (field.type === "select" && (widget === "radio" || widget === "buttons")) ||
    (field.type === "boolean" && (widget === "checkbox" || widget === "toggle"));
  const full = field.width === "full" ? true : field.width === "half" ? false : defaultFull;
  const spanClass = full ? "col-span-full" : undefined;

  if (field.type === "boolean") {
    return <BooleanInput name={name} label={field.label} widget={widget} value={value === true} fullWidth={full} />;
  }

  if (field.type === "date") {
    return (
      <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
        <DateInput name={name} value={value} />
      </Field>
    );
  }

  if (field.type === "daterange") {
    return (
      <Field label={field.label} required={field.required} className={spanClass}>
        <DateRangeInput name={name} value={value} />
      </Field>
    );
  }

  if (field.type === "phone") {
    return (
      <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
        <PhoneInput id={name} name={name} defaultValue={str} />
      </Field>
    );
  }

  if (field.type === "cpf" || field.type === "cnpj") {
    return (
      <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
        <DocumentInput id={name} name={name} defaultValue={str} kind={field.type} />
      </Field>
    );
  }

  if (field.type === "email") {
    return (
      <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
        <AffixInput id={name} name={name} type="email" leadIcon={<Mail />} inputMode="email" placeholder="nome@exemplo.com" defaultValue={str} />
      </Field>
    );
  }

  if (field.type === "url") {
    return (
      <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
        <AffixInput id={name} name={name} type="url" leadIcon={<Link2 />} inputMode="url" placeholder="https://exemplo.com" defaultValue={str} />
      </Field>
    );
  }

  if (field.type === "cep") {
    return (
      <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
        <CepInput id={name} name={name} defaultValue={str} />
      </Field>
    );
  }

  if (field.type === "currency") {
    return (
      <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
        <CurrencyInput id={name} name={name} defaultValue={str} />
      </Field>
    );
  }

  if (field.type === "address") {
    const initial = value && typeof value === "object" ? (value as Partial<AddressValue>) : undefined;
    return (
      <fieldset className={cn("flex flex-col gap-3.5", spanClass)}>
        <legend className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
        </legend>
        {/* Self-contained address block; sub-inputs submit as `${name}_cep`, … */}
        <AddressFormFields prefix={`${name}_`} defaultValue={initial} required={field.required} />
      </fieldset>
    );
  }

  if (field.type === "slider") {
    return (
      <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
        <Slider
          name={name}
          defaultValue={value != null && value !== "" ? Number(value) : (field.min ?? 0)}
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
        />
      </Field>
    );
  }

  if (field.type === "select") {
    const options = field.options ?? [];
    return (
      <Field
        label={field.label}
        htmlFor={name}
        required={field.required}
        className={spanClass}
      >
        {widget === "radio" ? (
          <RadioGroup name={name} defaultValue={str || undefined} options={options} orientation="horizontal" />
        ) : widget === "buttons" ? (
          <SingleButtonsInput name={name} options={options} value={str} />
        ) : (
          <Combobox
            id={name}
            name={name}
            defaultValue={str}
            options={options.map((o) => ({ value: o, label: o }))}
            placeholder="Selecione"
            searchPlaceholder="Buscar…"
            emptyText="Sem opções."
          />
        )}
      </Field>
    );
  }

  if (field.type === "multiselect") {
    const options = field.options ?? [];
    const selected = Array.isArray(value)
      ? value.map(String)
      : value != null && value !== ""
        ? [String(value)]
        : [];
    return (
      <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
        {widget === "buttons" ? (
          <MultiButtonsInput name={name} options={options} value={selected} />
        ) : widget === "checkboxes" ? (
          <CheckboxesInput name={name} options={options} value={selected} />
        ) : (
          <MultiSelect
            id={name}
            name={name}
            defaultValue={selected}
            options={options.map((o) => ({ value: o, label: o }))}
          />
        )}
      </Field>
    );
  }

  if (field.type === "textarea") {
    return (
      <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
        <Textarea id={name} name={name} rows={2} defaultValue={str} />
      </Field>
    );
  }

  // text / number
  return (
    <Field label={field.label} htmlFor={name} required={field.required} className={spanClass}>
      <Input
        id={name}
        name={name}
        type={field.type === "number" ? "number" : "text"}
        step={field.type === "number" ? (field.step ?? "any") : undefined}
        min={field.type === "number" ? field.min : undefined}
        max={field.type === "number" ? field.max : undefined}
        defaultValue={str}
      />
    </Field>
  );
}

/** Parses a stored "yyyy-MM-dd" string into a Date for the calendar controls. */
function toDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function BooleanInput({
  name,
  label,
  widget,
  value,
  fullWidth,
}: {
  name: string;
  label: string;
  widget: string | undefined;
  value: boolean;
  fullWidth: boolean;
}) {
  const [checked, setChecked] = useState(value);
  // Always emit an explicit "true"/"false" so turning OFF on edit persists.
  const hidden = <input type="hidden" name={name} value={checked ? "true" : "false"} />;
  const span = fullWidth ? "col-span-full" : undefined;

  if (widget === "checkbox") {
    return (
      <Field className={span}>
        {hidden}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox checked={checked} onCheckedChange={(c) => setChecked(c === true)} />
          {label}
        </label>
      </Field>
    );
  }

  if (widget === "toggle") {
    return (
      <Field label={label} className={span}>
        {hidden}
        <div>
          <Toggle pressed={checked} onPressedChange={setChecked}>
            {checked ? "Sim" : "Não"}
          </Toggle>
        </div>
      </Field>
    );
  }

  // default: switch (card)
  return (
    <div className={span}>
      {hidden}
      <SwitchCard title={label} checked={checked} onChange={setChecked} />
    </div>
  );
}

function DateInput({ name, value }: { name: string; value: unknown }) {
  const [date, setDate] = useState<Date | undefined>(() => toDate(value));
  return <DatePicker id={name} name={name} value={date} onChange={setDate} />;
}

function DateRangeInput({ name, value }: { name: string; value: unknown }) {
  const v = (value ?? {}) as { from?: unknown; to?: unknown };
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = toDate(v.from);
    const to = toDate(v.to);
    return from ? { from, to } : undefined;
  });
  const iso = (d: Date | undefined) => (d ? formatIso(d) : "");
  return (
    <>
      {/* DateRangePicker is presentational; submit start/end via hidden inputs. */}
      <input type="hidden" name={`${name}_from`} value={iso(range?.from)} />
      <input type="hidden" name={`${name}_to`} value={iso(range?.to)} />
      <DateRangePicker value={range} onChange={setRange} />
    </>
  );
}

/** Local yyyy-MM-dd (no UTC shift), matching DatePicker's hidden value. */
function formatIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function SingleButtonsInput({ name, options, value }: { name: string; options: string[]; value: string }) {
  const [selected, setSelected] = useState(value);
  return (
    <>
      <input type="hidden" name={name} value={selected} />
      <ToggleGroup
        type="single"
        items={options.map((o) => ({ value: o, label: o }))}
        value={selected}
        onValueChange={(v) => setSelected(typeof v === "string" ? v : (v[0] ?? ""))}
      />
    </>
  );
}

function MultiButtonsInput({ name, options, value }: { name: string; options: string[]; value: string[] }) {
  const [selected, setSelected] = useState<string[]>(value);
  return (
    <>
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <ToggleGroup
        type="multiple"
        items={options.map((o) => ({ value: o, label: o }))}
        value={selected}
        onValueChange={(v) => setSelected(Array.isArray(v) ? v : v ? [v] : [])}
      />
    </>
  );
}

function CheckboxesInput({ name, options, value }: { name: string; options: string[]; value: string[] }) {
  const [selected, setSelected] = useState<string[]>(value);
  const toggle = (option: string, on: boolean) =>
    setSelected((prev) => (on ? [...prev, option] : prev.filter((v) => v !== option)));
  return (
    <div className="flex flex-col gap-2">
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      {options.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={selected.includes(option)}
            onCheckedChange={(c) => toggle(option, c === true)}
          />
          {option}
        </label>
      ))}
    </div>
  );
}
