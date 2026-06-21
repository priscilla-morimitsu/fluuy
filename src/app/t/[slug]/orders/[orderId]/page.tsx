import { notFound } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import { getOrder } from "../data";
import OrderDetail from "../order-detail";

const FEATURE = "product_order_request";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager" || role === "tenant_operator";
  const canManagePayment = role === "tenant_owner" || role === "tenant_manager";

  const order = await getOrder(tenant.id, orderId);
  if (!order) notFound();

  return <OrderDetail slug={slug} order={order} canWrite={canWrite} canManagePayment={canManagePayment} />;
}
