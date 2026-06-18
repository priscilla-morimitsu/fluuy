"use server";

import { revalidatePath } from "next/cache";

import type { AdminActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";
import { billingPlanSchema, billingPlanUpdateSchema } from "@/lib/validations/feature";

export type ActionResult = AdminActionResult;

export async function createBillingPlanAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = billingPlanSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    billingPeriod: formData.get("billingPeriod"),
    featureIds: formData.getAll("featureIds"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.billingPlan.findUnique({ where: { key: parsed.data.key } });
  if (existing) {
    return { error: "Já existe um plano com essa key." };
  }

  await prisma.billingPlan.create({
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      billingPeriod: parsed.data.billingPeriod,
      planFeatures: {
        create: parsed.data.featureIds.map((featureId) => ({ featureId })),
      },
    },
  });

  revalidatePath("/admin/billing-plans");
  return { ok: true };
}

export async function updateBillingPlanAction(
  billingPlanId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();

  const existing = await prisma.billingPlan.findUnique({ where: { id: billingPlanId } });
  if (!existing) {
    return { error: "Plano não encontrado." };
  }

  const parsed = billingPlanUpdateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    billingPeriod: formData.get("billingPeriod"),
    featureIds: formData.getAll("featureIds"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Replace the plan's feature set atomically (no plan_features history kept).
  await prisma.$transaction([
    prisma.billingPlan.update({
      where: { id: billingPlanId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        price: parsed.data.price,
        billingPeriod: parsed.data.billingPeriod,
      },
    }),
    prisma.planFeature.deleteMany({ where: { billingPlanId } }),
    prisma.planFeature.createMany({
      data: parsed.data.featureIds.map((featureId) => ({ billingPlanId, featureId })),
    }),
  ]);

  revalidatePath("/admin/billing-plans");
  return { ok: true };
}

export async function toggleBillingPlanStatusAction(billingPlanId: string) {
  await requirePlatformAdmin();
  const plan = await prisma.billingPlan.findUniqueOrThrow({ where: { id: billingPlanId } });
  await prisma.billingPlan.update({
    where: { id: billingPlanId },
    data: { status: plan.status === "active" ? "inactive" : "active" },
  });
  revalidatePath("/admin/billing-plans");
}
