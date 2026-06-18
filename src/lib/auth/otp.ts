import "server-only";

import crypto from "node:crypto";

import { hmacSha256 } from "@/lib/auth/crypto";
import { checkOtpRequestRateLimit } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const CODE_TTL_MINUTES = CODE_TTL_MS / 60_000;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_REQUESTS_PER_WINDOW = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const hmac = hmacSha256;

export function normalizeIdentifier(channel: "email" | "whatsapp", identifier: string): string {
  return channel === "email" ? identifier.trim().toLowerCase() : identifier.trim();
}

function generateNumericCode(): string {
  // crypto.randomInt is CSPRNG-backed (unlike Math.random) — required for OTPs.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export type OtpChannel = "email" | "whatsapp";

/**
 * Creates a one-time code for an existing, active user and returns the
 * plaintext code for the caller to send via the relevant provider. Returns
 * null (no row created, nothing to send) when no matching active user
 * exists — callers must still report generic success to the client to avoid
 * user enumeration (see security.md).
 */
export async function issueOtp(params: { channel: OtpChannel; identifier: string }): Promise<{
  code: string;
  userId: string;
} | null> {
  const identifier = normalizeIdentifier(params.channel, params.identifier);
  const identifierHash = hmac(identifier);

  await checkOtpRequestRateLimit({
    identifierHash,
    channel: params.channel,
    max: MAX_REQUESTS_PER_WINDOW,
    windowMs: REQUEST_WINDOW_MS,
  });

  const user = await prisma.user.findFirst({
    where:
      params.channel === "email"
        ? { email: identifier, status: "active" }
        : { phone: identifier, status: "active" },
  });
  if (!user) return null;

  const code = generateNumericCode();
  await prisma.authVerificationCode.create({
    data: {
      userId: user.id,
      identifierHash,
      channel: params.channel,
      purpose: "login",
      codeHash: hmac(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      maxAttempts: MAX_VERIFY_ATTEMPTS,
    },
  });

  return { code, userId: user.id };
}

export type OtpVerifyResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

export async function verifyOtp(params: {
  channel: OtpChannel;
  identifier: string;
  code: string;
}): Promise<OtpVerifyResult> {
  const identifier = normalizeIdentifier(params.channel, params.identifier);
  const identifierHash = hmac(identifier);

  const candidate = await prisma.authVerificationCode.findFirst({
    where: {
      identifierHash,
      channel: params.channel,
      purpose: "login",
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!candidate) return { ok: false, reason: "invalid" };
  if (candidate.attempts >= candidate.maxAttempts) return { ok: false, reason: "too_many_attempts" };
  if (candidate.expiresAt < new Date()) return { ok: false, reason: "expired" };

  const matches = hmac(params.code) === candidate.codeHash;
  if (!matches) {
    await prisma.authVerificationCode.update({
      where: { id: candidate.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "invalid" };
  }

  await prisma.authVerificationCode.update({
    where: { id: candidate.id },
    data: { consumedAt: new Date() },
  });

  // userId is always set for "login" purpose codes (issueOtp requires an
  // existing user before creating the row).
  return { ok: true, userId: candidate.userId! };
}
