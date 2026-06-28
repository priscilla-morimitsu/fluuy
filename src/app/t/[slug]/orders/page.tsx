import { notFound } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import { listCustomerOptions, listOrderCatalog, listOrders, orderTemplateFields } from "./data";
import OrdersClient from "./orders-client";

const FEATURE = "product_order_request";

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager" || role === "tenant_operator";

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const num = (v: string | string[] | undefined) => {
    const n = Number(str(v));
    return Number.isFinite(n) ? n : undefined;
  };

  const [{ rows, filtered, total }, customers, catalog, template] = await Promise.all([
    listOrders(tenant.id, {
      q: str(sp.q),
      status: str(sp.status),
      source: str(sp.source),
      channel: str(sp.channel),
      fulfillmentType: str(sp.fulfillmentType),
      paymentMethod: str(sp.paymentMethod),
      paymentStatus: str(sp.paymentStatus),
      customerId: str(sp.customerId),
      createdByAgent: str(sp.createdByAgent),
      minTotal: str(sp.minTotal),
      maxTotal: str(sp.maxTotal),
      createdFrom: str(sp.createdFrom),
      createdTo: str(sp.createdTo),
      updatedFrom: str(sp.updatedFrom),
      updatedTo: str(sp.updatedTo),
      sortBy: str(sp.sortBy),
      sortDir: str(sp.sortDir),
      page: num(sp.page),
      pageSize: num(sp.pageSize),
    }),
    listCustomerOptions(tenant.id),
    listOrderCatalog(tenant.id),
    orderTemplateFields(tenant.nicheId),
  ]);

  return (
    <OrdersClient
      slug={slug}
      rows={rows}
      filtered={filtered}
      total={total}
      customers={customers}
      catalog={catalog}
      templateFields={template.fields}
      templateLayout={template.layout}
      canWrite={canWrite}
    />
  );
}
