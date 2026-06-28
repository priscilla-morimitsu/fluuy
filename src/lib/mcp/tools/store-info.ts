import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/mcp/tokens";

/**
 * `info_estabelecimento` — first/Phase-0 MCP tool. Returns the tenant's own
 * registered store info (hours, address, contact, payment, capabilities) so the
 * Zatten agent can answer institutional questions with real data. The tenant is
 * resolved from the bearer token (never from input).
 */

const TOPICO = z
  .enum(["horario", "endereco", "contato", "pagamento", "capacidades", "tudo"])
  .optional()
  .describe("Filtra a informação desejada. Omita para receber o resumo completo.");

interface StoreInfo {
  name: string;
  publicPhone: string | null;
  publicEmail: string | null;
  address: unknown;
  businessHours: unknown;
  serviceAreas: unknown;
  paymentMethods: unknown;
  hasProducts: boolean;
  hasServices: boolean;
  hasPlans: boolean;
  hasDelivery: boolean;
  hasPickup: boolean;
  acceptsOnlinePayment: boolean;
}

export function registerStoreInfoTool(server: McpServer): void {
  server.registerTool(
    "info_estabelecimento",
    {
      title: "Informações do estabelecimento",
      description:
        "Retorna os dados cadastrais do petshop (tenant atual): horário de funcionamento, " +
        "endereço, telefone/e-mail, formas de pagamento e o que ele oferece (produtos, serviços, " +
        "planos, entrega/retirada). Use para responder perguntas institucionais. Retorna apenas o " +
        "que está cadastrado — nunca invente dados que não vierem nesta resposta.",
      inputSchema: { topico: TOPICO },
    },
    async (_args, extra) => {
      const tenantId = getTenantId(extra.authInfo);
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          publicPhone: true,
          publicEmail: true,
          address: true,
          businessHours: true,
          serviceAreas: true,
          paymentMethods: true,
          hasProducts: true,
          hasServices: true,
          hasPlans: true,
          hasDelivery: true,
          hasPickup: true,
          acceptsOnlinePayment: true,
        },
      });

      if (!tenant) {
        return {
          isError: true,
          content: [{ type: "text", text: "Estabelecimento não encontrado para este token." }],
        };
      }

      return { content: [{ type: "text", text: formatStoreInfo(tenant) }] };
    },
  );
}

function formatStoreInfo(t: StoreInfo): string {
  const lines: string[] = [`*${t.name}*`];

  const hours = asReadable(t.businessHours);
  if (hours) lines.push(`Horário: ${hours}`);

  const addr = asReadable(t.address);
  if (addr) lines.push(`Endereço: ${addr}`);

  if (t.publicPhone) lines.push(`Telefone: ${t.publicPhone}`);
  if (t.publicEmail) lines.push(`E-mail: ${t.publicEmail}`);

  const pay = asReadable(t.paymentMethods);
  if (pay) lines.push(`Pagamento: ${pay}`);

  const areas = asReadable(t.serviceAreas);
  if (areas) lines.push(`Áreas atendidas: ${areas}`);

  const offerings = [
    t.hasProducts && "produtos",
    t.hasServices && "serviços",
    t.hasPlans && "planos",
    t.hasDelivery && "entrega",
    t.hasPickup && "retirada",
    t.acceptsOnlinePayment && "pagamento online",
  ].filter((v): v is string => typeof v === "string");
  if (offerings.length) lines.push(`Oferece: ${offerings.join(", ")}`);

  return lines.join("\n");
}

/**
 * Defensive renderer for tenant-defined JSON (address/businessHours/…). Phase 0
 * keeps it compact; Phase 2 should format using the canonical shapes in
 * lib/validations/tenant.
 */
function asReadable(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(asReadable).filter((v): v is string => Boolean(v));
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value);
      return json === "{}" ? null : json;
    } catch {
      return null;
    }
  }
  return null;
}
