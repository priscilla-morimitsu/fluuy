import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/mcp/tokens";
import { formatBRL, resolveTutor, readJsonRecord, listTutorPets } from "@/lib/mcp/tools/_shared";

/**
 * Phase 2 — read tools for the Zatten petshop agent. Every tool resolves the
 * tenant from the bearer token (`getTenantId`) and the tutor by phone within the
 * tenant (anti-IDOR). They return only active/cataloged data and NEVER invent
 * values — empty results say "não encontrado" so the agent can fall back.
 */

const PHONE = z
  .string()
  .min(8)
  .describe("Telefone do contato no WhatsApp (com DDD). Resolve o tutor dentro do petshop.");

const WEEKDAYS_PT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const ORDER_STATUS_PT: Record<string, string> = {
  draft: "rascunho",
  pending_confirmation: "aguardando confirmação",
  confirmed: "confirmado",
  scheduled: "agendado",
  in_progress: "em andamento",
  ready: "pronto",
  out_for_delivery: "saiu para entrega",
  completed: "concluído",
  cancelled: "cancelado",
};

const APPOINTMENT_STATUS_PT: Record<string, string> = {
  requested: "solicitado",
  pending_confirmation: "aguardando confirmação",
  confirmed: "confirmado",
  in_progress: "em andamento",
  completed: "concluído",
  cancelled: "cancelado",
  no_show: "não compareceu",
  rescheduled: "remarcado",
};

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function textResult(text: string): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text }] };
}

const SEARCH_STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "para", "pra", "pro", "e", "com", "a", "o", "os", "as",
  "em", "um", "uma", "no", "na", "meu", "minha", "pet",
]);

// Sinônimos de espécie: o usuário/modelo pode dizer "cão" mas o cadastro usa "cães"/"cachorro".
const SPECIES_SYNONYMS: Record<string, string[]> = {
  cao: ["cão", "cães", "cachorro", "cachorros", "canino"],
  gato: ["gato", "gatos", "felino", "felina"],
};

/**
 * Quebra termo/espécie/porte em tokens de busca tolerantes: remove stopwords, ignora tokens
 * curtos e expande sinônimos de espécie. Usado para casar por QUALQUER token (OR), evitando
 * que frases compostas ("ração para cães") ou filtros de espécie zerem o resultado.
 */
function buildSearchTokens(...inputs: (string | undefined)[]): string[] {
  const out = new Set<string>();
  for (const input of inputs) {
    if (!input) continue;
    for (const word of input.split(/\s+/)) {
      const cleaned = word.trim();
      if (cleaned.length < 3) continue;
      if (SEARCH_STOPWORDS.has(normalizeKey(cleaned))) continue;
      out.add(cleaned);
      const synonyms = SPECIES_SYNONYMS[normalizeKey(cleaned)];
      if (synonyms) for (const s of synonyms) out.add(s);
    }
  }
  return [...out];
}

/**
 * Casamento de busca insensível a acento e maiúsculas (feito na aplicação, já que o catálogo
 * por tenant é pequeno). Retorna true se QUALQUER token (normalizado) aparecer no texto.
 */
function matchesTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const h = normalizeKey(haystack);
  return tokens.some((t) => h.includes(normalizeKey(t)));
}

