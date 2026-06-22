"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireUser, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import {
  canTransition,
  computeOrderTotals,
  FINAL_STATUSES,
  orderCreateSchema,
  orderPaymentMethodSchema,
  orderStatusSchema,
  type OrderCreateInput,
  type OrderStatus,
} from "@/lib/validations/order";
import { validateCustomData, type TemplateField } from "@/lib/validations/template";

import { getOrder, orderTemplateFields } from "./data";
import type { OrderFormInitial } from "./order-form";

export type OrderActionResult = AdminActionResult;

/** Loads a full order shaped for the edit drawer (write roles + feature). */
export async function fetchOrderForEditAction(slug: string, orderId: string): Promise<OrderFormInitial | null> {
  const { tenant } = await resolveTenantContext(slug, {
    roles: ["tenant_owner", "tenant_manager", "tenant_operator"],
    feature: "product_order_request",
  });
  const order = await getOrder(tenant.id, orderId);
  if (!order) return null;
  return {
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
}

// operator can create/edit non-final orders (spec); delete and payment changes
// are restricted to owner/manager.
const WRITE_ROLES = ["tenant_owner", "tenant_manager", "tenant_operator"] as const;
const SENSITIVE_ROLES = ["tenant_owner", "tenant_manager"] as const;
// Reuse the existing module feature (already wired to the sidebar item) instead
// of introducing a duplicate "orders" key. Listed as related in the spec.
const FEATURE = "product_order_request";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  console.error("[orders] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

function parsePayload(formData: FormData): unknown {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readCustomData(fields: TemplateField[], formData: FormData): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(`custom_${field.key}`);
    if (field.type === "boolean") data[field.key] = raw === "on" || raw === "true";
    else if (field.type === "number") {
      if (raw !== null && raw !== "") data[field.key] = Number(raw);
    } else if (raw !== null && raw !== "") data[field.key] = String(raw);
  }
  return data;
}

async function customerInTenant(tenantId: string, customerId: string): Promise<boolean> {
  const c = await prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true } });
  return Boolean(c);
}

/** Validate every catalog reference on the items belongs to the tenant. */
async function validateItemRefs(tenantId: string, items: OrderCreateInput["items"]): Promise<boolean> {
  const byType = (t: string, key: "productId" | "serviceId" | "offerPlanId") =>
    [...new Set(items.filter((i) => i.itemType === t).map((i) => i[key]).filter((v): v is string => Boolean(v)))];
  const productIds = byType("product", "productId");
  const serviceIds = byType("service", "serviceId");
  const offerPlanIds = byType("offer_plan", "offerPlanId");

  const [products, services, plans] = await Promise.all([
    productIds.length
      ? prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true } })
      : Promise.resolve([]),
    serviceIds.length
      ? prisma.service.findMany({ where: { tenantId, id: { in: serviceIds } }, select: { id: true } })
      : Promise.resolve([]),
    offerPlanIds.length
      ? prisma.offerPlan.findMany({ where: { tenantId, id: { in: offerPlanIds } }, select: { id: true } })
      : Promise.resolve([]),
  ]);
  return (
    products.length === productIds.length &&
    services.length === serviceIds.length &&
    plans.length === offerPlanIds.length
  );
}

function orderCode(n: number): string {
  return `PED-${String(n).padStart(6, "0")}`;
}

