import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePilotStatusWebhook } from "@/lib/messaging/providers/pilot-status";
import {
  deriveEventId,
  maskPayload,
  processWebhookEvent,
} from "@/lib/messaging/webhook-processor";

export const dynamic = "force-dynamic";

const PROVIDER = "pilot_status_whatsapp" as const;

/**
 * Public Pilot Status webhook. No session auth (the provider can't carry one);
 * an optional shared secret may be required via `?token=` when
 * PILOT_STATUS_WEBHOOK_SECRET is set. Flow: log the raw event BEFORE processing,
 * resolve/route via the provider-agnostic processor, and ALWAYS respond 200 so
 * the provider doesn't retry — except on an unexpected internal failure (500).
 */
export async function POST(req: Request) {
  // Optional shared-secret gate (the URL registered in the dashboard carries it).
  const secret = process.env.PILOT_STATUS_WEBHOOK_SECRET;
  if (secret) {
    const token = new URL(req.url).searchParams.get("token");
    if (token !== secret) {
      // Don't reveal validity; just ignore.
      return NextResponse.json({ ok: true });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const event = parsePilotStatusWebhook(body);
  const eventType =
    event?.type ??
    (typeof body === "object" && body !== null && "event" in body
      ? String((body as Record<string, unknown>).event)
      : "unknown");
  const providerEventId = event ? deriveEventId(event) : null;

  // Log before processing. The (provider, providerEventId) unique key gives us
  // idempotency: a replayed event collides here and is acknowledged as handled.
  let logId: string;
  try {
    const log = await prisma.messageWebhookEventLog.create({
      data: {
        provider: PROVIDER,
        eventType,
        providerEventId,
        correlationId: extract(event, "correlationId"),
        messageId: extract(event, "messageId"),
        internalMessageId: extract(event, "internalMessageId"),
        payload: toJson(body),
        maskedPayload: toJson(maskPayload(body)),
        processingStatus: "received",
      },
      select: { id: true },
    });
    logId = log.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Duplicate event — already logged/processed.
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[pilot-status webhook] log error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  if (!event) {
    await markLog(logId, "ignored");
    return NextResponse.json({ ok: true });
  }

  try {
    const result = await processWebhookEvent(event, logId);
    await markLog(logId, result);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[pilot-status webhook] processing error:", err);
    await markLog(logId, "failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

function extract(event: unknown, key: string): string | null {
  if (event && typeof event === "object" && key in event) {
    const v = (event as Record<string, unknown>)[key];
    return typeof v === "string" && v ? v : null;
  }
  return null;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

async function markLog(
  id: string,
  status: "processed" | "ignored" | "failed",
  errorMessage?: string,
): Promise<void> {
  await prisma.messageWebhookEventLog.update({
    where: { id },
    data: { processingStatus: status, processedAt: new Date(), errorMessage: errorMessage ?? null },
  });
}
