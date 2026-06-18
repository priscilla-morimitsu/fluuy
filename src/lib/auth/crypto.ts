import "server-only";

import crypto from "node:crypto";

/**
 * Shared HMAC helper for everything that needs to store a hash instead of a
 * raw secret (OTP codes, OTP identifiers, password reset tokens) — keyed by
 * AUTH_SECRET so the hash can't be reproduced without it.
 */
export function hmacSha256(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

/** Random URL-safe token for password reset links — returned to the caller
 * only once; only its hash is ever persisted. */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
