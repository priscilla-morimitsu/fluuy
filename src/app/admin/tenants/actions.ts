"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";
import { tenantSchema } from "@/lib/validations/tenant";

export type ActionResult = { error: string } | undefined;

export async function createTenantAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = tenantSchema.safeParse({
    nicheId: formData.get("nicheId"),
    name: formData.get("name"),
    legalName: formData.get("legalName") ?? "",
    document: formData.get("document") ?? "",
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    publicPhone: formData.get("publicPhone") ?? "",
    publicEmail: formData.get("publicEmail") ?? "",
    notificationPhone: formData.get("notificationPhone") ?? "",
    hasProducts: formData.get("hasProducts") === "on",
    hasServices: formData.get("hasServices") === "on",
    hasPlans: formData.get("hasPlans") === "on",
    hasDelivery: formData.get("hasDelivery") === "on",
    hasPickup: formData.get("hasPickup") === "on",
    acceptsOnlinePayment: formData.get("acceptsOnlinePayment") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.tenant.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return { error: "Já existe um tenant com esse slug." };
  }

  await prisma.tenant.create({
    data: {
      nicheId: parsed.data.nicheId,
      name: parsed.data.name,
      legalName: parsed.data.legalName || null,
      document: parsed.data.document || null,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      publicPhone: parsed.data.publicPhone || null,
      publicEmail: parsed.data.publicEmail || null,
      notificationPhone: parsed.data.notificationPhone || null,
      hasProducts: parsed.data.hasProducts,
      hasServices: parsed.data.hasServices,
      hasPlans: parsed.data.hasPlans,
      hasDelivery: parsed.data.hasDelivery,
      hasPickup: parsed.data.hasPickup,
      acceptsOnlinePayment: parsed.data.acceptsOnlinePayment,
    },
  });

  revalidatePath("/admin/tenants");
}

export async function setTenantStatusAction(tenantId: string, status: "active" | "blocked") {
  await requirePlatformAdmin();
  await prisma.tenant.update({ where: { id: tenantId }, data: { status } });
  revalidatePath("/admin/tenants");
}
