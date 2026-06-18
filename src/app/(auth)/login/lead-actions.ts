"use server";

import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validations/auth";

export type LeadActionResult = { error: string } | { success: true };

/**
 * Public, unauthenticated. Creates ONLY a Lead row — never a User or Tenant.
 * Tenant/user provisioning is exclusively done by the platform admin
 * (see .devrails/rules/multi-tenant.md and the auth spec's registration_rule).
 */
export async function createLeadAction(
  _prevState: LeadActionResult | undefined,
  formData: FormData,
): Promise<LeadActionResult> {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    companyName: formData.get("companyName") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    niche: formData.get("niche") ?? "",
    message: formData.get("message") ?? "",
    source: formData.get("source") || "login_page",
  });

  if (!parsed.success) {
    return { error: "Preencha nome e e-mail corretamente." };
  }

  // Light spam guard: cap repeated submissions from the same email.
  const recentCount = await prisma.lead.count({
    where: { email: parsed.data.email, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recentCount >= 3) {
    return { error: "Recebemos seu interesse recentemente. Nossa equipe já vai entrar em contato." };
  }

  await prisma.lead.create({
    data: {
      name: parsed.data.name,
      companyName: parsed.data.companyName || null,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      niche: parsed.data.niche || null,
      message: parsed.data.message || null,
      source: parsed.data.source || null,
    },
  });

  return { success: true };
}
