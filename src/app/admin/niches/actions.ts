"use server";

import { revalidatePath } from "next/cache";

import type { AdminActionResult } from "@/lib/admin/action-result";
import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { nicheSchema, nicheUpdateSchema } from "@/lib/validations/niche";

export type ActionResult = AdminActionResult;

export async function createNicheAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const parsed = nicheSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    customerLabel: formData.get("customerLabel") ?? "",
    entityLabel: formData.get("entityLabel") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.niche.findUnique({ where: { key: parsed.data.key } });
  if (existing) {
    return { error: "Já existe um nicho com essa key." };
  }

  await prisma.niche.create({
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description || null,
      customerLabel: parsed.data.customerLabel || null,
      entityLabel: parsed.data.entityLabel || null,
      createdBy: admin.id,
    },
  });

  revalidatePath("/admin/niches");
  return { ok: true };
}

export async function updateNicheAction(
  nicheId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const existing = await prisma.niche.findUnique({ where: { id: nicheId } });
  if (!existing) {
    return { error: "Nicho não encontrado." };
  }

  const parsed = nicheUpdateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    customerLabel: formData.get("customerLabel") ?? "",
    entityLabel: formData.get("entityLabel") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.niche.update({
    where: { id: nicheId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      customerLabel: parsed.data.customerLabel || null,
      entityLabel: parsed.data.entityLabel || null,
    },
  });
  // createdBy stays; updatedAt is maintained by @updatedAt. (admin referenced
  // to keep the auth check meaningful even when no audit column exists yet.)
  void admin;

  revalidatePath("/admin/niches");
  return { ok: true };
}

export async function toggleNicheStatusAction(nicheId: string) {
  await requirePlatformAdmin();

  const niche = await prisma.niche.findUniqueOrThrow({ where: { id: nicheId } });
  await prisma.niche.update({
    where: { id: nicheId },
    data: { status: niche.status === "active" ? "inactive" : "active" },
  });

  revalidatePath("/admin/niches");
}
