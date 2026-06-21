"use server";

import { revalidatePath } from "next/cache";

import type { TenantUserRole } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { createTemplate, deleteTemplate, updateTemplate } from "@/lib/messaging/templates";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { templateMappingSchema } from "@/lib/validations/whatsapp";

const WRITE_ROLES: TenantUserRole[] = ["tenant_owner", "tenant_manager"];
const FEATURE = "whatsapp_integration";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  if (err instanceof Error && err.message.includes("Conecte um número")) {
    return { error: err.message };
  }
  console.error("[whatsapp templates] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

function parse(formData: FormData) {
  return templateMappingSchema.safeParse({
    providerTemplateId: formData.get("providerTemplateId"),
    name: formData.get("name"),
    category: formData.get("category") || "unknown",
    language: formData.get("language") || undefined,
    variables: formData.getAll("variables").map(String),
    status: formData.get("status") || "unknown",
    isDefault: formData.get("isDefault") === "on",
  });
}

export async function createTemplateAction(
  slug: string,
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    const parsed = parse(formData);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    await createTemplate(tenant.id, parsed.data);
    revalidatePath(`/t/${slug}/whatsapp/templates`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateTemplateAction(
  slug: string,
  id: string,
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    const parsed = parse(formData);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    await updateTemplate(tenant.id, id, parsed.data);
    revalidatePath(`/t/${slug}/whatsapp/templates`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteTemplateAction(slug: string, id: string): Promise<AdminActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
    await deleteTemplate(tenant.id, id);
    revalidatePath(`/t/${slug}/whatsapp/templates`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
