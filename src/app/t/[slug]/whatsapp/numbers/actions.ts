"use server";

import { revalidatePath } from "next/cache";

import type { TenantUserRole } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { MessagingProviderError } from "@/lib/messaging";
import {
  connectWhatsappNumber,
  createRemotePairingForTenant,
  disconnectWhatsappNumber,
  reconnectWhatsappNumber,
  refreshWhatsappStatus,
  setPrimaryWhatsappAccount,
} from "@/lib/messaging/whatsapp-accounts";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import {
  createWhatsappNumberSchema,
  remotePairingSchema,
  whatsappAccountIdSchema,
} from "@/lib/validations/whatsapp";

const WRITE_ROLES: TenantUserRole[] = ["tenant_owner", "tenant_manager"];
const FEATURE = "whatsapp_integration";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  if (err instanceof MessagingProviderError) {
    // Surface a safe, provider-agnostic message; details stay in server logs.
    console.error("[whatsapp] provider error:", err.status, err.code, err.details);
    if (err.status === 409) return { error: "Este número já possui uma conexão. Tente reconectar." };
    if (err.status === 403) return { error: "Operação não autorizada pelo provedor (verifique ambiente/aprovação)." };
    return { error: "O provedor de WhatsApp recusou a operação. Tente novamente." };
  }
  console.error("[whatsapp] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

function revalidate(slug: string) {
  revalidatePath(`/t/${slug}/whatsapp/numbers`);
}

export async function connectNumberAction(
  slug: string,
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    const parsed = createWhatsappNumberSchema.safeParse({
      name: formData.get("name"),
      number: formData.get("number"),
      linkMode: formData.get("linkMode") ?? "dual",
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

    await connectWhatsappNumber(tenant.id, parsed.data);
    revalidate(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function remotePairingAction(
  slug: string,
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    const parsed = remotePairingSchema.safeParse({
      name: formData.get("name"),
      number: formData.get("number"),
      linkMode: formData.get("linkMode") ?? "dual",
      sendViaWhatsApp: formData.get("sendViaWhatsApp") === "on",
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

    await createRemotePairingForTenant(tenant.id, parsed.data);
    revalidate(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

async function accountAction(
  slug: string,
  formData: FormData,
  run: (tenantId: string, accountId: string) => Promise<unknown>,
): Promise<AdminActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    const parsed = whatsappAccountIdSchema.safeParse({ accountId: formData.get("accountId") });
    if (!parsed.success) return { error: "Conta inválida." };
    await run(tenant.id, parsed.data.accountId);
    revalidate(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function refreshStatusAction(slug: string, _prev: AdminActionResult, formData: FormData) {
  return accountAction(slug, formData, refreshWhatsappStatus);
}
export async function reconnectAction(slug: string, _prev: AdminActionResult, formData: FormData) {
  return accountAction(slug, formData, reconnectWhatsappNumber);
}
export async function disconnectAction(slug: string, _prev: AdminActionResult, formData: FormData) {
  return accountAction(slug, formData, disconnectWhatsappNumber);
}
export async function setPrimaryAction(slug: string, _prev: AdminActionResult, formData: FormData) {
  return accountAction(slug, formData, setPrimaryWhatsappAccount);
}
