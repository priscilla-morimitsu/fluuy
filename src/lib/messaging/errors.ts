/**
 * Provider-agnostic messaging error. The concrete provider maps its transport
 * errors (HTTP status + code) onto this so app code never branches on a
 * provider's raw shape. `retriable` flags 429/5xx for backoff.
 */
export class MessagingProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
    readonly details: unknown = null,
    readonly retriable: boolean = false,
  ) {
    super(message);
    this.name = "MessagingProviderError";
  }
}

/** Known provider error codes worth handling explicitly upstream. */
export const PROVIDER_ERROR_CODES = {
  MISSING_TEMPLATE_VARIABLES: "MISSING_TEMPLATE_VARIABLES",
  INVALID_TEMPLATE_VARIABLE_VALUE: "INVALID_TEMPLATE_VARIABLE_VALUE",
  MARKETING_REQUIRES_OWN_NUMBER: "TEMPLATE_CATEGORY_MARKETING_REQUIRES_OWN_NUMBER",
  WHATSAPP_INSTANCE_NOT_CONNECTED: "WHATSAPP_INSTANCE_NOT_CONNECTED",
  NEWSLETTER_NOT_ALLOWED_IN_TEST: "NEWSLETTER_NOT_ALLOWED_IN_TEST",
} as const;
