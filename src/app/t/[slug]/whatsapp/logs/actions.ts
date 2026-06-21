"use server";

import { revalidatePath } from "next/cache";

import type { TenantUserRole } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { purgeExpiredWebhookLogs, setRetentionDays } from "@/lib/messaging/webhook-logs";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { retentionDaysSchema } from "@/lib/validations/whatsapp";

const WRITE_ROLES: TenantUserRole[] = ["tenant_owner", "tenant_manager"];
const FEATURE = "whatsapp_integration";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  console.error("[whatsapp logs] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

export async function setRetentionAction(
  slug: string,
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    const parsed = retentionDaysSchema.safeParse({ retentionDays: formData.get("retentionDays") });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Valor inválido." };
    await setRetentionDays(tenant.id, parsed.data.retentionDays);
    revalidatePath(`/t/${slug}/whatsapp/logs`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function purgeLogsAction(slug: string): Promise<AdminActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    await purgeExpiredWebhookLogs(tenant.id);
    revalidatePath(`/t/${slug}/whatsapp/logs`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
