import { z } from "zod";

import { isValidCnpj, isValidCpf, onlyDigits } from "@/lib/masks";
import { brazilianAddressSchema, requiredBrazilianAddressSchema } from "@/lib/validations/address";

export const TEMPLATE_ENTITY_TYPES = [
  "tenant",
  "customer",
  "customer_entity",
  "product",
  "service",
  "professional",
  "plan",
  "request",
  "agent_config",
] as const;

// The data type of a custom_data field. The shape stored in custom_data is
// fixed by this — `widget` (below) only changes how the input is rendered.
//   text/textarea → string · number → number · boolean → boolean
//   select        → string (one of options) · multiselect → string[]
//   date          → "yyyy-MM-dd" string
//   daterange     → { from: "yyyy-MM-dd", to: "yyyy-MM-dd" }
export const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "url",
  "phone",
  "cpf",
  "cnpj",
  "cep",
  "number",
  "currency",
  "slider",
  "boolean",
  "select",
  "multiselect",
  "date",
  "daterange",
  "address",
] as const;

// pt-BR labels for the admin field-builder type picker, grouped logically.
export const FIELD_TYPE_GROUPS: { label: string; types: FieldType[] }[] = [
  { label: "Texto", types: ["text", "textarea", "email", "url", "phone", "cpf", "cnpj", "cep"] },
  { label: "Número", types: ["number", "currency", "slider"] },
  { label: "Escolha", types: ["boolean", "select", "multiselect"] },
  { label: "Data", types: ["date", "daterange"] },
  { label: "Endereço", types: ["address"] },
];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto",
  textarea: "Texto longo",
  email: "E-mail",
  url: "URL",
  phone: "Telefone",
  cpf: "CPF",
  cnpj: "CNPJ",
  cep: "CEP",
  number: "Número",
  currency: "Moeda (R$)",
  slider: "Slider",
  boolean: "Sim/Não",
  select: "Seleção única",
  multiselect: "Seleção múltipla",
  date: "Data",
  daterange: "Período",
  address: "Endereço completo",
};

// custom_data sub-keys an `address` field reads/stores (canonical AddressValue
// shape). The renderer namespaces them under `${fieldKey}_<sub>` in the form.
export const ADDRESS_SUBFIELDS = [
  "cep",
  "street",
  "number",
  "complement",
  "neighborhood",
  "city",
  "state",
  "country",
  "reference",
  "ibge",
  "ddd",
  "siafi",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

// Optional presentation hint. The data shape never changes with the widget;
// only the rendered control does. Each entry lists the allowed widgets for a
// type, with the FIRST being the default when `widget` is omitted.
export const WIDGETS_BY_TYPE = {
  boolean: ["switch", "checkbox", "toggle"],
  select: ["dropdown", "radio", "buttons"],
  multiselect: ["chips", "checkboxes", "buttons"],
} as const satisfies Partial<Record<FieldType, readonly string[]>>;

export const FIELD_WIDGETS = [
  "switch",
  "checkbox",
  "toggle",
  "dropdown",
  "radio",
  "buttons",
  "chips",
  "checkboxes",
] as const;

export type FieldWidget = (typeof FIELD_WIDGETS)[number];

/** pt-BR labels for the admin field-builder widget picker. */
export const WIDGET_LABELS: Record<FieldWidget, string> = {
  switch: "Switch",
  checkbox: "Checkbox",
  toggle: "Botão liga/desliga",
  dropdown: "Lista (dropdown)",
  radio: "Opções (radio)",
  buttons: "Botões",
  chips: "Chips (busca)",
  checkboxes: "Checkboxes",
};

/** The widget to render for a field: its explicit `widget`, or the type default. */
export function resolveWidget(field: Pick<TemplateField, "type" | "widget">): FieldWidget | undefined {
  const allowed = (WIDGETS_BY_TYPE as Record<string, readonly FieldWidget[]>)[field.type];
  if (!allowed) return undefined;
  return field.widget && allowed.includes(field.widget) ? field.widget : allowed[0];
}

// One entry per custom_data field this template defines for its entity_type.
// This is what runtime validation of custom_data on tenants/customers/etc.
// must check against — see .devrails/rules/multi-tenant.md.
export const templateFieldSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]*$/, "Use snake_case"),
    label: z.string().min(1).max(120),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().default(false),
    options: z.array(z.string().min(1)).optional(),
    widget: z.enum(FIELD_WIDGETS).optional(),
    // Numeric bounds for number/slider/currency (slider also uses them as the
    // track range). Ignored for other types.
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    // Row width in the 2-column field grid: "half" = one column, "full" = both.
    // Omitted → the type's natural default (most are half; textarea/address/
    // slider/daterange/multiselect default to full).
    width: z.enum(["half", "full"]).optional(),
  })
  // select/multiselect are meaningless without at least one option to pick.
  .refine(
    (field) =>
      (field.type !== "select" && field.type !== "multiselect") ||
      (field.options !== undefined && field.options.length > 0),
    { message: "Campos select/multiselect exigem ao menos uma opção.", path: ["options"] },
  )
  // A widget must belong to its type's allowed set (e.g. "radio" only on select).
  .refine(
    (field) => {
      if (!field.widget) return true;
      const allowed = (WIDGETS_BY_TYPE as Record<string, readonly string[]>)[field.type];
      return allowed !== undefined && allowed.includes(field.widget);
    },
    { message: "O widget escolhido não é válido para este tipo de campo.", path: ["widget"] },
  );

