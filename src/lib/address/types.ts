/**
 * Brazilian address domain types + normalizers (shared by the ViaCEP adapter,
 * the Zod schema and the AddressFormFields component).
 */

export const UFS = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
] as const;

export type Uf = (typeof UFS)[number]["value"];

export const UF_VALUES: readonly Uf[] = UFS.map((u) => u.value);

export function isValidUf(value: string): value is Uf {
  return (UF_VALUES as readonly string[]).includes(value.toUpperCase());
}

/** Strips everything but digits and caps at 8 (a Brazilian CEP). */
export function normalizeCep(value: string): string {
  return value.replace(/\D+/g, "").slice(0, 8);
}

/** Uppercase + trim; returns "" when not a valid UF. */
export function normalizeUf(value: string): string {
  const v = value.trim().toUpperCase();
  return isValidUf(v) ? v : "";
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Where the current address data came from. */
export type AddressSource = "cep" | "street" | "manual" | "mixed" | null;

export type AddressStatus =
  | "verified_by_cep"
  | "verified_by_street"
  | "manual"
  | "mixed"
  | "incomplete";

export type AddressValue = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  reference?: string;
  latitude?: number | null;
  longitude?: number | null;
  ibge?: string;
  ddd?: string;
  siafi?: string;
};

/** A normalized result row from a ViaCEP lookup. */
export type AddressSuggestion = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  ibge?: string;
  ddd?: string;
  siafi?: string;
  source: "cep" | "street";
};

export type AddressLookupState = {
  source: AddressSource;
  lookupCep: string | null;
  lookupStreetKey: string | null;
  autoFilledFields: string[];
  manuallyEditedFields: string[];
  status: AddressStatus;
};

/** Fields whose manual edit invalidates a CEP/street lookup. */
export const INVALIDATING_FIELDS = ["street", "neighborhood", "city", "state"] as const;

export function emptyAddress(partial: Partial<AddressValue> = {}): AddressValue {
  return {
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    country: "Brasil",
    reference: "",
    latitude: null,
    longitude: null,
    ibge: "",
    ddd: "",
    siafi: "",
    ...partial,
  };
}

export const initialLookupState: AddressLookupState = {
  source: null,
  lookupCep: null,
  lookupStreetKey: null,
  autoFilledFields: [],
  manuallyEditedFields: [],
  status: "incomplete",
};
