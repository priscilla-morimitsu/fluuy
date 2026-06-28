import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { generateMcpToken, hashMcpToken, MCP_TOKEN_SCHEME } from "@/lib/mcp/token-crypto";

describe("mcp token-crypto", () => {
  it("generates a scheme-prefixed token with a matching hash and display prefix", () => {
    const { token, tokenHash, tokenPrefix } = generateMcpToken();

    expect(token.startsWith(MCP_TOKEN_SCHEME)).toBe(true);
    expect(tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(tokenHash).toHaveLength(64);
    expect(token.startsWith(tokenPrefix)).toBe(true);
    expect(tokenPrefix).toHaveLength(MCP_TOKEN_SCHEME.length + 8);
  });

  it("hashes deterministically and uniquely per token", () => {
    const a = generateMcpToken().token;
    const b = generateMcpToken().token;

    expect(a).not.toBe(b);
    expect(hashMcpToken(a)).toBe(hashMcpToken(a));
    expect(hashMcpToken(a)).not.toBe(hashMcpToken(b));
  });
});
