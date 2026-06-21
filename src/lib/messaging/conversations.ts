import "server-only";

import type {
  ConversationAssigneeType,
  ConversationStatus,
  MessageConsentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { decryptSecret } from "@/lib/crypto/secrets";
import { onlyDigits } from "@/lib/masks";
import { prisma } from "@/lib/prisma";

import { MessagingProviderError } from "./errors";
import { getMessagingProvider } from "./index";
import type { MessagingProvider, SendMessageInput } from "./types";

const PROVIDER = "pilot_status_whatsapp" as const;

// ── List ─────────────────────────────────────────────────────────────────────
export interface ConversationListItem {
  id: string;
  contactName: string;
  contactNumberMasked: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  status: ConversationStatus;
  assigneeType: ConversationAssigneeType;
  optInStatus: MessageConsentStatus;
  isCustomer: boolean;
}

export interface ConversationFiltersInput {
  search?: string;
  status?: ConversationStatus;
  assigneeType?: ConversationAssigneeType;
  unread?: boolean;
}

function maskNumber(value: string | null): string | null {
  const digits = onlyDigits(value ?? "");
  if (digits.length < 6) return value;
  return `+${digits.slice(0, 4)}${"*".repeat(Math.max(0, digits.length - 8))}${digits.slice(-4)}`;
}

/** Resolves contact display names for a set of customer/lead ids (tenant-scoped). */
async function loadContactNames(
  tenantId: string,
  customerIds: string[],
  leadIds: string[],
): Promise<{ customers: Map<string, string>; leads: Map<string, string | null> }> {
  const [customers, leads] = await Promise.all([
    customerIds.length
      ? prisma.customer.findMany({ where: { tenantId, id: { in: customerIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    leadIds.length
      ? prisma.customerLead.findMany({ where: { tenantId, id: { in: leadIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  return {
    customers: new Map(customers.map((c) => [c.id, c.name])),
    leads: new Map(leads.map((l) => [l.id, l.name])),
  };
}

export async function listConversations(
  tenantId: string,
  filters: ConversationFiltersInput = {},
): Promise<ConversationListItem[]> {
  const where: Prisma.ConversationWhereInput = { tenantId };
  if (filters.status) where.status = filters.status;
  if (filters.assigneeType) where.assigneeType = filters.assigneeType;
  if (filters.unread) where.unreadCount = { gt: 0 };
  if (filters.search) {
    const digits = onlyDigits(filters.search);
    const or: Prisma.ConversationWhereInput[] = [
      { targetName: { contains: filters.search, mode: "insensitive" } },
    ];
    if (digits) or.push({ contactNumberNormalized: { contains: digits } });
    where.OR = or;
  }

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      // tenantId on the nested filter keeps message isolation explicit.
      messages: { where: { tenantId }, orderBy: { createdAt: "desc" }, take: 1, select: { content: true } },
    },
  });

  const customerIds = rows.flatMap((r) => (r.customerId ? [r.customerId] : []));
  const leadIds = rows.flatMap((r) => (r.leadId ? [r.leadId] : []));
  const names = await loadContactNames(tenantId, customerIds, leadIds);

  const items = rows.map((r) => {
    const name =
      (r.customerId && names.customers.get(r.customerId)) ||
      (r.leadId && names.leads.get(r.leadId)) ||
      r.targetName ||
      maskNumber(r.contactNumber) ||
      "Contato";
    return {
      id: r.id,
      contactName: name,
      contactNumberMasked: maskNumber(r.contactNumber),
      lastMessagePreview: r.messages[0]?.content ?? null,
      lastMessageAt: r.lastMessageAt,
      unreadCount: r.unreadCount,
      status: r.status,
      assigneeType: r.assigneeType,
      optInStatus: r.optInStatus,
      isCustomer: Boolean(r.customerId),
    } satisfies ConversationListItem;
  });

  // Apply a name search client-side too (covers customer/lead names not on the row).
  if (filters.search && !onlyDigits(filters.search)) {
    const q = filters.search.toLowerCase();
    return items.filter((i) => i.contactName.toLowerCase().includes(q));
  }
  return items;
}

// ── Detail ───────────────────────────────────────────────────────────────────
export interface ConversationMessageView {
  id: string;
  direction: "inbound" | "outbound";
  content: string | null;
  internalStatus: string;
  messageType: string;
  errorMessage: string | null;
  sentByAgent: boolean;
  createdAt: Date;
  quotedMessageId: string | null;
}

export interface ConversationDetail {
  id: string;
  contactName: string;
  contactNumberMasked: string | null;
  status: ConversationStatus;
  assigneeType: ConversationAssigneeType;
  optInStatus: MessageConsentStatus;
  contact:
    | { kind: "customer"; id: string; name: string }
    | { kind: "lead"; id: string; name: string | null }
    | { kind: "none" };
  messages: ConversationMessageView[];
  templates: { id: string; name: string; category: string }[];
  hasConnectedNumber: boolean;
}

export async function getConversationDetail(
  tenantId: string,
  conversationId: string,
): Promise<ConversationDetail | null> {
  const c = await prisma.conversation.findFirst({ where: { id: conversationId, tenantId } });
  if (!c) return null;

  const [messages, templates, providerAccount] = await Promise.all([
    prisma.conversationMessage.findMany({
      where: { tenantId, conversationId },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    prisma.messageTemplateMapping.findMany({
      where: { tenantId, status: { in: ["approved", "unknown"] } },
      select: { providerTemplateId: true, name: true, category: true },
      orderBy: { name: "asc" },
    }),
    prisma.messagingProviderAccount.findFirst({
      where: { tenantId, provider: PROVIDER, status: "active", NOT: { encryptedApiKey: null } },
      select: { id: true },
    }),
  ]);

  let contact: ConversationDetail["contact"] = { kind: "none" };
  if (c.customerId) {
    const cust = await prisma.customer.findFirst({ where: { id: c.customerId, tenantId }, select: { id: true, name: true } });
    if (cust) contact = { kind: "customer", id: cust.id, name: cust.name };
  } else if (c.leadId) {
    const lead = await prisma.customerLead.findFirst({ where: { id: c.leadId, tenantId }, select: { id: true, name: true } });
    if (lead) contact = { kind: "lead", id: lead.id, name: lead.name };
  }

  const contactName =
    (contact.kind === "customer" && contact.name) ||
    (contact.kind === "lead" && contact.name) ||
    c.targetName ||
    maskNumber(c.contactNumber) ||
    "Contato";

  return {
    id: c.id,
    contactName,
    contactNumberMasked: maskNumber(c.contactNumber),
    status: c.status,
    assigneeType: c.assigneeType,
    optInStatus: c.optInStatus,
    contact,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      content: m.content,
      internalStatus: m.internalStatus,
      messageType: m.messageType,
      errorMessage: m.errorMessage,
      sentByAgent: m.sentByAgent,
      createdAt: m.createdAt,
      quotedMessageId: m.quotedMessageId,
    })),
    templates: templates.map((t) => ({ id: t.providerTemplateId, name: t.name, category: t.category })),
    hasConnectedNumber: Boolean(providerAccount),
  };
}

// ── Send ─────────────────────────────────────────────────────────────────────
async function tenantSendProvider(tenantId: string): Promise<MessagingProvider> {
  const account = await prisma.messagingProviderAccount.findFirst({
    where: { tenantId, provider: PROVIDER, status: "active", NOT: { encryptedApiKey: null } },
  });
  if (!account?.encryptedApiKey) {
    throw new MessagingProviderError("Conecte um número de WhatsApp antes de enviar.", 409, "NO_CONNECTED_NUMBER");
  }
  return getMessagingProvider(PROVIDER, decryptSecret(account.encryptedApiKey));
}

export interface SendInput {
  conversationId: string;
  mode: "template" | "text";
  templateId?: string;
  content?: string;
  variables?: Record<string, string>;
  deliverAt?: string;
  deliverUntil?: string;
  aiRewrite?: boolean;
}

/**
 * Sends an outbound message on a conversation: persists it queued, calls the
 * provider with the tenant's child key, then records provider ids. Status
 * transitions (sent/delivered/read/failed) arrive later via webhooks.
 */
export async function sendConversationMessage(
  tenantId: string,
  userId: string,
  input: SendInput,
): Promise<{ ok: true } | { error: string }> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, tenantId },
  });
  if (!conversation) return { error: "Conversa não encontrada." };
  if (conversation.optInStatus === "opted_out") {
    return { error: "Este contato optou por não receber mensagens (opt-out)." };
  }

  const templateId =
    input.mode === "template" ? input.templateId : process.env.PILOT_STATUS_TEMPLATE_ID;
  if (!templateId) {
    return {
      error:
        input.mode === "text"
          ? "Template padrão de texto não configurado (PILOT_STATUS_TEMPLATE_ID)."
          : "Selecione um template.",
    };
  }

  // Build the provider target from the conversation (never from the client).
  const target: Pick<SendMessageInput, "destinationNumber" | "groupId" | "newsletterId"> =
    conversation.targetType === "group"
      ? { groupId: conversation.groupId ?? undefined }
      : conversation.targetType === "newsletter"
        ? { newsletterId: conversation.newsletterId ?? undefined }
        : { destinationNumber: conversation.contactNumber ?? undefined };

  if (!target.destinationNumber && !target.groupId && !target.newsletterId) {
    return { error: "Conversa sem destino válido." };
  }

  // Pilot Status only sends templates. Free text rides the default template,
  // which by convention exposes a {{content}} variable.
  const variables =
    input.mode === "text"
      ? (input.variables ?? (input.content ? { content: input.content } : {}))
      : input.variables;

  const mapping = input.mode === "template" && input.templateId
    ? await prisma.messageTemplateMapping.findFirst({
        where: { tenantId, providerTemplateId: input.templateId },
        select: { id: true },
      })
    : null;

  // 1. Persist the outbound message as queued.
  const message = await prisma.conversationMessage.create({
    data: {
      tenantId,
      conversationId: conversation.id,
      direction: "outbound",
      content: input.content ?? null,
      messageType: input.mode === "template" ? "template" : "text",
      internalStatus: "queued",
      templateMappingId: mapping?.id ?? null,
      variables: (variables ?? {}) as Prisma.InputJsonValue,
      toNumber: target.destinationNumber ?? null,
      sentByUserId: userId,
      sentByAgent: false,
    },
  });

  // 2. Call the provider.
  try {
    const provider = await tenantSendProvider(tenantId);
    const result = await provider.sendMessage({
      templateId,
      ...target,
      variables,
      deliverAt: input.deliverAt,
      deliverUntil: input.deliverUntil,
      ...(input.aiRewrite ? { marketingOptions: { aiRewriteEnabled: true } } : {}),
    });

    await prisma.$transaction([
      prisma.conversationMessage.update({
        where: { id: message.id },
        data: {
          providerInternalMessageId: result.id,
          providerCorrelationId: result.correlationId ?? null,
          providerStatus: result.status,
        },
      }),
      prisma.messageDelivery.create({
        data: {
          tenantId,
          conversationMessageId: message.id,
          providerStatus: result.status,
          internalStatus: "queued",
        },
      }),
      prisma.conversation.updateMany({
        where: { id: conversation.id, tenantId },
        data: { lastOutboundAt: new Date(), lastMessageAt: new Date(), status: "open" },
      }),
    ]);
    return { ok: true };
  } catch (err) {
    await prisma.conversationMessage.update({
      where: { id: message.id },
      data: {
        internalStatus: "failed",
        failedAt: new Date(),
        errorMessage: err instanceof MessagingProviderError ? providerMessage(err) : "Falha no envio.",
      },
    });
    if (err instanceof MessagingProviderError) {
      console.error("[conversations] send provider error:", err.status, err.code, err.details);
      return { error: providerMessage(err) };
    }
    console.error("[conversations] send error:", err);
    return { error: "Não foi possível enviar a mensagem." };
  }
}

function providerMessage(err: MessagingProviderError): string {
  switch (err.code) {
    case "NO_CONNECTED_NUMBER":
      return "Conecte um número de WhatsApp antes de enviar.";
    case "MISSING_TEMPLATE_VARIABLES":
    case "INVALID_TEMPLATE_VARIABLE_VALUE":
      return "Preencha corretamente as variáveis do template.";
    case "TEMPLATE_CATEGORY_MARKETING_REQUIRES_OWN_NUMBER":
      return "Marketing exige número próprio conectado (não o número padrão).";
    case "NEWSLETTER_NOT_ALLOWED_IN_TEST":
      return "Envio para canal (newsletter) não é permitido no ambiente de testes.";
    default:
      if (err.status === 403) return "Envio não autorizado (verifique opt-in/aprovação).";
      return "O provedor recusou o envio. Tente novamente.";
  }
}

// ── Handoff / status / consent ─────────────────────────────────────────────────
export async function setConversationAssignee(
  tenantId: string,
  conversationId: string,
  assigneeType: ConversationAssigneeType,
  userId: string,
  reason?: string,
): Promise<void> {
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, tenantId }, select: { id: true } });
  if (!conversation) throw new Error("Conversa não encontrada.");

  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { assigneeType, assignedUserId: assigneeType === "human" ? userId : null },
    }),
    prisma.conversationAssignment.create({
      data: {
        tenantId,
        conversationId,
        assigneeType,
        assignedUserId: assigneeType === "human" ? userId : null,
        reason: reason ?? null,
      },
    }),
  ]);
}

