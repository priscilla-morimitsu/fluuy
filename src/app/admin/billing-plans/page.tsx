import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

import BillingPlansClient from "./billing-plans-client";
import { listBillingPlans } from "./data";

export default async function BillingPlansPage({
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

  const [{ rows, filtered, total }, features] = await Promise.all([
    listBillingPlans({
      q: str(sp.q),
      status: str(sp.status),
      billingPeriod: str(sp.billingPeriod),
      sortBy: str(sp.sortBy),
      sortDir: str(sp.sortDir),
      page: num(sp.page),
      pageSize: num(sp.pageSize),
    }),
    prisma.feature.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return <BillingPlansClient rows={rows} filtered={filtered} total={total} features={features} />;
}
