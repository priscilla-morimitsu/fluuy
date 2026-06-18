import { requirePlatformAdmin } from "@/lib/rbac";

import { listNiches } from "./data";
import NichesClient from "./niches-client";

export default async function NichesPage({
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

  const { rows, filtered, total } = await listNiches({
    q: str(sp.q),
    status: str(sp.status),
    sortBy: str(sp.sortBy),
    sortDir: str(sp.sortDir),
    page: num(sp.page),
    pageSize: num(sp.pageSize),
  });

  return <NichesClient rows={rows} filtered={filtered} total={total} />;
}
