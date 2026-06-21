import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { findOrCreateLeadFromWhatsapp } from "@/lib/customers/lead-conversion";
import { onlyDigits } from "@/lib/masks";
import { prisma } from "@/lib/prisma";

import { mapPilotStatusStatus } from "./providers/pilot-status";
import { brPhoneCandidates } from "./phone";
import type { NormalizedWebhookEvent } from "./types";

/**
 * Provider-agnostic webhook processing. The route logs the raw event first,
 * then hands the normalized event here. Everything is tenant-scoped and
 * idempotent: status updates are naturally idempotent, inbound messages dedupe
 * on (tenantId, providerMessageId), and the route's event-log unique key blocks
 * full replays. PII is masked at the log layer (see {@link maskPayload}).
 */

export type ProcessResult = "processed" | "ignored";

interface TenantNumberMatch {
  tenantId: string;
  whatsappAccountId: string;
}

/** Resolves which tenant owns one of OUR connected numbers (the destination). */
async function resolveTenantByNumber(number: string | undefined): Promise<TenantNumberMatch | null> {
  if (!number) return null;
  const candidates = brPhoneCandidates(number);
  if (candidates.length === 0) return null;
  const account = await prisma.whatsAppAccount.findFirst({
    where: { numberNormalized: { in: candidates } },
    select: { id: true, tenantId: true },
  });
  return account ? { tenantId: account.tenantId, whatsappAccountId: account.id } : null;
}

/** Finds the outbound ConversationMessage a status event refers to. */
async function findOutboundMessage(internalMessageId: string) {
  if (!internalMessageId) return null;
  return prisma.conversationMessage.findFirst({
    where: { providerInternalMessageId: internalMessageId },
    select: { id: true, tenantId: true, conversationId: true },
  });
}

function timestamp(value: string | undefined): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Applies an outbound status transition + appends a MessageDelivery row. */
async function applyStatus(
  event: Extract<
    NormalizedWebhookEvent,
    { type: "message.sent" | "message.delivered" | "message.read" | "message.failed" }
  >,
  logId: string,
): Promise<ProcessResult> {
  const message = await findOutboundMessage(event.internalMessageId);
  if (!message) return "ignored";

  const internalStatus = mapPilotStatusStatus(statusFor(event.type));
  const data: Prisma.ConversationMessageUpdateInput = {
    internalStatus,
    providerStatus: statusFor(event.type),
    providerMessageId: event.messageId || undefined,
  };
  if (event.type === "message.sent") data.sentAt = timestamp(event.sentAt);
  if (event.type === "message.delivered") data.deliveredAt = timestamp(event.deliveredAt);
  if (event.type === "message.read") data.readAt = timestamp(event.readAt);
  if (event.type === "message.failed") {
    data.failedAt = timestamp(event.failedAt);
    data.errorMessage = event.errorMessage ?? "Falha no envio.";
  }

  await prisma.$transaction([
    prisma.conversationMessage.update({ where: { id: message.id }, data }),
    prisma.messageDelivery.create({
      data: {
        tenantId: message.tenantId,
        conversationMessageId: message.id,
        providerStatus: statusFor(event.type),
        internalStatus,
        rawEventId: logId,
        happenedAt: deliveryTime(event),
      },
    }),
  ]);
  return "processed";
}

function statusFor(type: NormalizedWebhookEvent["type"]): string {
  switch (type) {
    case "message.sent":
      return "SENT";
    case "message.delivered":
      return "DELIVERED";
    case "message.read":
      return "READ";
    case "message.failed":
      return "FAILED";
    default:
      return "QUEUED";
  }
}

function deliveryTime(
  event: Extract<
    NormalizedWebhookEvent,
    { type: "message.sent" | "message.delivered" | "message.read" | "message.failed" }
  >,
): Date {
  switch (event.type) {
    case "message.sent":
      return timestamp(event.sentAt);
    case "message.delivered":
      return timestamp(event.deliveredAt);
    case "message.read":
      return timestamp(event.readAt);
    case "message.failed":
      return timestamp(event.failedAt);
  }
}

