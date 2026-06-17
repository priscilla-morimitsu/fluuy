"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";
import { featureSchema } from "@/lib/validations/feature";

export type ActionResult = { error: string } | undefined;

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

  await prisma.tenantFeature.upsert({
    where: { tenantId_featureId: { tenantId, featureId } },
    update: { enabled, source: "manual" },
    create: { tenantId, featureId, enabled, source: "manual" },
  });

  revalidatePath("/admin/tenants");
}
