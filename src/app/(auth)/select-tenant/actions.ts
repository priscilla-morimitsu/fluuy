"use server";

import { redirect } from "next/navigation";

import { updateSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auth/audit";
import { userHasActiveTenantMembership } from "@/lib/auth/tenant-resolution";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { selectTenantSchema } from "@/lib/validations/auth";

export type ActionResult = { error: string } | undefined;

export async function selectTenantAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = selectTenantSchema.safeParse({ tenantId: formData.get("tenantId") });
  if (!parsed.success) {
    return { error: "Selecione um tenant válido." };
  }

  // Re-validated server-side — never trust the posted tenantId on its own,
  // even though the <select> options were already scoped to the user.
  const allowed = await userHasActiveTenantMembership(user.id, parsed.data.tenantId);
  if (!allowed) {
    return { error: "Você não tem acesso a este tenant." };
  }

  await updateSession({ user: { selectedTenantId: parsed.data.tenantId } });
  await writeAuditLog("tenant_selected", { userId: user.id, tenantId: parsed.data.tenantId });

  const tenant = await prisma.tenant.findUnique({ where: { id: parsed.data.tenantId } });
  redirect(`/t/${tenant!.slug}/settings`);
}