/**
 * Inbound message → resolve tenant by our number, find/create the contact's
 * Lead (or link to an existing Customer), upsert the Conversation and persist
 * the inbound ConversationMessage. Never auto-creates a Customer.
 */
async function applyInbound(
  params: {
    destinationNumber: string | undefined;
    from: string;
    content: string;
    messageId: string;
    messageType: "text" | "button";
    quotedMessageId?: string;
    messageRepliedId?: string;
    receivedAt?: string;
  },
): Promise<ProcessResult> {
  const match = await resolveTenantByNumber(params.destinationNumber);
  if (!match) return "ignored";
  const { tenantId, whatsappAccountId } = match;

  const contactDigits = onlyDigits(params.from);
  if (contactDigits.length < 8) return "ignored";

  // Resolve the contact to a Customer or a Lead (lead created if neither).
  let customerId: string | null = null;
  let leadId: string | null = null;
  const resolution = await findOrCreateLeadFromWhatsapp(tenantId, {
    phone: params.from,
    source: "whatsapp",
  });
  if (resolution.ok) {
    if (resolution.kind === "customer") customerId = resolution.customerId;
    else leadId = resolution.lead.id;
  }

  const when = timestamp(params.receivedAt);

  const conversation = await prisma.conversation.upsert({
    where: { tenantId_contactNumberNormalized: { tenantId, contactNumberNormalized: contactDigits } },
    update: {
      whatsappAccountId,
      customerId: customerId ?? undefined,
      leadId: leadId ?? undefined,
      status: "open",
      lastInboundAt: when,
      lastMessageAt: when,
      unreadCount: { increment: 1 },
    },
    create: {
      tenantId,
      whatsappAccountId,
      channel: "whatsapp",
      targetType: "phone",
      contactNumber: params.from,
      contactNumberNormalized: contactDigits,
      customerId,
      leadId,
      status: "open",
      assigneeType: "unassigned",
      lastInboundAt: when,
      lastMessageAt: when,
      unreadCount: 1,
    },
  });

  // Idempotent insert: a replayed inbound with the same messageId is skipped.
  if (params.messageId) {
    const existing = await prisma.conversationMessage.findFirst({
      where: { tenantId, providerMessageId: params.messageId },
      select: { id: true },
    });
    if (existing) return "ignored";
  }

  await prisma.conversationMessage.create({
    data: {
      tenantId,
      conversationId: conversation.id,
      direction: "inbound",
      content: params.content,
      messageType: params.messageType,
      internalStatus: "received",
      providerMessageId: params.messageId || null,
      quotedMessageId: params.quotedMessageId ?? null,
      messageRepliedId: params.messageRepliedId ?? null,
      fromNumber: params.from,
      toNumber: params.destinationNumber ?? null,
      receivedAt: when,
    },
  });

  // Auto opt-out: a contact replying "parar"/"sair"/"stop" revokes consent.
  if (isOptOutMessage(params.content)) {
    await prisma.$transaction([
      prisma.conversation.update({ where: { id: conversation.id }, data: { optInStatus: "opted_out" } }),
      prisma.messageConsent.upsert({
        where: { tenantId_channel_phoneNormalized: { tenantId, channel: "whatsapp", phoneNormalized: contactDigits } },
        update: { optInStatus: "opted_out", optOutAt: when, optInSource: "inbound_keyword" },
        create: {
          tenantId,
          channel: "whatsapp",
          phoneNormalized: contactDigits,
          optInStatus: "opted_out",
          optOutAt: when,
          optInSource: "inbound_keyword",
          customerId: customerId ?? null,
          leadId: leadId ?? null,
        },
      }),
    ]);
  }

  return "processed";
}

