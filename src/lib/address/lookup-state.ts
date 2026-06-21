import {
  initialLookupState,
  INVALIDATING_FIELDS,
  type AddressLookupState,
  type AddressSuggestion,
} from "./types";

/**
 * Pure transitions for address origin tracking + reset rules.
 * Editing a field that was auto-filled by a CEP/street lookup breaks the link
 * to that source (the address no longer matches the looked-up CEP), so the CEP
 * is cleared and the source becomes "mixed". Number/complement/reference/lat/lng
 * never invalidate a lookup.
 */

export type EditNotice = "cep_cleared" | "manual_changed" | null;

export const NOTICE_MESSAGES: Record<Exclude<EditNotice, null>, string> = {
  cep_cleared: "CEP removido porque o endereço foi alterado.",
  manual_changed: "O endereço foi alterado manualmente. Confira os dados antes de salvar.",
};

export function isInvalidatingField(field: string): boolean {
  return (INVALIDATING_FIELDS as readonly string[]).includes(field);
}

/** A CEP lookup filled street/neighborhood/city/state. */
export function afterCepLookup(suggestion: AddressSuggestion): AddressLookupState {
  return {
    source: "cep",
    lookupCep: suggestion.cep,
    lookupStreetKey: null,
    autoFilledFields: ["street", "neighborhood", "city", "state"],
    manuallyEditedFields: [],
    status: "verified_by_cep",
  };
}

/** A street lookup filled cep/street/neighborhood/city/state. */
export function afterStreetLookup(
  key: string,
  suggestion: AddressSuggestion
): AddressLookupState {
  return {
    source: "street",
    lookupCep: suggestion.cep || null,
    lookupStreetKey: key,
    autoFilledFields: ["cep", "street", "neighborhood", "city", "state"],
    manuallyEditedFields: [],
    status: "verified_by_street",
  };
}

/**
 * Apply a manual edit to a field. Returns the next lookup state, whether the CEP
 * must be cleared, and a discreet notice for the UI.
 */
export function afterFieldEdit(
  lookup: AddressLookupState,
  field: string
): { lookup: AddressLookupState; clearCep: boolean; notice: EditNotice } {
  if (!isInvalidatingField(field)) {
    return { lookup, clearCep: false, notice: null };
  }

  const wasAutoFilled = lookup.autoFilledFields.includes(field);
  const autoFilledFields = lookup.autoFilledFields.filter((f) => f !== field);
  const manuallyEditedFields = lookup.manuallyEditedFields.includes(field)
    ? lookup.manuallyEditedFields
    : [...lookup.manuallyEditedFields, field];

  // Editing a field that a CEP or street lookup auto-filled breaks that lookup.
  const breaksLookup =
    wasAutoFilled && (lookup.source === "cep" || lookup.source === "street");

  if (breaksLookup) {
    const cepWasAutoFilled = lookup.autoFilledFields.includes("cep") || lookup.source === "cep";
    return {
      lookup: {
        source: "mixed",
        lookupCep: null,
        lookupStreetKey: null,
        autoFilledFields,
        manuallyEditedFields,
        status: "mixed",
      },
      clearCep: cepWasAutoFilled,
      notice: cepWasAutoFilled ? "cep_cleared" : "manual_changed",
    };
  }

  return {
    lookup: {
      ...lookup,
      source: lookup.source === null ? "manual" : lookup.source === "manual" ? "manual" : "mixed",
      autoFilledFields,
      manuallyEditedFields,
      status: lookup.source === null ? "manual" : "mixed",
    },
    clearCep: false,
    notice: lookup.source === null ? null : "manual_changed",
  };
}

/** Resets origin tracking (e.g. when the CEP field is cleared/changed by hand). */
export function resetLookup(): AddressLookupState {
  return { ...initialLookupState };
}
