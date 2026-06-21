import { notFound } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import {
  customerNicheLabels,
  customerTemplateFields,
  listCustomers,
  listCustomerTags,
} from "./data";
import CustomersClient from "./customers-client";

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  // Server-side gate: active membership + the customer_management feature. 404
  // (not 403) so the route doesn't leak tenant/feature existence.
  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "customer_management" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager" || role === "tenant_operator";
  const canDelete = role === "tenant_owner" || role === "tenant_manager";

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const num = (v: string | string[] | undefined) => {
    const n = Number(str(v));
    return Number.isFinite(n) ? n : undefined;
  };

  const [{ rows, filtered, total }, tags, templateFields, labels] = await Promise.all([
    listCustomers(tenant.id, {
      q: str(sp.q),
      status: str(sp.status),
      source: str(sp.source),
      personType: str(sp.personType),
      tagId: str(sp.tagId),
      hasAddress: str(sp.hasAddress),
      hasConsent: str(sp.hasConsent),
      createdFrom: str(sp.createdFrom),
      createdTo: str(sp.createdTo),
      updatedFrom: str(sp.updatedFrom),
      updatedTo: str(sp.updatedTo),
      sortBy: str(sp.sortBy),
      sortDir: str(sp.sortDir),
      page: num(sp.page),
      pageSize: num(sp.pageSize),
    }),
    listCustomerTags(tenant.id),
    customerTemplateFields(tenant.nicheId),
    customerNicheLabels(tenant.nicheId),
  ]);

  return (
    <CustomersClient
      slug={slug}
      rows={rows}
      filtered={filtered}
      total={total}
      tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color, customerCount: t.customerCount }))}
      templateFields={templateFields}
      customerLabel={labels.customerLabel}
      canWrite={canWrite}
      canDelete={canDelete}
    />
  );
}
