import crypto from "node:crypto";

/**
 * Pure token helpers for the Fluuy MCP server (no "server-only", no Prisma) so
 * both the request path ({@link file://./tokens.ts}) and the mint CLI
 * (`scripts/mcp-mint-token.ts`, run via tsx) can share them.
 *
 * A token is a high-entropy opaque string. We persist ONLY its sha256 hash; the
 * plaintext is shown once at mint time. Hashing a high-entropy secret needs no
 * salt, and lookup is by the unique `token_hash` column.
 */
export const MCP_TOKEN_SCHEME = "mcp_live_";

/** Chars (after the scheme) kept in `token_prefix` for display/logs. */
const PREFIX_DISPLAY_CHARS = 8;

export interface GeneratedMcpToken {
  /** Plaintext — return to the operator ONCE, never stored. */
  token: string;
  /** sha256(token) hex — what we persist and look up by. */
  tokenHash: string;
  /** e.g. "mcp_live_Ab12Cd34" — safe to store/show in lists and logs. */
  tokenPrefix: string;
}

export function generateMcpToken(): GeneratedMcpToken {
  const token = `${MCP_TOKEN_SCHEME}${crypto.randomBytes(32).toString("base64url")}`;
  return {
    token,
    tokenHash: hashMcpToken(token),
    tokenPrefix: token.slice(0, MCP_TOKEN_SCHEME.length + PREFIX_DISPLAY_CHARS),
  };
}

export function hashMcpToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
