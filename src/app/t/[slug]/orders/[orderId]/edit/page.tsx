import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { TenantUserRole } from "@/generated/prisma/client";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import { getOrder, listCustomerOptions, listOrderCatalog, orderTemplateFields } from "../../data";
import OrderForm, { type OrderFormInitial } from "../../order-form";

const FEATURE = "product_order_request";
const WRITE_ROLES: TenantUserRole[] = ["tenant_owner", "tenant_manager", "tenant_operator"];

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant } = ctx;

  const [order, customers, catalog, template] = await Promise.all([
    getOrder(tenant.id, orderId),
    listCustomerOptions(tenant.id),
    listOrderCatalog(tenant.id),
    orderTemplateFields(tenant.nicheId),
  ]);
  if (!order) notFound();

  const initial: OrderFormInitial = {
    id: order.id,
    customerId: order.customerId,
    source: order.source,
    channel: order.channel,
    fulfillmentType: order.fulfillmentType,
    discountType: order.discountType,
    discountValue: order.discountValue,
    deliveryFee: order.deliveryFee,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    amountPaid: order.amountPaid,
    customerNotes: order.customerNotes,
    internalNotes: order.internalNotes,
    customData: order.customData,
    items: order.items.map((it) => ({
      itemType: it.itemType,
      productId: it.productId,
      serviceId: it.serviceId,
      offerPlanId: it.offerPlanId,
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountValue: it.discountValue,
      scheduledStartAt: it.scheduledStartAt,
    })),
    address: order.addresses[0]
      ? {
          type: order.addresses[0].type,
          zipCode: order.addresses[0].zipCode,
          street: order.addresses[0].street,
          number: order.addresses[0].number,
          complement: order.addresses[0].complement,
          neighborhood: order.addresses[0].neighborhood,
          city: order.addresses[0].city,
          state: order.addresses[0].state,
          reference: order.addresses[0].reference,
        }
      : null,
  };

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[560px] flex-col gap-3">
      <Link href={`/t/${slug}/orders/${orderId}`} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Pedido {order.orderCode}
      </Link>
      <h2 className="text-xl font-semibold">Editar pedido {order.orderCode}</h2>
      <div className="glass min-h-0 flex-1 overflow-hidden rounded-2xl border border-(--glass-border)">
        <OrderForm slug={slug} customers={customers} catalog={catalog} templateFields={template.fields} templateLayout={template.layout} initial={initial} />
      </div>
    </div>
  );
}
