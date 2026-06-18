import "server-only";

import { prisma } from "@/lib/prisma";
import type { AuthAuditEvent } from "@/lib/auth/audit";

export class RateLimitedError extends Error {
  constructor(message = "Too many attempts, try again later.") {
    super(message);
    this.name = "RateLimitedError";
  }
}

/**
 * Counts recent rows in auth_audit_logs matching `event` for a given key
 * (typically an IP address or identifier hash, stored in metadata.key) within
 * `windowMs`. No Redis — fine for the MVP's expected volume; the audit log is
 * already being written for every sensitive action, so this reuses it instead
 * of standing up new infrastructure.
 */
export async function checkRateLimit(params: {
  event: AuthAuditEvent;
  key: string;
  max: number;
  windowMs: number;
}) {
  const since = new Date(Date.now() - params.windowMs);
  const count = await prisma.authAuditLog.count({
    where: {
      event: params.event,
      createdAt: { gte: since },
      metadata: { path: ["key"], equals: params.key },
    },
  });
  if (count >= params.max) {
    throw new RateLimitedError();
  }
}

/**
 * Verification-code-specific limiter: counts recent unconsumed codes issued
 * for the same identifier+channel, independent of the audit log (covers the
 * "request" side; otp.ts's attempts/maxAttempts covers the "verify" side).
 */
export async function checkOtpRequestRateLimit(params: {
  identifierHash: string;
  channel: "email" | "whatsapp";
  max: number;
  windowMs: number;
}) {
  const since = new Date(Date.now() - params.windowMs);
  const count = await prisma.authVerificationCode.count({
    where: {
      identifierHash: params.identifierHash,
      channel: params.channel,
      createdAt: { gte: since },
    },
  });
  if (count >= params.max) {
    throw new RateLimitedError();
  }
}