/** Builds "HH:MM" slot starts from a window, stepping by `stepMin` minutes. */
function buildSlots(startTime: string, endTime: string, stepMin: number): string[] {
  const toMin = (hhmm: string): number => {
    const [h, m] = hhmm.split(":").map((p) => Number(p));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  const start = toMin(startTime);
  const end = toMin(endTime);
  const step = stepMin > 0 ? stepMin : 30;
  const slots: string[] = [];
  for (let t = start; t + step <= end && slots.length < 24; t += step) {
    slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return slots;
}

export function registerReadTools(server: McpServer): void {
  // ── identificar_tutor ─────────────────────────────────────────────────────
  server.registerTool(
    "identificar_tutor",
    {
      title: "Identificar tutor",
      description:
        "Resolve o tutor pelo telefone do contato dentro do petshop e retorna seus pets. Use no " +
        "início da conversa. Se não for cliente, retorna 'não cadastrado' — trate como lead, nunca " +
        "invente dados de outro cliente.",
      inputSchema: { phone: PHONE },
    },
    async ({ phone }, extra) => {
      const tenantId = getTenantId(extra.authInfo);
      const tutor = await resolveTutor(tenantId, phone);
      if (!tutor) return textResult("Tutor não cadastrado para este telefone.");

      const pets = await listTutorPets(tenantId, tutor.id);

      const lines = [`Tutor: ${tutor.name}`];
      if (pets.length === 0) {
        lines.push("Pets: nenhum cadastrado.");
      } else {
        lines.push("Pets:");
        for (const p of pets) {
          const attrs = [p.species, p.breed, p.size].filter(Boolean).join(", ");
          lines.push(`- ${p.name}${attrs ? ` (${attrs})` : ""}`);
        }
      }
      return textResult(lines.join("\n"));
    },
  );

  // ── listar_pets ───────────────────────────────────────────────────────────
  server.registerTool(
    "listar_pets",
    {
      title: "Listar pets do tutor",
      description:
        "Lista os pets do tutor (pelo telefone), com espécie, porte e observações de saúde " +
        "cadastradas. Use para 'quais pets tenho' ou carteira/observações. Só dados do dono do número.",
      inputSchema: { phone: PHONE },
    },
    async ({ phone }, extra) => {
      const tenantId = getTenantId(extra.authInfo);
      const tutor = await resolveTutor(tenantId, phone);
      if (!tutor) return textResult("Tutor não cadastrado para este telefone.");

      const pets = await listTutorPets(tenantId, tutor.id);

      if (pets.length === 0) return textResult("Nenhum pet cadastrado para este tutor.");

      const lines = pets.map((p) => {
        const attrs = [p.species, p.breed, p.size, p.sex].filter(Boolean).join(", ");
        const notes = p.healthNotes ? ` — obs.: ${p.healthNotes}` : "";
        return `- ${p.name}${attrs ? ` (${attrs})` : ""}${notes}`;
      });
      return textResult(`Pets de ${tutor.name}:\n${lines.join("\n")}`);
    },
  );

  // ── buscar_servicos ───────────────────────────────────────────────────────
  server.registerTool(
    "buscar_servicos",
    {
      title: "Buscar serviços",
      description:
        "Lista serviços ATIVOS do petshop (banho, tosa, consulta, etc.) com preço por porte e " +
        "duração. O preço varia por porte: se souber o porte do pet, passe em 'porte' para o valor " +
        "exato; senão informe 'a partir de'. Só retorna o que está cadastrado.",
      inputSchema: {
        termo: z.string().optional().describe("Texto para filtrar (ex.: banho, tosa, consulta)."),
        porte: z
          .string()
          .optional()
          .describe("Porte do pet (pequeno, médio, grande, gigante) para o preço exato."),
      },
    },
    async ({ termo, porte }, extra) => {
      const tenantId = getTenantId(extra.authInfo);
      // Busca tolerante (insensível a acento, por tokens): "banho e tosa" casa com
      // "Banho + Tosa Higiênica", "racao"/"ração" idem. Filtro feito na aplicação.
      const tokens = buildSearchTokens(termo);
      const allServices = await prisma.service.findMany({
        where: { tenantId, status: "active", availableForBooking: true },
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
          promotionalPrice: true,
          estimatedDurationMinutes: true,
          customData: true,
        },
        orderBy: { name: "asc" },
      });
      const services = allServices
        .filter((s) => matchesTokens(`${s.name} ${s.description ?? ""}`, tokens))
        .slice(0, 12);

      if (services.length === 0) {
        return textResult("Nenhum serviço encontrado para esse filtro.");
      }

      const porteKey = porte ? normalizeKey(porte) : null;
      const lines = services.map((s) => {
        const pricing = readJsonRecord(s.customData)["pricingBySize"];
        const bySize =
          pricing && typeof pricing === "object" && !Array.isArray(pricing)
            ? (pricing as Record<string, unknown>)
            : null;

        let price: string;
        if (bySize && porteKey && typeof bySize[porteKey] !== "undefined") {
          price = formatBRL(bySize[porteKey] as number);
        } else if (bySize) {
          const values = Object.values(bySize)
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v));
          price = values.length
            ? `a partir de ${formatBRL(Math.min(...values))} (varia por porte)`
            : formatBRL(s.promotionalPrice ?? s.basePrice);
        } else {
          price = formatBRL(s.promotionalPrice ?? s.basePrice);
        }

        const dur = s.estimatedDurationMinutes ? ` · ~${s.estimatedDurationMinutes}min` : "";
        return `- ${s.name}: ${price}${dur} [ref:${s.id}]`;
      });

      return textResult(
        `Serviços:\n${lines.join("\n")}\n` +
          "(O [ref:...] é o identificador interno do serviço para consultar disponibilidade; " +
          "não mostre ao cliente.)",
      );
    },
  );

  // ── buscar_produtos ───────────────────────────────────────────────────────
  server.registerTool(
    "buscar_produtos",
    {
      title: "Buscar produtos",
      description:
        "Lista produtos ATIVOS disponíveis para venda (ração, areia, acessórios, etc.) com marca e " +
        "preço/promoção. Filtre por termo/marca/espécie. Só retorna o que está cadastrado — nunca " +
        "invente marca, estoque ou preço.",
      inputSchema: {
        termo: z.string().optional().describe("Texto para filtrar (ex.: ração, areia, golden)."),
        marca: z.string().optional().describe("Marca específica."),
        especie: z.string().optional().describe("Espécie (cão, gato)."),
        porte: z.string().optional().describe("Porte, se aplicável."),
      },
    },
    async ({ termo, marca, especie, porte }, extra) => {
      const tenantId = getTenantId(extra.authInfo);
      // Busca tolerante (insensível a acento, por tokens, na aplicação): quebra termo/espécie/
      // porte em tokens e casa SE QUALQUER UM aparecer no nome/descrição/marca. Espécie e porte
      // NÃO filtram duro (zerava produtos cujo nome não repete a espécie); entram como tokens
      // adicionais (com sinônimos de espécie). "ração para cães", "racao" e especie="cão" passam.
      const tokens = buildSearchTokens(termo, especie, porte);
      const marcaKey = marca ? normalizeKey(marca) : null;
      const allProducts = await prisma.product.findMany({
        where: { tenantId, status: "active", availableForSale: true },
        select: { name: true, brand: true, description: true, salePrice: true, promotionalPrice: true },
        orderBy: { name: "asc" },
      });
      const products = allProducts
        .filter((p) => matchesTokens(`${p.name} ${p.brand ?? ""} ${p.description ?? ""}`, tokens))
        .filter((p) => !marcaKey || normalizeKey(p.brand ?? "").includes(marcaKey))
        .slice(0, 12);

      if (products.length === 0) {
        return textResult("Nenhum produto encontrado para esse filtro.");
      }

      const lines = products.map((p) => {
        const brand = p.brand ? ` (${p.brand})` : "";
        const price = p.promotionalPrice
          ? `${formatBRL(p.promotionalPrice)} (promo, de ${formatBRL(p.salePrice)})`
          : formatBRL(p.salePrice);
        return `- ${p.name}${brand}: ${price}`;
      });
      return textResult(`Produtos:\n${lines.join("\n")}`);
    },
  );

  // ── consultar_planos ──────────────────────────────────────────────────────
  server.registerTool(
    "consultar_planos",
    {
      title: "Consultar planos e pacotes",
      description:
        "Lista planos/pacotes ATIVOS (assinatura, pacote pré-pago, combo) com preço, ciclo e itens " +
        "inclusos. Use para interesse em plano mensal/pacote. Só retorna o que está cadastrado.",
      inputSchema: {
        tipo: z
          .enum(["recurring_plan", "prepaid_package", "combo"])
          .optional()
          .describe("Filtra por tipo de plano."),
        servico: z.string().optional().describe("Texto para filtrar pelo nome do plano."),
      },
    },
    async ({ tipo, servico }, extra) => {
      const tenantId = getTenantId(extra.authInfo);
      const where: Prisma.OfferPlanWhereInput = {
        tenantId,
        status: "active",
        availableForSale: true,
      };
      if (tipo) where.type = tipo;
      if (servico) where.name = { contains: servico, mode: "insensitive" };

      const plans = await prisma.offerPlan.findMany({
        where,
        select: {
          name: true,
          type: true,
          price: true,
          promotionalPrice: true,
          billingCycle: true,
          serviceItems: { select: { quantity: true, service: { select: { name: true } } } },
          productItems: { select: { quantity: true, product: { select: { name: true } } } },
        },
        orderBy: { price: "asc" },
        take: 8,
      });

      if (plans.length === 0) return textResult("Nenhum plano ativo encontrado.");

      const cyclePt: Record<string, string> = {
        monthly: "/mês",
        quarterly: "/trimestre",
        semiannual: "/semestre",
        yearly: "/ano",
      };

      const lines = plans.map((p) => {
        const price = p.promotionalPrice
          ? `${formatBRL(p.promotionalPrice)} (de ${formatBRL(p.price)})`
          : formatBRL(p.price);
        const cycle = p.billingCycle ? cyclePt[p.billingCycle] ?? "" : "";
        const items = [
          ...p.serviceItems.map((i) => `${i.quantity}x ${i.service.name}`),
          ...p.productItems.map((i) => `${i.quantity}x ${i.product.name}`),
        ];
        const incl = items.length ? ` — inclui: ${items.join(", ")}` : "";
        return `- ${p.name}: ${price}${cycle}${incl}`;
      });
      return textResult(`Planos:\n${lines.join("\n")}`);
    },
  );

  // ── consultar_disponibilidade ─────────────────────────────────────────────
  server.registerTool(
    "consultar_disponibilidade",
    {
      title: "Consultar disponibilidade",
      description:
        "Retorna as janelas/horários configurados para um serviço. Identifique o serviço por " +
        "'servico' (nome, ex.: 'banho') ou por 'servicoId' (obtido em buscar_servicos). Passe 'data' " +
        "(AAAA-MM-DD) para ver os horários daquele dia. Ofereça SOMENTE os horários retornados e " +
        "avise que a confirmação final é da equipe — não prometa encaixe.",
      inputSchema: {
        servicoId: z.string().optional().describe("ID do serviço (obtido em buscar_servicos)."),
        servico: z
          .string()
          .optional()
          .describe("Nome do serviço (ex.: banho, tosa). Alternativa ao servicoId."),
        data: z.string().optional().describe("Data desejada no formato AAAA-MM-DD."),
      },
    },
    async ({ servicoId, servico, data }, extra) => {
      const tenantId = getTenantId(extra.authInfo);
      if (!servicoId && !servico) {
        return textResult("Informe o serviço (nome em 'servico' ou 'servicoId').");
      }
      const service = await prisma.service.findFirst({
        where: {
          tenantId,
          status: "active",
          ...(servicoId
            ? { id: servicoId }
            : { name: { contains: servico as string, mode: "insensitive" } }),
        },
        select: { id: true, name: true, estimatedDurationMinutes: true },
        orderBy: { name: "asc" },
      });
      if (!service) return textResult("Serviço não encontrado.");

      const rules = await prisma.serviceAvailabilityRule.findMany({
        where: { tenantId, serviceId: service.id, status: "active" },
        select: {
          weekday: true,
          startTime: true,
          endTime: true,
          slotDurationMinutes: true,
        },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      });
      if (rules.length === 0) {
        return textResult(
          `Sem horários configurados para ${service.name}. Posso pedir para a equipe confirmar uma data?`,
        );
      }

      const step = (r: (typeof rules)[number]): number =>
        r.slotDurationMinutes ?? service.estimatedDurationMinutes ?? 30;

      if (data) {
        const parsed = /^\d{4}-\d{2}-\d{2}$/.test(data) ? new Date(`${data}T12:00:00-03:00`) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) {
          return textResult("Data inválida. Use o formato AAAA-MM-DD.");
        }
        const weekday = parsed.getDay();
        const dayRules = rules.filter((r) => r.weekday === weekday);
        if (dayRules.length === 0) {
          return textResult(
            `${service.name}: não atendemos em ${WEEKDAYS_PT[weekday]} (${data}). Quer outro dia?`,
          );
        }
        const slots = dayRules.flatMap((r) => buildSlots(r.startTime, r.endTime, step(r)));
        const unique = Array.from(new Set(slots)).sort();
        return textResult(
          `Horários para ${service.name} em ${data} (${WEEKDAYS_PT[weekday]}): ${unique.join(", ")}.\n` +
            "Sujeito à confirmação da equipe.",
        );
      }

      const byDay = new Map<number, string[]>();
      for (const r of rules) {
        const list = byDay.get(r.weekday) ?? [];
        list.push(`${r.startTime}–${r.endTime}`);
        byDay.set(r.weekday, list);
      }
      const lines = Array.from(byDay.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([wd, windows]) => `- ${WEEKDAYS_PT[wd]}: ${windows.join(", ")}`);
      return textResult(
        `Atendimento de ${service.name}:\n${lines.join("\n")}\n` +
          "Me diga uma data (AAAA-MM-DD) que eu listo os horários.",
      );
    },
  );

  // ── status_pedido ─────────────────────────────────────────────────────────
  server.registerTool(
    "status_pedido",
    {
      title: "Status de pedido",
      description:
        "Mostra os pedidos do tutor (pelo telefone), com código, status e total. Passe 'numero' " +
        "para um pedido específico. Só pedidos do próprio tutor.",
      inputSchema: {
        phone: PHONE,
        numero: z.number().int().optional().describe("Número do pedido, se o tutor informar."),
      },
    },
    async ({ phone, numero }, extra) => {
      const tenantId = getTenantId(extra.authInfo);
      const tutor = await resolveTutor(tenantId, phone);
      if (!tutor) return textResult("Não encontrei cadastro com este telefone.");

      const where: Prisma.OrderWhereInput = { tenantId, customerId: tutor.id };
      if (typeof numero === "number") where.orderNumber = numero;

      const orders = await prisma.order.findMany({
        where,
        select: {
          orderCode: true,
          status: true,
          total: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (orders.length === 0) {
        return textResult(
          typeof numero === "number"
            ? `Não encontrei o pedido ${numero} para este tutor.`
            : "Nenhum pedido encontrado para este tutor.",
        );
      }

      const lines = orders.map((o) => {
        const status = ORDER_STATUS_PT[o.status] ?? o.status;
        return `- ${o.orderCode}: ${status} · ${o._count.items} item(ns) · ${formatBRL(o.total)}`;
      });
      return textResult(`Pedidos:\n${lines.join("\n")}`);
    },
  );

  // ── consultar_agendamentos ────────────────────────────────────────────────
  server.registerTool(
    "consultar_agendamentos",
    {
      title: "Consultar agendamentos",
      description:
        "Lista os próximos agendamentos do tutor (pelo telefone), com serviço, data/hora e status. " +
        "Só agendamentos do próprio tutor.",
      inputSchema: { phone: PHONE },
    },
    async ({ phone }, extra) => {
      const tenantId = getTenantId(extra.authInfo);
      const tutor = await resolveTutor(tenantId, phone);
      if (!tutor) return textResult("Não encontrei cadastro com este telefone.");

      const appts = await prisma.appointment.findMany({
        where: {
          tenantId,
          customerId: tutor.id,
          startAt: { gte: new Date() },
          status: { notIn: ["cancelled", "no_show"] },
        },
        select: { startAt: true, status: true, service: { select: { name: true } } },
        orderBy: { startAt: "asc" },
        take: 5,
      });

      if (appts.length === 0) {
        return textResult("Nenhum agendamento futuro encontrado para este tutor.");
      }

      const lines = appts.map((a) => {
        const status = APPOINTMENT_STATUS_PT[a.status] ?? a.status;
        return `- ${a.service.name}: ${DATE_FMT.format(a.startAt)} · ${status}`;
      });
      return textResult(`Próximos agendamentos:\n${lines.join("\n")}`);
    },
  );
}
