import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

import TenantFeatureManager from "./tenant-feature-manager";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  trial: "Trial",
  suspended: "Suspenso",
  blocked: "Bloqueado",
};

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  await requirePlatformAdmin();
  const { tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { niche: true, tenantFeatures: true },
  });
  if (!tenant) notFound();

  // All active features + any inactive feature that already has a grant for
  // this tenant (shown read-only so existing grants stay visible).
  const grantedFeatureIds = tenant.tenantFeatures.map((tf) => tf.featureId);
  const features = await prisma.feature.findMany({
    where: { OR: [{ status: "active" }, { id: { in: grantedFeatureIds } }] },
    orderBy: [{ group: "asc" }, { name: "asc" }],
  });

  const grantByFeatureId = new Map(tenant.tenantFeatures.map((tf) => [tf.featureId, tf]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/tenants" className="text-sm text-zinc-500 underline">
          ← Tenants
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{tenant.name}</h2>
          <Badge variant={tenant.status === "blocked" ? "destructive" : "default"}>
            {STATUS_LABELS[tenant.status] ?? tenant.status}
          </Badge>
        </div>
        <p className="text-sm text-zinc-500">
          <span className="font-mono">{tenant.slug}</span> · {tenant.niche.name}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-medium">Features do tenant</h3>
        <TenantFeatureManager
          tenantId={tenant.id}
          features={features.map((f) => {
            const grant = grantByFeatureId.get(f.id);
            return {
              id: f.id,
              key: f.key,
              name: f.name,
              group: f.group,
              status: f.status,
              enabled: grant?.enabled ?? false,
              source: grant?.source ?? null,
            };
          })}
        />
      </section>
    </div>
  );
}
