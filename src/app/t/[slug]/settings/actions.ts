"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import { readCustomData } from "@/lib/custom-data";
import { prisma } from "@/lib/prisma";
import { requireTenantRole } from "@/lib/rbac";
import { tenantProfileSchema } from "@/lib/validations/tenant";
import { validateCustomData, type TemplateField } from "@/lib/validations/template";

export type ActionResult = { error: string } | undefined;

export async function updateTenantProfileAction(
  tenantId: string,
  templateFields: TemplateField[],
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // tenant_viewer must never reach a write path — only owner/manager may edit.
  await requireTenantRole(tenantId, ["tenant_owner", "tenant_manager"]);

  const parsed = tenantProfileSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName") ?? "",
    description: formData.get("description") ?? "",
    publicPhone: formData.get("publicPhone") ?? "",
    publicEmail: formData.get("publicEmail") ?? "",
    notificationPhone: formData.get("notificationPhone") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const customData = readCustomData(templateFields, formData);

  const customDataErrors = validateCustomData(templateFields, customData);
  if (customDataErrors.length > 0) {
    return { error: customDataErrors[0] };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: parsed.data.name,
      legalName: parsed.data.legalName || null,
      description: parsed.data.description || null,
      publicPhone: parsed.data.publicPhone || null,
      publicEmail: parsed.data.publicEmail || null,
      notificationPhone: parsed.data.notificationPhone || null,
      customData: customData as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/t`);
}