export type TemplateField = z.infer<typeof templateFieldSchema>;

/**
 * Optional presentation layout for a template, stored in `templates.config`.
 * It groups the (still flat) `fields` into a step → block hierarchy by key:
 * every consumer keeps reading the flat `fields` for values; the layout only
 * drives how the form is organised (multi-step timeline + titled blocks).
 * Order in each array IS the position; icon is a STEP_ICONS name.
 */
export const templateBlockSchema = z.object({
  label: z.string().max(120).optional(),
  fieldKeys: z.array(z.string()),
});

export const templateStepSchema = z.object({
  label: z.string().min(1, "Informe o nome da etapa.").max(120),
  icon: z.string().max(40).optional(),
  blocks: z.array(templateBlockSchema),
});

export const templateLayoutSchema = z.object({
  steps: z.array(templateStepSchema),
});

export type TemplateBlock = z.infer<typeof templateBlockSchema>;
export type TemplateStep = z.infer<typeof templateStepSchema>;
export type TemplateLayout = z.infer<typeof templateLayoutSchema>;

/**
 * Checks a layout is consistent with the template's flat field list: every
 * referenced key must exist, with no key referenced twice. Unreferenced fields
 * are allowed (the renderer appends them) and reported via `orphanKeys`.
 */
export function validateLayout(
  fields: TemplateField[],
  layout: TemplateLayout,
): { ok: true; orphanKeys: string[] } | { ok: false; error: string } {
  const fieldKeys = new Set(fields.map((f) => f.key));
  const seen = new Set<string>();
  for (const step of layout.steps) {
    for (const block of step.blocks) {
      for (const key of block.fieldKeys) {
        if (!fieldKeys.has(key)) return { ok: false, error: `Etapa referencia campo inexistente: ${key}.` };
        if (seen.has(key)) return { ok: false, error: `Campo em mais de uma etapa/bloco: ${key}.` };
        seen.add(key);
      }
    }
  }
  return { ok: true, orphanKeys: [...fieldKeys].filter((k) => !seen.has(k)) };
}

/**
 * Convention for customer_entity templates: the FIRST required field is the
 * entity's display name (mirrored into CustomerEntity.name and shown in the
 * customer list column). Falls back to the first field, then null when empty.
 */
export function entityNameFieldKey(fields: TemplateField[]): string | null {
  return fields.find((f) => f.required)?.key ?? fields[0]?.key ?? null;
}

/** The display name for an entity, derived from its template + custom_data. */
export function deriveEntityName(fields: TemplateField[], customData: Record<string, unknown>): string {
  const key = entityNameFieldKey(fields);
  const value = key ? customData[key] : undefined;
  return value == null ? "" : String(value).trim();
}

