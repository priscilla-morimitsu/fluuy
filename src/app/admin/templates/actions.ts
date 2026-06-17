"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";
import { templateFieldSchema, templateSchema } from "@/lib/validations/template";

export type ActionResult = { error: string } | undefined;

export async function createTemplateAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  let fields: unknown;
  try {
    fields = JSON.parse(String(formData.get("fields") || "[]"));
  } catch {
    return { error: "JSON inválido em fields." };
  }

  const parsed = templateSchema.safeParse({
    nicheId: formData.get("nicheId"),
    entityType: formData.get("entityType"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    fields,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.template.create({
    data: {
      nicheId: parsed.data.nicheId,
      entityType: parsed.data.entityType,
      name: parsed.data.name,
      description: parsed.data.description || null,
      fields: parsed.data.fields,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  revalidatePath("/admin/templates");
}

export async function toggleTemplateStatusAction(templateId: string) {
  const admin = await requirePlatformAdmin();

  const template = await prisma.template.findUniqueOrThrow({ where: { id: templateId } });
  await prisma.template.update({
    where: { id: templateId },
    data: {
      status: template.status === "active" ? "inactive" : "active",
      updatedBy: admin.id,
    },
  });

  revalidatePath("/admin/templates");
}

// Re-exported so the field-builder UI can validate a single field client-side
// before JSON-encoding the full list into the hidden "fields" input.
export { templateFieldSchema };
