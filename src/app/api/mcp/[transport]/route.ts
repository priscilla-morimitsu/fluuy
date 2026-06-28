import { withMcpAuth } from "mcp-handler";

import { mcpHandler } from "@/lib/mcp/server";
import { verifyMcpBearer } from "@/lib/mcp/tokens";

/**
 * Remote MCP endpoint for the Zatten agent.
 *   Streamable HTTP:  /api/mcp/mcp   (configure this URL in Zatten)
 *   SSE (legacy):     /api/mcp/sse   (needs REDIS_URL; unused in MVP)
 *
 * Auth: `Authorization: Bearer <token>` → verifyMcpBearer → tenant context.
 * Node runtime is required (Prisma). See ADR 0001 / spec-zatten-mcp.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handler = withMcpAuth(mcpHandler, verifyMcpBearer, {
  required: true,
  requiredScopes: ["read"],
});

export { handler as GET, handler as POST, handler as DELETE };
