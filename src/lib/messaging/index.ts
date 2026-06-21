import "server-only";

import type { MessagingProvider as MessagingProviderEnum } from "@/generated/prisma/client";

import { PilotStatusWhatsAppProvider } from "./providers/pilot-status";
import type { MessagingProvider } from "./types";

export * from "./types";
export { MessagingProviderError, PROVIDER_ERROR_CODES } from "./errors";
export { toE164, digitsOnly, brPhoneCandidates } from "./phone";

/**
 * Builds the concrete MessagingProvider for a given provider + API key. App
 * code calls this — never `new PilotStatusWhatsAppProvider` — so adding a
 * provider is a single switch arm here.
 */
export function getMessagingProvider(
  provider: MessagingProviderEnum,
  apiKey: string,
): MessagingProvider {
  switch (provider) {
    case "pilot_status_whatsapp":
      return new PilotStatusWhatsAppProvider({ apiKey });
    default:
      throw new Error(`Messaging provider not implemented: ${provider}`);
  }
}

/**
 * The provider built from the parent/master key in ENV. Used for instance and
 * child-key management (never for sending on a tenant's behalf). The parent key
 * stays server-side only.
 */
export function getParentMessagingProvider(): MessagingProvider {
  const apiKey = process.env.PILOT_STATUS_API_KEY;
  if (!apiKey) throw new Error("PILOT_STATUS_API_KEY (parent key) is not set.");
  return new PilotStatusWhatsAppProvider({ apiKey });
}

/** Maps the env prefix of an API key to our environment enum. */
export function detectEnvironment(keyPrefix: string): "test" | "live" {
  return keyPrefix.startsWith("ps_live") ? "live" : "test";
}
