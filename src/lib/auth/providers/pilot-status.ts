import "server-only";

const BASE_URL = "https://pilotstatus.online/v1";

// Auth header: prefer x-api-key-id (a specific child key, e.g. for a
// per-client WhatsApp number in a multi-tenant Pilot Status project) and
// fall back to the raw x-api-key when no id is configured.
function authHeader(): Record<string, string> {
  const keyId = process.env.PILOT_STATUS_API_KEY_ID;
  if (keyId) return { "x-api-key-id": keyId };

  const key = process.env.PILOT_STATUS_API_KEY;
  if (!key) throw new Error("PILOT_STATUS_API_KEY or PILOT_STATUS_API_KEY_ID must be set.");
  return { "x-api-key": key };
}

function otpTemplateId(): string {
  const id = process.env.PILOT_STATUS_OTP_TEMPLATE_ID;
  if (!id) throw new Error("PILOT_STATUS_OTP_TEMPLATE_ID is not set.");
  return id;
}

/**
 * Isolated Pilot Status adapter — the only module that calls the Pilot
 * Status API or reads its env vars (see .claude/skills/pilot-status.md).
 * Sends the pre-approved OTP-category template; `destinationNumber` must be
 * E.164 (+countrycode...). Never logs the code itself.
 */
export async function sendOtpWhatsapp(
  destinationNumber: string,
  code: string,
  expiryMinutes: number,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({
      templateId: otpTemplateId(),
      destinationNumber,
      // Matches the "verification_code" template's variables — every
      // {{placeholder}} must be a non-empty string per the Pilot Status API.
      variables: { otp_code: code, expiry_minutes: String(expiryMinutes) },
    }),
  });

  if (!res.ok) {
    // Surface the HTTP status only — never the response body, which could
    // include account/template details we don't want in application logs.
    throw new Error(`Pilot Status OTP send failed with status ${res.status}`);
  }
}
