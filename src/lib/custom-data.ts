import "server-only";

import { ADDRESS_SUBFIELDS, type TemplateField } from "@/lib/validations/template";

/**
 * Reads the dynamic custom_data fields for a niche template out of a submitted
 * FormData, coercing each value to the shape its `type` requires. Shared by
 * every tenant module's server action so date/range/boolean parsing stays
 * identical everywhere — the authoritative shape check is `validateCustomData`.
 *
 * `prefix` namespaces the FormData keys (the matching renderer uses the same
 * prefix); for a repeater pass a per-row prefix so groups don't collide.
 * Empty/untouched inputs are omitted rather than stored as "".
 */
export function readCustomData(
  fields: TemplateField[],
  formData: FormData,
  prefix = "custom_",
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const field of fields) {
    const name = `${prefix}${field.key}`;

    switch (field.type) {
      case "boolean": {
        // Renderers emit an explicit "true"/"false" via a hidden input so that
        // turning a switch OFF on edit persists `false` (a bare checkbox would
        // submit nothing and leave a stored `true` untouched).
        const raw = formData.get(name);
        if (raw === "on" || raw === "true") data[field.key] = true;
        else if (raw === "false") data[field.key] = false;
        break;
      }
      // number, currency (R$ → decimal) and slider all persist as a JS number.
      // Their masked inputs already submit a canonical numeric string.
      case "number":
      case "currency":
      case "slider": {
        const raw = formData.get(name);
        if (raw !== null && raw !== "") {
          const n = Number(raw);
          if (!Number.isNaN(n)) data[field.key] = n;
        }
        break;
      }
      case "multiselect": {
        const values = formData.getAll(name).map(String).filter((v) => v !== "");
        if (values.length > 0) data[field.key] = values;
        break;
      }
      case "daterange": {
        const from = formData.get(`${name}_from`);
        const to = formData.get(`${name}_to`);
        const f = typeof from === "string" && from !== "" ? from : undefined;
        const t = typeof to === "string" && to !== "" ? to : undefined;
        if (f || t) data[field.key] = { from: f ?? null, to: t ?? null };
        break;
      }
      case "address": {
        // Assemble the AddressValue object from its namespaced sub-inputs.
        const address: Record<string, string> = {};
        for (const sub of ADDRESS_SUBFIELDS) {
          const raw = formData.get(`${name}_${sub}`);
          if (typeof raw === "string" && raw.trim() !== "") address[sub] = raw.trim();
        }
        // Skip an entirely blank address (none of the core fields filled).
        const core = address.cep || address.street || address.city || address.number || address.neighborhood;
        if (core) data[field.key] = address;
        break;
      }
      // text, textarea, number(handled), select, date → a single string value.
      default: {
        const raw = formData.get(name);
        if (raw !== null && raw !== "") data[field.key] = String(raw);
      }
    }
  }

  return data;
}