export const templateSchema = z.object({
  nicheId: z.string().uuid(),
  entityType: z.enum(TEMPLATE_ENTITY_TYPES),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  fields: z
    .array(templateFieldSchema)
    .default([])
    // Field keys are the custom_data property names — they must be unique
    // within a template or a later field silently shadows an earlier one.
    .refine(
      (fields) => new Set(fields.map((f) => f.key)).size === fields.length,
      { message: "Há chaves de campo duplicadas no template." },
    ),
});

export type TemplateInput = z.infer<typeof templateSchema>;

/**
 * Validates a record's custom_data against the fields defined by its
 * niche+entity template. Used wherever tenants/customers/products/etc. write
 * custom_data — never trust the client to have respected the template shape.
 */
export function validateCustomData(fields: TemplateField[], customData: Record<string, unknown>) {
  const errors: string[] = [];
  for (const field of fields) {
    const value = customData[field.key];
    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push(`${field.key} is required`);
      continue;
    }
    if (value === undefined || value === null) continue;
    if (field.type === "number" || field.type === "currency" || field.type === "slider") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push(`${field.key} must be a number`);
      } else {
        if (field.min !== undefined && value < field.min) errors.push(`${field.key} must be ≥ ${field.min}`);
        if (field.max !== undefined && value > field.max) errors.push(`${field.key} must be ≤ ${field.max}`);
        if (field.type === "currency" && value < 0) errors.push(`${field.key} must not be negative`);
      }
    }
    if (field.type === "email" && !z.string().email().safeParse(value).success) {
      errors.push(`${field.key} must be a valid email`);
    }
    if (field.type === "url" && !z.string().url().safeParse(value).success) {
      errors.push(`${field.key} must be a valid URL`);
    }
    if (field.type === "phone") {
      const digits = onlyDigits(String(value));
      if (digits.length < 10 || digits.length > 13) errors.push(`${field.key} must be a valid phone number`);
    }
    if (field.type === "cep" && onlyDigits(String(value)).length !== 8) {
      errors.push(`${field.key} must be a valid CEP`);
    }
    if (field.type === "cpf" && !isValidCpf(String(value))) {
      errors.push(`${field.key} must be a valid CPF`);
    }
    if (field.type === "cnpj" && !isValidCnpj(String(value))) {
      errors.push(`${field.key} must be a valid CNPJ`);
    }
    if (field.type === "boolean" && typeof value !== "boolean") {
      errors.push(`${field.key} must be a boolean`);
    }
    if (field.type === "select" && field.options && !field.options.includes(String(value))) {
      errors.push(`${field.key} must be one of: ${field.options.join(", ")}`);
    }
    if (field.type === "multiselect" && field.options) {
      const selected = Array.isArray(value) ? value : [value];
      const allowed = field.options;
      if (selected.some((v) => !allowed.includes(String(v)))) {
        errors.push(`${field.key} must only contain: ${field.options.join(", ")}`);
      }
    }
    if (field.type === "date" && !isIsoDate(value)) {
      errors.push(`${field.key} must be a date (yyyy-MM-dd)`);
    }
    if (field.type === "daterange") {
      const range = value as { from?: unknown; to?: unknown } | null;
      if (typeof range !== "object" || range === null || !isIsoDate(range.from) || !isIsoDate(range.to)) {
        errors.push(`${field.key} must be a date range { from, to }`);
      } else if (String(range.from) > String(range.to)) {
        errors.push(`${field.key}: start date must not be after end date`);
      }
    }
    if (field.type === "address") {
      const schema = field.required ? requiredBrazilianAddressSchema : brazilianAddressSchema;
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        errors.push(`${field.key}: ${parsed.error.issues[0]?.message ?? "endereço inválido"}`);
      }
    }
  }
  return errors;
}

/** A non-empty "yyyy-MM-dd" string that parses to a real calendar date. */
function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00`))
  );
}
