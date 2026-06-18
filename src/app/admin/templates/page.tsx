import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

import { listTemplates } from "./data";
import TemplatesClient from "./templates-client";

export default async function TemplatesPage({
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

  const [{ rows, filtered, total }, niches] = await Promise.all([
    listTemplates({
      q: str(sp.q),
      status: str(sp.status),
      nicheId: str(sp.nicheId),
      entityType: str(sp.entityType),
      sortBy: str(sp.sortBy),
      sortDir: str(sp.sortDir),
      page: num(sp.page),
      pageSize: num(sp.pageSize),
    }),
    prisma.niche.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return <TemplatesClient rows={rows} filtered={filtered} total={total} niches={niches} />;
}