export async function createOrderAction(
  slug: string,
  _prev: OrderActionResult,
  formData: FormData,
): Promise<OrderActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const user = await requireUser();

    const parsed = orderCreateSchema.safeParse(parsePayload(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    if (!(await customerInTenant(tenant.id, d.customerId))) return { error: "Informe o cliente." };
    if (!(await validateItemRefs(tenant.id, d.items))) return { error: "Item inválido." };

    const fields = await orderTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const itemInputs = d.items.map((it) => ({ quantity: it.quantity, unitPrice: it.unitPrice, discountValue: it.discountValue ?? 0 }));
    const { itemTotals, subtotal, total } = computeOrderTotals({
      items: itemInputs,
      discountType: d.discountType ?? null,
      discountValue: d.discountValue ?? null,
      deliveryFee: d.deliveryFee ?? null,
    });

    const status: OrderStatus = d.status ?? "draft";

    await prisma.$transaction(async (tx) => {
      const seq = await tx.orderSequence.upsert({
        where: { tenantId: tenant.id },
        create: { tenantId: tenant.id, nextNumber: 1 },
        update: { nextNumber: { increment: 1 } },
        select: { nextNumber: true },
      });
      const orderNumber = seq.nextNumber;

      await tx.order.create({
        data: {
          tenantId: tenant.id,
          orderNumber,
          orderCode: orderCode(orderNumber),
          customerId: d.customerId,
          // Origin is system-assigned, never user-supplied: a panel-created order
          // is "manual"; other origins (ai, order…) are set by their own paths.
          source: d.source ?? "manual",
          channel: d.channel,
          status,
          fulfillmentType: d.fulfillmentType ?? null,
          subtotal: subtotal.toFixed(2),
          discountType: d.discountType ?? null,
          discountValue: d.discountValue?.toFixed(2) ?? null,
          deliveryFee: d.deliveryFee?.toFixed(2) ?? null,
          total: total.toFixed(2),
          paymentMethod: d.paymentMethod ?? null,
          paymentStatus: d.paymentStatus ?? "pending",
          amountPaid: (d.amountPaid ?? 0).toFixed(2),
          customerNotes: d.customerNotes,
          internalNotes: d.internalNotes,
          customData: customData as Prisma.InputJsonValue,
          createdByUserId: user.id,
          confirmedAt: status === "confirmed" ? new Date() : null,
          items: {
            create: d.items.map((it, i) => ({
              tenantId: tenant.id,
              itemType: it.itemType,
              productId: it.productId ?? null,
              serviceId: it.serviceId ?? null,
              offerPlanId: it.offerPlanId ?? null,
              name: it.name,
              description: it.description,
              quantity: it.quantity.toFixed(2),
              unitPrice: it.unitPrice.toFixed(2),
              discountValue: it.discountValue?.toFixed(2) ?? null,
              total: itemTotals[i].toFixed(2),
              scheduledStartAt: it.scheduledStartAt ?? null,
              scheduledEndAt: it.scheduledEndAt ?? null,
              sortOrder: i,
            })),
          },
          addresses: d.address
            ? {
                create: {
                  tenantId: tenant.id,
                  type: d.address.type,
                  customerAddressId: d.address.customerAddressId ?? null,
                  name: d.address.name,
                  zipCode: d.address.zipCode,
                  street: d.address.street,
                  number: d.address.number,
                  complement: d.address.complement,
                  neighborhood: d.address.neighborhood,
                  city: d.address.city,
                  state: d.address.state,
                  reference: d.address.reference,
                },
              }
            : undefined,
          statusHistory: {
            create: { tenantId: tenant.id, fromStatus: null, toStatus: status, changedByUserId: user.id },
          },
        },
      });
    });

    revalidatePath(`/t/${slug}/orders`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateOrderAction(
  slug: string,
  orderId: string,
  _prev: OrderActionResult,
  formData: FormData,
): Promise<OrderActionResult> {
  try {
    const { tenant, role } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      select: { id: true, status: true },
    });
    if (!existing) return { error: "Pedido não encontrado." };
    if (FINAL_STATUSES.includes(existing.status as OrderStatus) && role !== "tenant_owner") {
      return { error: "Pedidos finalizados não podem ser editados." };
    }

    const parsed = orderCreateSchema.safeParse(parsePayload(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    if (!(await customerInTenant(tenant.id, d.customerId))) return { error: "Informe o cliente." };
    if (!(await validateItemRefs(tenant.id, d.items))) return { error: "Item inválido." };

    const fields = await orderTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const itemInputs = d.items.map((it) => ({ quantity: it.quantity, unitPrice: it.unitPrice, discountValue: it.discountValue ?? 0 }));
    const { itemTotals, subtotal, total } = computeOrderTotals({
      items: itemInputs,
      discountType: d.discountType ?? null,
      discountValue: d.discountValue ?? null,
      deliveryFee: d.deliveryFee ?? null,
    });

    await prisma.$transaction([
      prisma.order.updateMany({
        where: { id: orderId, tenantId: tenant.id },
        data: {
          customerId: d.customerId,
          // `source` is intentionally omitted on update — the original origin is
          // preserved and never overwritten by a panel edit.
          channel: d.channel,
          fulfillmentType: d.fulfillmentType ?? null,
          subtotal: subtotal.toFixed(2),
          discountType: d.discountType ?? null,
          discountValue: d.discountValue?.toFixed(2) ?? null,
          deliveryFee: d.deliveryFee?.toFixed(2) ?? null,
          total: total.toFixed(2),
          customerNotes: d.customerNotes,
          internalNotes: d.internalNotes,
          customData: customData as Prisma.InputJsonValue,
        },
      }),
      prisma.orderItem.deleteMany({ where: { orderId, tenantId: tenant.id } }),
      prisma.orderItem.createMany({
        data: d.items.map((it, i) => ({
          tenantId: tenant.id,
          orderId,
          itemType: it.itemType,
          productId: it.productId ?? null,
          serviceId: it.serviceId ?? null,
          offerPlanId: it.offerPlanId ?? null,
          name: it.name,
          description: it.description,
          quantity: it.quantity.toFixed(2),
          unitPrice: it.unitPrice.toFixed(2),
          discountValue: it.discountValue?.toFixed(2) ?? null,
          total: itemTotals[i].toFixed(2),
          scheduledStartAt: it.scheduledStartAt ?? null,
          scheduledEndAt: it.scheduledEndAt ?? null,
          sortOrder: i,
        })),
      }),
      prisma.orderAddress.deleteMany({ where: { orderId, tenantId: tenant.id } }),
      ...(d.address
        ? [
            prisma.orderAddress.create({
              data: {
                tenantId: tenant.id,
                orderId,
                type: d.address.type,
                customerAddressId: d.address.customerAddressId ?? null,
                name: d.address.name,
                zipCode: d.address.zipCode,
                street: d.address.street,
                number: d.address.number,
                complement: d.address.complement,
                neighborhood: d.address.neighborhood,
                city: d.address.city,
                state: d.address.state,
                reference: d.address.reference,
              },
            }),
          ]
        : []),
    ]);

    revalidatePath(`/t/${slug}/orders`);
    revalidatePath(`/t/${slug}/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateOrderStatusAction(
  slug: string,
  orderId: string,
  toStatus: string,
  reason?: string,
): Promise<OrderActionResult> {
  try {
    const parsedStatus = orderStatusSchema.safeParse(toStatus);
    if (!parsedStatus.success) return { error: "Status inválido." };
    const target = parsedStatus.data;

    const { tenant, role } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const user = await requireUser();

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      select: { id: true, status: true, paymentStatus: true },
    });
    if (!order) return { error: "Pedido não encontrado." };

    const from = order.status as OrderStatus;
    if (from === target) return { error: "O pedido já está nesse status." };
    if (!canTransition(from, target)) return { error: "Transição de status não permitida." };

    // Cancelling an order with money attached is a sensitive action.
    if (
      target === "cancelled" &&
      (order.paymentStatus === "paid" || order.paymentStatus === "partial") &&
      !SENSITIVE_ROLES.includes(role as (typeof SENSITIVE_ROLES)[number])
    ) {
      return { error: "Pedidos com pagamento exigem um gestor para cancelar." };
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.order.updateMany({
        where: { id: orderId, tenantId: tenant.id },
        data: {
          status: target,
          ...(target === "confirmed" ? { confirmedAt: now } : {}),
          ...(target === "cancelled" ? { cancelledAt: now } : {}),
          ...(target === "completed" ? { completedAt: now } : {}),
        },
      }),
      prisma.orderStatusHistory.create({
        data: { tenantId: tenant.id, orderId, fromStatus: from, toStatus: target, changedByUserId: user.id, reason: reason || null },
      }),
    ]);

    revalidatePath(`/t/${slug}/orders`);
    revalidatePath(`/t/${slug}/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function cancelOrderAction(slug: string, orderId: string, reason?: string): Promise<OrderActionResult> {
  return updateOrderStatusAction(slug, orderId, "cancelled", reason);
}

export async function deleteOrderAction(slug: string, orderId: string): Promise<OrderActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...SENSITIVE_ROLES], feature: FEATURE });
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      select: {
        id: true,
        status: true,
        _count: { select: { payments: true } },
        items: { select: { appointmentId: true } },
      },
    });
    if (!order) return { error: "Pedido não encontrado." };
    const hasAppointment = order.items.some((i) => i.appointmentId !== null);
    if (order.status !== "draft" || order._count.payments > 0 || hasAppointment) {
      return { error: "Este pedido possui registros vinculados e não pode ser excluído. Você pode cancelá-lo." };
    }
    await prisma.order.deleteMany({ where: { id: orderId, tenantId: tenant.id } });
    revalidatePath(`/t/${slug}/orders`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Manual payment registration (no Mercado Pago yet). Creates an OrderPayment
 * (provider=manual) and re-derives the order's amountPaid/paymentStatus from the
 * sum of its payments. Restricted to owner/manager.
 */
export async function registerManualPaymentAction(
  slug: string,
  orderId: string,
  amount: string,
  method: string,
): Promise<OrderActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...SENSITIVE_ROLES], feature: FEATURE });
    const parsedMethod = orderPaymentMethodSchema.safeParse(method);
    if (!parsedMethod.success) return { error: "Forma de pagamento inválida." };
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return { error: "Pagamento inválido." };

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      select: { id: true, total: true },
    });
    if (!order) return { error: "Pedido não encontrado." };

    await prisma.$transaction(async (tx) => {
      await tx.orderPayment.create({
        data: {
          tenantId: tenant.id,
          orderId,
          provider: "manual",
          method: parsedMethod.data,
          status: "paid",
          amount: value.toFixed(2),
          amountPaid: value.toFixed(2),
          paidAt: new Date(),
        },
      });
      const payments = await tx.orderPayment.findMany({
        where: { orderId, tenantId: tenant.id },
        select: { amountPaid: true },
      });
      const paid = payments.reduce((s, p) => s + Number(p.amountPaid), 0);
      const total = Number(order.total);
      const paymentStatus = paid <= 0 ? "pending" : paid >= total ? "paid" : "partial";
      await tx.order.updateMany({
        where: { id: orderId, tenantId: tenant.id },
        data: { amountPaid: paid.toFixed(2), paymentStatus, paymentMethod: parsedMethod.data },
      });
    });

    revalidatePath(`/t/${slug}/orders/${orderId}`);
    revalidatePath(`/t/${slug}/orders`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
