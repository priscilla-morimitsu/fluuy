import "server-only";

import type { Prisma, WebhookProcessingStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PROVIDER = "pilot_status_whatsapp" as const;

export interface WebhookLogView {
  id: string;
  eventType: string;
  processingStatus: WebhookProcessingStatus;
  correlationId: string | null;
  messageId: string | null;
  errorMessage: string | null;
  receivedAt: Date;
  /** Masked payload only — never the raw PII. */
  maskedPayload: Prisma.JsonValue;
}

export interface WebhookLogFilters {
  eventType?: string;
  processingStatus?: WebhookProcessingStatus;
  search?: string;
}

export async function listWebhookLogs(
  tenantId: string,
  filters: WebhookLogFilters = {},
): Promise<WebhookLogView[]> {
  const where: Prisma.MessageWebhookEventLogWhereInput = { tenantId };
  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.processingStatus) where.processingStatus = filters.processingStatus;
  if (filters.search) {
    where.OR = [
      { messageId: { contains: filters.search } },
      { correlationId: { contains: filters.search } },
      { internalMessageId: { contains: filters.search } },
    ];
  }

  const rows = await prisma.messageWebhookEventLog.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    take: 200,
    select: {
      id: true,
      eventType: true,
      processingStatus: true,
      correlationId: true,
      messageId: true,
      errorMessage: true,
      receivedAt: true,
      maskedPayload: true,
    },
  });
  return rows;
}

/** Distinct event types present for this tenant (for the filter dropdown). */
export async function listWebhookEventTypes(tenantId: string): Promise<string[]> {
  const rows = await prisma.messageWebhookEventLog.findMany({
    where: { tenantId },
    distinct: ["eventType"],
    select: { eventType: true },
    orderBy: { eventType: "asc" },
  });
  return rows.map((r) => r.eventType);
}

export async function getRetentionDays(tenantId: string): Promise<number> {
  const account = await prisma.messagingProviderAccount.findFirst({
    where: { tenantId, provider: PROVIDER },
    select: { retentionDays: true },
    orderBy: { createdAt: "asc" },
  });
  return account?.retentionDays ?? 30;
}

export async function setRetentionDays(tenantId: string, retentionDays: number): Promise<void> {
  await prisma.messagingProviderAccount.updateMany({
    where: { tenantId, provider: PROVIDER },
    data: { retentionDays },
  });
}

/**
 * Purges webhook event logs older than the tenant's retention window. Intended
 * to be called from a scheduled job (cron). `retentionDays = 0` purges nothing
 * here — with PII disabled at the provider, logs already arrive without PII, and
 * a 0-day blanket delete would race incoming events. Returns the deleted count.
 */
export async function purgeExpiredWebhookLogs(tenantId: string): Promise<number> {
  const retentionDays = await getRetentionDays(tenantId);
  if (retentionDays <= 0) return 0;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.messageWebhookEventLog.deleteMany({
    where: { tenantId, receivedAt: { lt: cutoff } },
  });
  return result.count;
}
