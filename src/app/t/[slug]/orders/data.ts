import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ORDER_SORTABLE,
  orderChannelSchema,
  orderFulfillmentTypeSchema,
  orderPaymentMethodSchema,
  orderPaymentStatusSchema,
  orderSourceSchema,
  orderStatusSchema,
} from "@/lib/validations/order";
import { templateFieldSchema, templateLayoutSchema, type TemplateField, type TemplateLayout } from "@/lib/validations/template";

const PAGE_SIZES = [10, 20, 50, 100];
const SORTABLE = new Set<string>(ORDER_SORTABLE);

export type OrderListParams = {
  q?: string;
  status?: string;
  source?: string;
  channel?: string;
  fulfillmentType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  customerId?: string;
  createdByAgent?: string;
  minTotal?: string;
  maxTotal?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

export async function orderTemplateFields(
  nicheId: string,
): Promise<{ fields: TemplateField[]; layout?: TemplateLayout }> {
  const template = await prisma.template.findFirst({
    where: { nicheId, entityType: "order", status: "active" },
    orderBy: { version: "desc" },
    select: { fields: true, config: true },
  });
  const parsed = templateFieldSchema.array().safeParse(template?.fields ?? []);
  const layout = templateLayoutSchema.safeParse((template?.config as { layout?: unknown } | null)?.layout);
  return {
    fields: parsed.success ? parsed.data : [],
    layout: layout.success ? layout.data : undefined,
  };
}

function dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  const filter: Prisma.DateTimeFilter = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) filter.gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) filter.lte = d;
  }
  return filter.gte !== undefined || filter.lte !== undefined ? filter : undefined;
}

export async function listOrders(tenantId: string, params: OrderListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 20) ? (params.pageSize ?? 20) : 20;

  const where: Prisma.OrderWhereInput = { tenantId };
  if (params.q) {
    where.OR = [
      { orderCode: { contains: params.q, mode: "insensitive" } },
      { customer: { name: { contains: params.q, mode: "insensitive" } } },
      { customer: { phone: { contains: params.q, mode: "insensitive" } } },
      { items: { some: { name: { contains: params.q, mode: "insensitive" } } } },
    ];
  }
  const status = orderStatusSchema.safeParse(params.status);
  if (status.success) where.status = status.data;
  const source = orderSourceSchema.safeParse(params.source);
  if (source.success) where.source = source.data;
  const channel = orderChannelSchema.safeParse(params.channel);
  if (channel.success) where.channel = channel.data;
  const fulfillment = orderFulfillmentTypeSchema.safeParse(params.fulfillmentType);
  if (fulfillment.success) where.fulfillmentType = fulfillment.data;
  const payMethod = orderPaymentMethodSchema.safeParse(params.paymentMethod);
  if (payMethod.success) where.paymentMethod = payMethod.data;
  const payStatus = orderPaymentStatusSchema.safeParse(params.paymentStatus);
  if (payStatus.success) where.paymentStatus = payStatus.data;
  if (params.customerId) where.customerId = params.customerId;
  if (params.createdByAgent === "true") where.createdByAgent = true;
  if (params.createdByAgent === "false") where.createdByAgent = false;

  const totalFilter: Prisma.DecimalFilter = {};
  const min = Number(params.minTotal);
  const max = Number(params.maxTotal);
  if (params.minTotal && Number.isFinite(min)) totalFilter.gte = min;
  if (params.maxTotal && Number.isFinite(max)) totalFilter.lte = max;
  if (totalFilter.gte !== undefined || totalFilter.lte !== undefined) where.total = totalFilter;

  const createdAt = dateRange(params.createdFrom, params.createdTo);
  if (createdAt) where.createdAt = createdAt;
  const updatedAt = dateRange(params.updatedFrom, params.updatedTo);
  if (updatedAt) where.updatedAt = updatedAt;

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.OrderOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { orderNumber: "desc" };

  const select = {
    id: true,
    orderNumber: true,
    orderCode: true,
    status: true,
    source: true,
    channel: true,
    fulfillmentType: true,
    total: true,
    amountPaid: true,
    paymentStatus: true,
    paymentMethod: true,
    createdByAgent: true,
    confirmedAt: true,
    createdAt: true,
    updatedAt: true,
    customer: { select: { id: true, name: true, phone: true } },
    _count: { select: { items: true } },
    // internalNotes / customData / payment provider data excluded from the list.
  } satisfies Prisma.OrderSelect;

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.order.findMany({ where, orderBy, select, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.order.count({ where }),
    prisma.order.count({ where: { tenantId } }),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      total: r.total.toString(),
      amountPaid: r.amountPaid.toString(),
      itemsCount: r._count.items,
    })),
    filtered,
    total,
    page,
    pageSize,
  };
}

