import "server-only";

import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { prisma } from "@/lib/prisma";
import { hashMcpToken } from "@/lib/mcp/token-crypto";

/**
 * Bearer verification for the Fluuy MCP server. Resolves a tenant from the
 * incoming token and exposes it to tools via `AuthInfo.extra.tenantId`.
 *
 * Isolation contract: tenant_id comes ONLY from the token here — never from tool
 * input. See spec at
 * .claude/docs/specs/integrations/zatten-mcp/spec-zatten-mcp.md.
 */

const LAST_USED_THROTTLE_MS = 60_000;

interface McpTenantContext {
  tenantId: string;
  scopes: string[];
  tokenId: string | null;
}

/** `withMcpAuth` verifier: returns AuthInfo for a valid token, else undefined (→ 401). */
export async function verifyMcpBearer(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const ctx = (await resolveDevToken(bearerToken)) ?? (await resolveDbToken(bearerToken));
  if (!ctx) return undefined;

  return {
    token: bearerToken,
    clientId: ctx.tenantId,
    scopes: ctx.scopes,
    extra: { tenantId: ctx.tenantId, tokenId: ctx.tokenId },
  };
}

/**
 * Dev-only shortcut so the transport/auth can be smoke-tested without minting a
 * DB token (e.g. before the migration runs). Disabled in production. Set
 * MCP_DEV_TOKEN + MCP_DEV_TENANT_SLUG to use it.
 */
async function resolveDevToken(bearerToken: string): Promise<McpTenantContext | null> {
  if (process.env.NODE_ENV === "production") return null;
  const devToken = process.env.MCP_DEV_TOKEN;
  if (!devToken || bearerToken !== devToken) return null;

  // Prefer an explicit id — DB-free, so the transport + tool discovery can be
  // smoke-tested even with Postgres down.
  const devTenantId = process.env.MCP_DEV_TENANT_ID;
  if (devTenantId) return { tenantId: devTenantId, scopes: ["read"], tokenId: null };

  const devSlug = process.env.MCP_DEV_TENANT_SLUG;
  if (!devSlug) return null;
  const tenant = await prisma.tenant.findUnique({ where: { slug: devSlug }, select: { id: true } });
  if (!tenant) return null;
  return { tenantId: tenant.id, scopes: ["read"], tokenId: null };
}

async function resolveDbToken(bearerToken: string): Promise<McpTenantContext | null> {
  const tokenHash = hashMcpToken(bearerToken);
  const row = await prisma.mcpAccessToken.findUnique({
    where: { tokenHash },
    select: { id: true, tenantId: true, scopes: true, status: true, expiresAt: true, lastUsedAt: true },
  });

  if (!row || row.status !== "active") return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  // Best-effort, throttled usage stamp — never block or fail the request on it.
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
    void prisma.mcpAccessToken
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch((err: unknown) => console.error("[mcp] failed to stamp lastUsedAt:", err));
  }

  return { tenantId: row.tenantId, scopes: row.scopes, tokenId: row.id };
}

/** Extracts the resolved tenant from a tool's `extra.authInfo`. Throws if absent. */
export function getTenantId(authInfo: AuthInfo | undefined): string {
  const tenantId = authInfo?.extra?.tenantId;
  if (typeof tenantId !== "string" || !tenantId) {
    throw new Error("MCP tool invoked without a resolved tenant context.");
  }
  return tenantId;
}

/** Whether the authenticated token carries a given scope (e.g. "write"). */
export function hasScope(authInfo: AuthInfo | undefined, scope: string): boolean {
  return Array.isArray(authInfo?.scopes) && authInfo.scopes.includes(scope);
}
