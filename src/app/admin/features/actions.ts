"use server";

import { revalidatePath } from "next/cache";

import type { AdminActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";
import { featureSchema, featureUpdateSchema } from "@/lib/validations/feature";

export type ActionResult = AdminActionResult;

export async function createFeatureAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = featureSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    group: formData.get("group") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.feature.findUnique({ where: { key: parsed.data.key } });
  if (existing) {
    return { error: "Já existe uma feature com essa key." };
  }

  await prisma.feature.create({
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description || null,
      group: parsed.data.group || null,
    },
  });

  revalidatePath("/admin/features");
  return { ok: true };
}

export async function updateFeatureAction(
  featureId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();

  const existing = await prisma.feature.findUnique({ where: { id: featureId } });
  if (!existing) {
    return { error: "Feature não encontrada." };
  }

  const parsed = featureUpdateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    group: formData.get("group") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.feature.update({
    where: { id: featureId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      group: parsed.data.group || null,
    },
  });

  revalidatePath("/admin/features");
  return { ok: true };
}

export async function toggleFeatureStatusAction(featureId: string) {
  await requirePlatformAdmin();
  const feature = await prisma.feature.findUniqueOrThrow({ where: { id: featureId } });
  await prisma.feature.update({
    where: { id: featureId },
    data: { status: feature.status === "active" ? "inactive" : "active" },
  });
  revalidatePath("/admin/features");
}

/** Manual grant/revoke of a feature for a specific tenant (source: "manual"). */
export async function setTenantFeatureAction(tenantId: string, featureId: string, enabled: boolean) {
  await requirePlatformAdmin();

  const [tenant, feature] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.feature.findUnique({ where: { id: featureId } }),
  ]);
  if (!tenant || !feature) return;

  // Don't allow newly enabling an inactive global feature; disabling an
  // existing grant is always allowed.
  if (enabled && feature.status !== "active") return;

  await prisma.tenantFeature.upsert({
    where: { tenantId_featureId: { tenantId, featureId } },
    update: { enabled, source: "manual" },
    create: { tenantId, featureId, enabled, source: "manual" },
  });

  // "layout" scope covers the nested /admin/tenants/[tenantId] detail route.
  revalidatePath("/admin/tenants", "layout");
}