export async function setConversationStatus(
  tenantId: string,
  conversationId: string,
  status: ConversationStatus,
): Promise<void> {
  await prisma.conversation.updateMany({ where: { id: conversationId, tenantId }, data: { status } });
}

export async function setConversationConsent(
  tenantId: string,
  conversationId: string,
  optInStatus: "opted_in" | "opted_out",
): Promise<void> {
  const c = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true, contactNumber: true, customerId: true, leadId: true },
  });
  if (!c) throw new Error("Conversa não encontrada.");
  const phoneNormalized = onlyDigits(c.contactNumber ?? "");
  const now = new Date();

  await prisma.$transaction([
    prisma.conversation.update({ where: { id: c.id }, data: { optInStatus } }),
    ...(phoneNormalized
      ? [
          prisma.messageConsent.upsert({
            where: { tenantId_channel_phoneNormalized: { tenantId, channel: "whatsapp", phoneNormalized } },
            update: {
              optInStatus,
              optInSource: "manual",
              optInAt: optInStatus === "opted_in" ? now : undefined,
              optOutAt: optInStatus === "opted_out" ? now : undefined,
              customerId: c.customerId ?? undefined,
              leadId: c.leadId ?? undefined,
            },
            create: {
              tenantId,
              channel: "whatsapp",
              phoneNormalized,
              optInStatus,
              optInSource: "manual",
              optInAt: optInStatus === "opted_in" ? now : null,
              optOutAt: optInStatus === "opted_out" ? now : null,
              customerId: c.customerId ?? null,
              leadId: c.leadId ?? null,
            },
          }),
        ]
      : []),
  ]);
}

export async function markConversationRead(tenantId: string, conversationId: string): Promise<void> {
  await prisma.conversation.updateMany({ where: { id: conversationId, tenantId }, data: { unreadCount: 0 } });
}
