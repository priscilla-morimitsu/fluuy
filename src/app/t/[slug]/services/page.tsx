import { notFound } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import {
  listLocations,
  listProfessionals,
  listServiceCategories,
  listServices,
  serviceTemplateFields,
} from "./data";
import ServicesClient from "./services-client";

export default async function ServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  // Server-side gate: active membership + the service_catalog feature. 404
  // (not 403) so the route doesn't leak tenant/feature existence.
  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "service_catalog" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager";

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const num = (v: string | string[] | undefined) => {
    const n = Number(str(v));
    return Number.isFinite(n) ? n : undefined;
  };

  const [{ rows, filtered, total }, categories, professionals, locations, templateFields] = await Promise.all([
    listServices(tenant.id, {
      q: str(sp.q),
      categoryId: str(sp.categoryId),
      status: str(sp.status),
      availableForBooking: str(sp.availableForBooking),
      requiresScheduling: str(sp.requiresScheduling),
      deliveryMode: str(sp.deliveryMode),
      minPrice: str(sp.minPrice),
      maxPrice: str(sp.maxPrice),
      sortBy: str(sp.sortBy),
      sortDir: str(sp.sortDir),
      page: num(sp.page),
      pageSize: num(sp.pageSize),
    }),
    listServiceCategories(tenant.id),
    listProfessionals(tenant.id),
    listLocations(tenant.id),
    serviceTemplateFields(tenant.nicheId),
  ]);

  return (
    <ServicesClient
      slug={slug}
      rows={rows}
      filtered={filtered}
      total={total}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      professionals={professionals.map((p) => ({ id: p.id, name: p.name }))}
      locations={locations.map((l) => ({ id: l.id, name: l.name, type: l.type }))}
      templateFields={templateFields}
      canWrite={canWrite}
    />
  );
}
