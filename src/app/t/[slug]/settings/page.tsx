import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { templateFieldSchema } from "@/lib/validations/template";

import TenantProfileForm from "./tenant-profile-form";

export default async function TenantSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) notFound();

  const template = await prisma.template.findFirst({
    where: { nicheId: tenant.nicheId, entityType: "tenant", status: "active" },
    orderBy: { version: "desc" },
  });

  const fields = templateFieldSchema.array().safeParse(template?.fields ?? []);
  const templateFields = fields.success ? fields.data : [];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Perfil da empresa</h2>
      <TenantProfileForm
        tenantId={tenant.id}
        tenant={{
          name: tenant.name,
          legalName: tenant.legalName ?? "",
          description: tenant.description ?? "",
          publicPhone: tenant.publicPhone ?? "",
          publicEmail: tenant.publicEmail ?? "",
          notificationPhone: tenant.notificationPhone ?? "",
        }}
        customData={(tenant.customData as Record<string, unknown>) ?? {}}
        templateFields={templateFields}
      />
    </div>
  );
}
