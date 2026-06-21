import { Building2, CheckCircle2, Layers3, UserPlus } from "lucide-react";

import { MetricCard } from "@/components/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

export default async function AdminDashboardPage() {
  await requirePlatformAdmin();

  const [tenants, activeTenants, activeNiches, newLeads] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "active" } }),
    prisma.niche.count({ where: { status: "active" } }),
    prisma.lead.count({ where: { status: "new" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Visão geral da plataforma Fluuy.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total de tenants" value={tenants} icon={<Building2 />} />
        <MetricCard label="Tenants ativos" value={activeTenants} icon={<CheckCircle2 />} hint="Operando normalmente" />
        <MetricCard label="Nichos ativos" value={activeNiches} icon={<Layers3 />} />
        <MetricCard label="Leads novos" value={newLeads} icon={<UserPlus />} hint="Aguardando contato" />
      </div>
    </div>
  );
}
