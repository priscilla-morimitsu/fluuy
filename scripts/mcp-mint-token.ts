import "dotenv/config";

import { prisma } from "@/lib/prisma";
import { generateMcpToken } from "@/lib/mcp/token-crypto";

/**
 * Mints an MCP access token for a tenant and prints it ONCE (only the hash is
 * stored). Use it to connect a tenant's Zatten agent.
 *
 *   npm run mcp:token -- --tenant <slug> --name "Agente Zatten" [--scopes read,write] [--expires-days 365]
 */

interface Args {
  tenant?: string;
  name?: string;
  scopes: string[];
  expiresDays?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { scopes: ["read"] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--tenant") {
      args.tenant = value;
      i++;
    } else if (flag === "--name") {
      args.name = value;
      i++;
    } else if (flag === "--scopes") {
      args.scopes = (value ?? "read").split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (flag === "--expires-days") {
      args.expiresDays = Number(value);
      i++;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.tenant) {
    console.error(
      'Uso: npm run mcp:token -- --tenant <slug> --name "Agente Zatten" [--scopes read,write] [--expires-days 365]',
    );
    process.exitCode = 1;
    return;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: args.tenant },
    select: { id: true, name: true },
  });
  if (!tenant) {
    console.error(`Tenant não encontrado para slug "${args.tenant}".`);
    process.exitCode = 1;
    return;
  }

  const { token, tokenHash, tokenPrefix } = generateMcpToken();
  const expiresAt =
    args.expiresDays && args.expiresDays > 0
      ? new Date(Date.now() + args.expiresDays * 86_400_000)
      : null;

  const created = await prisma.mcpAccessToken.create({
    data: {
      tenantId: tenant.id,
      name: args.name ?? "Agente Zatten",
      tokenHash,
      tokenPrefix,
      scopes: args.scopes,
      expiresAt,
    },
    select: { id: true, scopes: true, expiresAt: true },
  });

  console.log("\n✅ Token MCP criado (copie agora — não será exibido de novo):\n");
  console.log(`   ${token}\n`);
  console.log(`   tenant:  ${tenant.name} (${args.tenant})`);
  console.log(`   id:      ${created.id}`);
  console.log(`   prefix:  ${tokenPrefix}`);
  console.log(`   scopes:  ${created.scopes.join(", ")}`);
  console.log(`   expira:  ${created.expiresAt ? created.expiresAt.toISOString() : "nunca"}`);
  console.log("\nConfigure no Zatten (Ação MCP):");
  console.log("   URL:  https://<host>/api/mcp/mcp");
  console.log("   Auth: Bearer Token = (o token acima)\n");
}

main()
  .catch((err: unknown) => {
    console.error("Falha ao criar token MCP:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
