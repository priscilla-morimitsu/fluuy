import "server-only";

import { createMcpHandler } from "mcp-handler";

import { registerStoreInfoTool } from "@/lib/mcp/tools/store-info";
import { registerReadTools } from "@/lib/mcp/tools/read-tools";

/**
 * Fluuy MCP server consumed by the Zatten agent. Tools are registered here and
 * resolve their tenant from the bearer token (see lib/mcp/tokens). Auth is
 * applied at the route via `withMcpAuth`.
 *
 * Phase 0: `info_estabelecimento`. Phase 2: read tools (catálogo, tutor/pet,
 * disponibilidade, pedido, agenda) — see lib/mcp/tools/read-tools. Write tools
 * (Phase 3) per the spec at
 * .claude/docs/specs/integrations/zatten-mcp/spec-zatten-mcp.md.
 */
export const mcpHandler = createMcpHandler(
  (server) => {
    registerStoreInfoTool(server);
    registerReadTools(server);
  },
  {
    serverInfo: { name: "fluuy-mcp", version: "0.1.0" },
    capabilities: { tools: {} },
  },
  {
    // Must match the route folder: src/app/api/mcp/[transport]/route.ts
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV !== "production",
  },
);
