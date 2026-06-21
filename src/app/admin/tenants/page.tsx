import { Ban, Building2, CheckCircle2, Clock } from "lucide-react";

import { MetricCard } from "@/components/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

import { listTenants } from "./data";
import TenantsClient from "./tenants-client";

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const num = (v: string | string[] | undefined) => {
    const n = Number(str(v));
    return Number.isFinite(n) ? n : undefined;
  };

  const [{ rows, filtered, total }, niches, statusCounts] = await Promise.all([
    listTenants({
      q: str(sp.q),
      status: str(sp.status),
      nicheId: str(sp.nicheId),
      sortBy: str(sp.sortBy),
      sortDir: str(sp.sortDir),
      page: num(sp.page),
      pageSize: num(sp.pageSize),
    }),
    prisma.niche.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.tenant.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countBy = (status: string) =>
    statusCounts.find((s) => s.status === status)?._count._all ?? 0;
  const totalTenants = statusCounts.reduce((sum, s) => sum + s._count._all, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total de tenants" value={totalTenants} icon={<Building2 />} />
        <MetricCard label="Ativos" value={countBy("active")} icon={<CheckCircle2 />} hint="Operando normalmente" />
        <MetricCard label="Em trial" value={countBy("trial")} icon={<Clock />} hint="Período de avaliação" />
        <MetricCard label="Bloqueados" value={countBy("blocked")} icon={<Ban />} hint="Acesso suspenso" />
      </div>
      <TenantsClient rows={rows} filtered={filtered} total={total} niches={niches} />
    </div>
  );
}
