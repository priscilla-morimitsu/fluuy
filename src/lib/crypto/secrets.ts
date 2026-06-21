import "server-only";

import crypto from "node:crypto";

/**
 * Reversible secret-at-rest encryption (AES-256-GCM) for per-tenant provider
 * credentials — e.g. a tenant's WhatsApp child API key, which must be decrypted
 * to make outbound calls (unlike OTP hashes, see hmacSha256). The key is derived
 * from AUTH_SECRET via HKDF with a fixed app-scoped info label, so rotating
 * AUTH_SECRET invalidates stored ciphertexts (intended: secrets must be re-set).
 *
 * Wire format (single base64url string): version | iv(12) | authTag(16) | ciphertext.
 */
const VERSION = 0x01;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_INFO = "fluuy:secret-encryption:v1";

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  // HKDF-SHA256 → 32-byte key. Empty salt is fine: the input is already a
  // high-entropy secret and `info` domain-separates this use from any other.
  return Buffer.from(crypto.hkdfSync("sha256", secret, Buffer.alloc(0), KEY_INFO, 32));
}

/** Encrypts a plaintext secret; returns an opaque base64url token. */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) throw new Error("Cannot encrypt an empty secret.");
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, authTag, ciphertext]).toString("base64url");
}

/** Reverses {@link encryptSecret}. Throws on tampering or wrong key. */
export function decryptSecret(token: string): string {
  const raw = Buffer.from(token, "base64url");
  if (raw.length < 1 + IV_BYTES + TAG_BYTES) throw new Error("Malformed encrypted secret.");
  if (raw[0] !== VERSION) throw new Error(`Unsupported secret version: ${raw[0]}.`);
  const iv = raw.subarray(1, 1 + IV_BYTES);
  const authTag = raw.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(1 + IV_BYTES + TAG_BYTES);
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
