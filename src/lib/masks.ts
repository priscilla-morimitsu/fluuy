/**
 * Client-side masks and document validators for Brazilian fields.
 * Masks are UX only — canonical validation/normalization happens server-side
 * with Zod. These helpers also expose the normalized (digits-only) values to
 * persist instead of the masked strings.
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

/** "58030280" | "58030-280" → "58030-280" (caps at 8 digits). */
export function maskCep(raw: string): string {
  const d = onlyDigits(raw).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Brazilian phone, 10 or 11 digits → "(11) 99999-9999". */
export function maskPhoneBR(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Progressive CPF (###.###.###-##) / CNPJ (##.###.###/####-##) mask. */
export function maskCpfCnpj(raw: string): string {
  const d = onlyDigits(raw).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** From keystrokes to "1.234,56" (treats the digits as cents). */
export function maskCurrencyBRL(raw: string): string {
  const digits = onlyDigits(raw);
  if (!digits) return "";
  const value = Number(digits) / 100;
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "1.234,56" → 1234.56 (number). */
export function parseCurrencyBRL(masked: string): number {
  const digits = onlyDigits(masked);
  return digits ? Number(digits) / 100 : 0;
}

/** Official CPF check-digit algorithm (not a regex). */
export function isValidCpf(input: string): boolean {
  const c = onlyDigits(input);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(c[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== Number(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(c[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === Number(c[10]);
}

/** Official CNPJ check-digit algorithm. */
export function isValidCnpj(input: string): boolean {
  const c = onlyDigits(input);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const digit = (len: number): number => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  if (digit(12) !== Number(c[12])) return false;
  return digit(13) !== Number(c[13]) ? false : true;
}

/** true for a complete and valid CPF (11) or CNPJ (14). */
export function isValidCpfCnpj(input: string): boolean {
  const d = onlyDigits(input);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}
