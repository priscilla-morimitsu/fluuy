"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";
import {
  templateLayoutSchema,
  templateSchema,
  validateLayout,
  type TemplateField,
} from "@/lib/validations/template";

export type ActionResult = AdminActionResult;

type LayoutResult =
  | { ok: true; config: Prisma.InputJsonValue | typeof Prisma.JsonNull }
  | { ok: false; error: string };

/**
 * Parses the optional step/block layout from the form and validates it against
 * the (already-validated) flat field list. Returns the value to store in
 * `templates.config` — `Prisma.JsonNull` when there is no layout.
 */
function readLayout(formData: FormData, fields: TemplateField[]): LayoutResult {
  const raw = formData.get("layout");
  if (raw == null || String(raw).trim() === "") return { ok: true, config: Prisma.JsonNull };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(String(raw));
  } catch {
    return { ok: false, error: "JSON inválido em layout." };
  }

  const layout = templateLayoutSchema.safeParse(parsedJson);
  if (!layout.success) return { ok: false, error: layout.error.issues[0]?.message ?? "Layout inválido." };
  if (layout.data.steps.length === 0) return { ok: true, config: Prisma.JsonNull };

  const check = validateLayout(fields, layout.data);
  if (!check.ok) return { ok: false, error: check.error };

  return { ok: true, config: { layout: layout.data } as Prisma.InputJsonValue };
}

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

  const layout = readLayout(formData, parsed.data.fields);
  if (!layout.ok) return { error: layout.error };

  await prisma.template.create({
    data: {
      nicheId: parsed.data.nicheId,
      entityType: parsed.data.entityType,
      name: parsed.data.name,
      description: parsed.data.description || null,
      fields: parsed.data.fields,
      config: layout.config,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  revalidatePath("/admin/templates");
  return { ok: true };
}

export async function updateTemplateAction(
  templateId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const existing = await prisma.template.findUnique({ where: { id: templateId } });
  if (!existing) {
    return { error: "Template não encontrado." };
  }

  let fields: unknown;
  try {
    fields = JSON.parse(String(formData.get("fields") || "[]"));
  } catch {
    return { error: "JSON inválido em fields." };
  }

  // nicheId/entityType are immutable after creation (changing them would
  // invalidate custom_data already written against this template), so they
  // come from the existing record, never from the client.
  const parsed = templateSchema.safeParse({
    nicheId: existing.nicheId,
    entityType: existing.entityType,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    fields,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const layout = readLayout(formData, parsed.data.fields);
  if (!layout.ok) return { error: layout.error };

  // Bump version only when the field definitions actually changed.
  const fieldsChanged =
    JSON.stringify(parsed.data.fields) !== JSON.stringify(existing.fields);

  await prisma.template.update({
    where: { id: templateId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      fields: parsed.data.fields as Prisma.InputJsonValue,
      config: layout.config,
      version: fieldsChanged ? existing.version + 1 : existing.version,
      updatedBy: admin.id,
    },
  });

  revalidatePath("/admin/templates");
  return { ok: true };
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
