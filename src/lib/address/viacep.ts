import {
  isValidUf,
  normalizeCep,
  type AddressSuggestion,
} from "./types";

/**
 * ViaCEP adapter. The ONLY place that talks to viacep.com.br — never call it
 * directly from components. Validates/sanitizes inputs, handles timeout, network
 * errors, `erro: true` and empty lists, maps the raw payload to AddressSuggestion
 * and caches results in memory for the session.
 */

const BASE = "https://viacep.com.br/ws";
const TIMEOUT_MS = 8000;

type ViaCepRaw = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean | string;
};

const cepCache = new Map<string, AddressSuggestion | null>();
const streetCache = new Map<string, AddressSuggestion[]>();

function mapRaw(raw: ViaCepRaw, source: "cep" | "street"): AddressSuggestion | null {
  const uf = (raw.uf ?? "").toUpperCase();
  const city = (raw.localidade ?? "").trim();
  if (!uf || !city) return null;
  return {
    cep: normalizeCep(raw.cep ?? ""),
    street: (raw.logradouro ?? "").trim(),
    neighborhood: (raw.bairro ?? "").trim(),
    city,
    state: uf,
    ibge: raw.ibge?.trim() || undefined,
    ddd: raw.ddd?.trim() || undefined,
    siafi: raw.siafi?.trim() || undefined,
    source,
  };
}

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    // Network error / timeout / abort — never surface technical details; the UI
    // falls back to manual entry.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Looks up a single address by CEP. Returns null when not found or on failure. */
export async function searchAddressByCep(cep: string): Promise<AddressSuggestion | null> {
  const digits = normalizeCep(cep);
  if (digits.length !== 8) return null;
  if (cepCache.has(digits)) return cepCache.get(digits) ?? null;

  const json = await fetchJson(`${BASE}/${digits}/json/`);
  const raw = json as ViaCepRaw | null;
  const result = raw && !raw.erro ? mapRaw(raw, "cep") : null;
  cepCache.set(digits, result);
  return result;
}

/**
 * Searches addresses by UF + city + street term. Requires a valid UF, a city
 * and at least 3 characters of street. Returns [] when nothing matches.
 */
export async function searchAddressesByStreet({
  uf,
  city,
  street,
}: {
  uf: string;
  city: string;
  street: string;
}): Promise<AddressSuggestion[]> {
  const ufNorm = uf.trim().toUpperCase();
  const cityNorm = city.trim();
  const streetNorm = street.trim();
  if (!isValidUf(ufNorm) || cityNorm.length < 1 || streetNorm.length < 3) return [];

  const key = `${ufNorm}|${cityNorm.toLowerCase()}|${streetNorm.toLowerCase()}`;
  const cached = streetCache.get(key);
  if (cached) return cached;

  const url = `${BASE}/${encodeURIComponent(ufNorm)}/${encodeURIComponent(cityNorm)}/${encodeURIComponent(streetNorm)}/json/`;
  const json = await fetchJson(url);

  // ViaCEP returns an array (or `{ erro: true }` / non-array on bad input).
  const list = Array.isArray(json) ? (json as ViaCepRaw[]) : [];
  const result = list
    .map((raw) => mapRaw(raw, "street"))
    .filter((s): s is AddressSuggestion => s !== null);

  streetCache.set(key, result);
  return result;
}

/** Test helper — clears the in-memory caches. */
export function __clearAddressCache(): void {
  cepCache.clear();
  streetCache.clear();
}
