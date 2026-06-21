"use server";

import { revalidatePath } from "next/cache";

import type { TenantUserRole } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import {
  markConversationRead,
  sendConversationMessage,
  setConversationAssignee,
  setConversationConsent,
  setConversationStatus,
} from "@/lib/messaging/conversations";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import {
  sendConversationMessageSchema,
  setAssigneeSchema,
  setConsentSchema,
  setConversationStatusSchema,
} from "@/lib/validations/conversation";

const WRITE_ROLES: TenantUserRole[] = ["tenant_owner", "tenant_manager", "tenant_operator"];
const FEATURE = "conversation_history";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  console.error("[conversations] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

/** Collects template variables from `var_<key>` form fields. */
function readVariables(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("var_") && typeof value === "string" && value.trim()) {
      out[key.slice(4)] = value;
    }
  }
  return out;
}

export async function sendMessageAction(
  slug: string,
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const { tenant, userId } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    const variables = readVariables(formData);
    const parsed = sendConversationMessageSchema.safeParse({
      conversationId: formData.get("conversationId"),
      mode: formData.get("mode"),
      templateId: formData.get("templateId") || undefined,
      content: formData.get("content") || undefined,
      variables: Object.keys(variables).length ? variables : undefined,
      deliverAt: formData.get("deliverAt") || undefined,
      deliverUntil: formData.get("deliverUntil") || undefined,
      aiRewrite: formData.get("aiRewrite") === "on",
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

    const result = await sendConversationMessage(tenant.id, userId, parsed.data);
    if ("error" in result) return result;
    revalidatePath(`/t/${slug}/conversations`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setAssigneeAction(
  slug: string,
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const { tenant, userId } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    const parsed = setAssigneeSchema.safeParse({
      conversationId: formData.get("conversationId"),
      assigneeType: formData.get("assigneeType"),
      reason: formData.get("reason") || undefined,
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

    await setConversationAssignee(tenant.id, parsed.data.conversationId, parsed.data.assigneeType, userId, parsed.data.reason);
    revalidatePath(`/t/${slug}/conversations`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setStatusAction(
  slug: string,
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    const parsed = setConversationStatusSchema.safeParse({
      conversationId: formData.get("conversationId"),
      status: formData.get("status"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

    await setConversationStatus(tenant.id, parsed.data.conversationId, parsed.data.status);
    revalidatePath(`/t/${slug}/conversations`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setConsentAction(
  slug: string,
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, {
      roles: ["tenant_owner", "tenant_manager"],
      feature: FEATURE,
    });
    const parsed = setConsentSchema.safeParse({
      conversationId: formData.get("conversationId"),
      optInStatus: formData.get("optInStatus"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

    await setConversationConsent(tenant.id, parsed.data.conversationId, parsed.data.optInStatus);
    revalidatePath(`/t/${slug}/conversations`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function markReadAction(slug: string, conversationId: string): Promise<void> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    await markConversationRead(tenant.id, conversationId);
    revalidatePath(`/t/${slug}/conversations`);
  } catch (err) {
    // Non-fatal: marking read should never block the UI.
    console.error("[conversations] markRead error:", err);
  }
}
