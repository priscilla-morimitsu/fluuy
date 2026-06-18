import { requirePlatformAdmin } from "@/lib/rbac";

import { listFeatures } from "./data";
import FeaturesClient from "./features-client";

export default async function FeaturesPage({
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

  const { rows, filtered, total, groups } = await listFeatures({
    q: str(sp.q),
    status: str(sp.status),
    featureGroup: str(sp.featureGroup),
    sortBy: str(sp.sortBy),
    sortDir: str(sp.sortDir),
    page: num(sp.page),
    pageSize: num(sp.pageSize),
  });

  return <FeaturesClient rows={rows} filtered={filtered} total={total} groups={groups} />;
}