const OPT_OUT_KEYWORDS = ["parar", "sair", "cancelar", "stop", "unsubscribe", "descadastrar", "remover"];

/** True when the whole message is a stop/opt-out keyword (not just contains it). */
function isOptOutMessage(content: string): boolean {
  const normalized = content.trim().toLowerCase().replace(/[.!]/g, "");
  return OPT_OUT_KEYWORDS.includes(normalized);
}

/** Updates a WhatsAppAccount when its number finishes pairing. */
async function applyNumberConnected(
  event: Extract<NormalizedWebhookEvent, { type: "number.connected" }>,
): Promise<ProcessResult> {
  const where: Prisma.WhatsAppAccountWhereInput = event.instanceId
    ? { providerInstanceId: event.instanceId }
    : event.number
      ? { numberNormalized: { in: brPhoneCandidates(event.number) } }
      : {};
  if (Object.keys(where).length === 0) return "ignored";

  const account = await prisma.whatsAppAccount.findFirst({ where, select: { id: true } });
  if (!account) return "ignored";

  await prisma.whatsAppAccount.update({
    where: { id: account.id },
    data: {
      status: "open",
      isFullyConnected: true,
      connectedAt: new Date(),
      qrcodeBase64: null,
      pairingCode: null,
      lastStatusAt: new Date(),
    },
  });
  return "processed";
}

/** Routes a normalized event to its processor. */
export async function processWebhookEvent(
  event: NormalizedWebhookEvent,
  logId: string,
): Promise<ProcessResult> {
  switch (event.type) {
    case "message.sent":
    case "message.delivered":
    case "message.read":
    case "message.failed":
      return applyStatus(event, logId);

    case "message.received":
      if (event.fromMe) return "ignored"; // our own outbound echoed back
      return applyInbound({
        destinationNumber: event.destinationNumber,
        from: event.from,
        content: event.content ?? "",
        messageId: event.messageId,
        messageType: "text",
        receivedAt: event.receivedAt,
      });

    case "message.reply":
      return applyInbound({
        destinationNumber: event.destinationNumber,
        from: event.from,
        content: event.replyContent ?? event.content ?? "",
        messageId: event.messageId,
        messageType: event.buttonId ? "button" : "text",
        quotedMessageId: event.quotedMessageId,
        messageRepliedId: event.messageRepliedId,
        receivedAt: event.receivedAt,
      });

    case "number.connected":
      return applyNumberConnected(event);

    case "message.group":
      // Group ingestion lands in a later phase; logged but not threaded yet.
      return "ignored";

    default:
      return "ignored";
  }
}

/** A stable id per (event type, message) so replays hit the log's unique key. */
export function deriveEventId(event: NormalizedWebhookEvent): string | null {
  switch (event.type) {
    case "message.sent":
    case "message.delivered":
    case "message.read":
    case "message.failed":
      return `${event.type}:${event.internalMessageId || event.messageId}`;
    case "message.received":
    case "message.reply":
    case "message.group":
      return event.messageId ? `${event.type}:${event.messageId}` : null;
    case "number.connected":
      return event.instanceId ? `number.connected:${event.instanceId}` : null;
    default:
      return null;
  }
}

const MASK_KEYS = new Set([
  "from",
  "to",
  "destinationNumber",
  "fromNumber",
  "number",
  "phone",
  "destinationHash",
]);

function maskPhone(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length < 6) return "***";
  return `${digits.slice(0, 4)}${"*".repeat(Math.max(0, digits.length - 8))}${digits.slice(-4)}`;
}

/**
 * Deep-masks phone-like fields for the UI-visible payload (Logs screen / webhook
 * modals). Content is preserved; identifiers are masked. Respects the rule that
 * visible logs never expose full PII.
 */
export function maskPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskPayload);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (MASK_KEYS.has(key) && typeof val === "string") out[key] = maskPhone(val);
      else out[key] = maskPayload(val);
    }
    return out;
  }
  return value;
}
