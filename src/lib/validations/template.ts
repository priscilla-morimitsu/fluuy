import { z } from "zod";

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

// One entry per custom_data field this template defines for its entity_type.
// This is what runtime validation of custom_data on tenants/customers/etc.
// must check against — see .devrails/rules/multi-tenant.md.
export const templateFieldSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]*$/, "Use snake_case"),
    label: z.string().min(1).max(120),
    type: z.enum(["text", "number", "boolean", "select", "multiselect", "textarea"]),
    required: z.boolean().default(false),
    options: z.array(z.string().min(1)).optional(),
  })
  // select/multiselect are meaningless without at least one option to pick.
  .refine(
    (field) =>
      (field.type !== "select" && field.type !== "multiselect") ||
      (field.options !== undefined && field.options.length > 0),
    { message: "Campos select/multiselect exigem ao menos uma opção.", path: ["options"] },
  );

export type TemplateField = z.infer<typeof templateFieldSchema>;

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
    if (field.type === "number" && typeof value !== "number") {
      errors.push(`${field.key} must be a number`);
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
  }
  return errors;
}