export type OrderListRow = Awaited<ReturnType<typeof listOrders>>["rows"][number];

export async function getOrder(tenantId: string, orderId: string) {
  const o = await prisma.order.findFirst({
    where: { id: orderId, tenantId }, // tenant-scoped
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      items: { orderBy: { sortOrder: "asc" } },
      addresses: true,
      payments: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!o) return null;
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    orderCode: o.orderCode,
    customerId: o.customerId,
    customer: o.customer,
    source: o.source,
    channel: o.channel,
    status: o.status,
    fulfillmentType: o.fulfillmentType,
    subtotal: o.subtotal.toString(),
    discountType: o.discountType,
    discountValue: o.discountValue?.toString() ?? null,
    deliveryFee: o.deliveryFee?.toString() ?? null,
    total: o.total.toString(),
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    amountPaid: o.amountPaid.toString(),
    customerNotes: o.customerNotes,
    internalNotes: o.internalNotes,
    customData: (o.customData as Record<string, unknown>) ?? {},
    createdByAgent: o.createdByAgent,
    confirmedAt: o.confirmedAt,
    cancelledAt: o.cancelledAt,
    completedAt: o.completedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: o.items.map((it) => ({
      id: it.id,
      itemType: it.itemType,
      productId: it.productId,
      serviceId: it.serviceId,
      offerPlanId: it.offerPlanId,
      name: it.name,
      description: it.description,
      quantity: it.quantity.toString(),
      unitPrice: it.unitPrice.toString(),
      discountValue: it.discountValue?.toString() ?? null,
      total: it.total.toString(),
      scheduledStartAt: it.scheduledStartAt,
      scheduledEndAt: it.scheduledEndAt,
      appointmentId: it.appointmentId,
      sortOrder: it.sortOrder,
    })),
    addresses: o.addresses,
    payments: o.payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      method: p.method,
      status: p.status,
      amount: p.amount.toString(),
      amountPaid: p.amountPaid.toString(),
      paymentUrl: p.paymentUrl,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
    statusHistory: o.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedByAgent: h.changedByAgent,
      reason: h.reason,
      createdAt: h.createdAt,
    })),
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

/** Active customers (id+name+phone) for the order's customer combobox. */
export async function listCustomerOptions(tenantId: string) {
  return prisma.customer.findMany({
    where: { tenantId, status: "active" },
    orderBy: { name: "asc" },
    take: 100,
    select: { id: true, name: true, phone: true },
  });
}

export type OrderCatalogOption = { id: string; name: string; price: string };

/** Sellable catalog (product/service/offer_plan) for the item editor pickers. */
export async function listOrderCatalog(tenantId: string): Promise<{
  products: OrderCatalogOption[];
  services: OrderCatalogOption[];
  offerPlans: OrderCatalogOption[];
}> {
  const [products, services, offerPlans] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, status: "active", availableForSale: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, salePrice: true, promotionalPrice: true },
    }),
    prisma.service.findMany({
      where: { tenantId, status: "active", availableForBooking: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, basePrice: true, promotionalPrice: true },
    }),
    prisma.offerPlan.findMany({
      where: { tenantId, status: "active", availableForSale: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, promotionalPrice: true },
    }),
  ]);
  return {
    products: products.map((p) => ({ id: p.id, name: p.name, price: (p.promotionalPrice ?? p.salePrice).toString() })),
    services: services.map((s) => ({ id: s.id, name: s.name, price: (s.promotionalPrice ?? s.basePrice).toString() })),
    offerPlans: offerPlans.map((o) => ({ id: o.id, name: o.name, price: (o.promotionalPrice ?? o.price).toString() })),
  };
}
