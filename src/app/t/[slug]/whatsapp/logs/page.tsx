import { notFound } from "next/navigation";

import {
  getRetentionDays,
  listWebhookEventTypes,
  listWebhookLogs,
  type WebhookLogFilters,
} from "@/lib/messaging/webhook-logs";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { webhookLogFiltersSchema } from "@/lib/validations/whatsapp";

import LogsClient from "./logs-client";

const FEATURE = "whatsapp_integration";

export default async function WhatsappLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { roles: ["tenant_owner", "tenant_manager"], feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const parsed = webhookLogFiltersSchema.safeParse({
    eventType: str(sp.event) || undefined,
    processingStatus: str(sp.status) || undefined,
    search: str(sp.search) || undefined,
  });
  const filters: WebhookLogFilters = parsed.success ? parsed.data : {};

  const [logs, eventTypes, retentionDays] = await Promise.all([
    listWebhookLogs(ctx.tenant.id, filters),
    listWebhookEventTypes(ctx.tenant.id),
    getRetentionDays(ctx.tenant.id),
  ]);

  return (
    <LogsClient slug={slug} logs={logs} eventTypes={eventTypes} retentionDays={retentionDays} filters={filters} />
  );
}
