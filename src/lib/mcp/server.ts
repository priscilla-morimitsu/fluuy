import "server-only";

import { createMcpHandler } from "mcp-handler";

import { registerStoreInfoTool } from "@/lib/mcp/tools/store-info";

/**
 * Fluuy MCP server consumed by the Zatten agent. Tools are registered here and
 * resolve their tenant from the bearer token (see lib/mcp/tokens). Auth is
 * applied at the route via `withMcpAuth`.
 *
 * Phase 0: a single read tool (`info_estabelecimento`). Read/write tools are
 * added per the spec at
 * .claude/docs/specs/integrations/zatten-mcp/spec-zatten-mcp.md.
 */
export const mcpHandler = createMcpHandler(
  (server) => {
    registerStoreInfoTool(server);
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
