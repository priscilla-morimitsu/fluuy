import { notFound } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import {
  listActiveProducts,
  listActiveServices,
  listOfferPlanCategories,
  listOfferPlans,
  offerPlanTemplateFields,
} from "./data";
import PlansClient from "./plans-client";

export default async function PlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  // Server-side gate: active membership + the plans_catalog feature. 404 (not
  // 403) so the route doesn't leak tenant/feature existence.
  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "plans_catalog" });
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

  const [{ rows, filtered, total }, categories, services, products, templateFields] = await Promise.all([
    listOfferPlans(tenant.id, {
      q: str(sp.q),
      type: str(sp.type),
      categoryId: str(sp.categoryId),
      status: str(sp.status),
      availableForSale: str(sp.availableForSale),
      billingCycle: str(sp.billingCycle),
      autoRenew: str(sp.autoRenew),
      allowScheduling: str(sp.allowScheduling),
      hasServices: str(sp.hasServices),
      hasProducts: str(sp.hasProducts),
      minPrice: str(sp.minPrice),
      maxPrice: str(sp.maxPrice),
      updatedFrom: str(sp.updatedFrom),
      updatedTo: str(sp.updatedTo),
      sortBy: str(sp.sortBy),
      sortDir: str(sp.sortDir),
      page: num(sp.page),
      pageSize: num(sp.pageSize),
    }),
    listOfferPlanCategories(tenant.id),
    listActiveServices(tenant.id),
    listActiveProducts(tenant.id),
    offerPlanTemplateFields(tenant.nicheId),
  ]);

  return (
    <PlansClient
      slug={slug}
      rows={rows}
      filtered={filtered}
      total={total}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      services={services}
      products={products}
      templateFields={templateFields}
      canWrite={canWrite}
    />
  );
}
