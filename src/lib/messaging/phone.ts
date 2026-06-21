/**
 * Phone helpers shared by the messaging layer. Providers want E.164 with a
 * leading "+"; our dedup keys (Customer/CustomerLead.phoneNormalized) and the
 * webhook tenant resolver want digits. Brazil-aware: handles the optional 9th
 * mobile digit and the 55 country code.
 */

/** Strips everything but digits (and drops a WhatsApp JID suffix if present). */
export function digitsOnly(value: string): string {
  return value.split("@")[0]!.replace(/\D/g, "");
}

/** Normalizes to E.164 with a leading "+". Assumes BR (55) when no country code. */
export function toE164(value: string): string {
  let digits = digitsOnly(value);
  if (!digits) throw new Error("Empty phone number.");
  // Heuristic: a 10/11-digit number is a local BR number missing the 55 prefix.
  if (digits.length <= 11) digits = `55${digits}`;
  return `+${digits}`;
}

/**
 * Generates the set of digit-only candidates a single inbound number could
 * match against a stored `phoneNormalized`, covering: with/without 55, and the
 * BR mobile 9th digit being present or absent. Used by the webhook to resolve a
 * tenant/customer without forcing one canonical form everywhere.
 */
export function brPhoneCandidates(value: string): string[] {
  const digits = digitsOnly(value);
  if (!digits) return [];
  const candidates = new Set<string>([digits]);

  const withoutCc = digits.startsWith("55") ? digits.slice(2) : digits;
  candidates.add(withoutCc);
  candidates.add(`55${withoutCc}`);

  // Toggle the 9th mobile digit on the local part (DDD + number).
  if (withoutCc.length === 11 && withoutCc[2] === "9") {
    const without9 = withoutCc.slice(0, 2) + withoutCc.slice(3);
    candidates.add(without9);
    candidates.add(`55${without9}`);
  } else if (withoutCc.length === 10) {
    const with9 = `${withoutCc.slice(0, 2)}9${withoutCc.slice(2)}`;
    candidates.add(with9);
    candidates.add(`55${with9}`);
  }

  return [...candidates];
}
