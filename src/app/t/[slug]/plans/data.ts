import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  OFFER_PLAN_SORTABLE,
  offerPlanBillingCycleSchema,
  offerPlanStatusSchema,
  offerPlanTypeSchema,
} from "@/lib/validations/offer-plan";
import { templateFieldSchema, type TemplateField } from "@/lib/validations/template";

const PAGE_SIZES = [10, 20, 50, 100];
const SORTABLE = new Set<string>(OFFER_PLAN_SORTABLE);

export type OfferPlanListParams = {
  q?: string;
  type?: string;
  categoryId?: string;
  status?: string;
  availableForSale?: string;
  billingCycle?: string;
  autoRenew?: string;
  allowScheduling?: string;
  hasServices?: string;
  hasProducts?: string;
  minPrice?: string;
  maxPrice?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

/** Active "plan" template fields for a niche (dynamic customData section). */
export async function offerPlanTemplateFields(nicheId: string): Promise<TemplateField[]> {
  const template = await prisma.template.findFirst({
    where: { nicheId, entityType: "plan", status: "active" },
    orderBy: { version: "desc" },
    select: { fields: true },
  });
  const parsed = templateFieldSchema.array().safeParse(template?.fields ?? []);
  return parsed.success ? parsed.data : [];
}

function parseDate(v: string | undefined, endOfDay = false): Date | undefined {
  if (!v) return undefined;
  const d = new Date(endOfDay ? `${v}T23:59:59.999` : `${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Tenant-scoped, filtered, sorted, paginated offer-plan list for the table. */
export async function listOfferPlans(tenantId: string, params: OfferPlanListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 20) ? (params.pageSize ?? 20) : 20;

  const where: Prisma.OfferPlanWhereInput = { tenantId };
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
      { category: { name: { contains: params.q, mode: "insensitive" } } },
      { serviceItems: { some: { service: { name: { contains: params.q, mode: "insensitive" } } } } },
      { productItems: { some: { product: { name: { contains: params.q, mode: "insensitive" } } } } },
    ];
  }
  const type = offerPlanTypeSchema.safeParse(params.type);
  if (type.success) where.type = type.data;
  if (params.categoryId) where.categoryId = params.categoryId;
  const status = offerPlanStatusSchema.safeParse(params.status);
  if (status.success) where.status = status.data;
  const cycle = offerPlanBillingCycleSchema.safeParse(params.billingCycle);
  if (cycle.success) where.billingCycle = cycle.data;
  if (params.availableForSale === "true") where.availableForSale = true;
  if (params.availableForSale === "false") where.availableForSale = false;
  if (params.autoRenew === "true") where.autoRenew = true;
  if (params.autoRenew === "false") where.autoRenew = false;
  if (params.allowScheduling === "true") where.allowScheduling = true;
  if (params.allowScheduling === "false") where.allowScheduling = false;
  if (params.hasServices === "true") where.serviceItems = { some: {} };
  if (params.hasServices === "false") where.serviceItems = { none: {} };
  if (params.hasProducts === "true") where.productItems = { some: {} };
  if (params.hasProducts === "false") where.productItems = { none: {} };

  const min = Number(params.minPrice);
  const max = Number(params.maxPrice);
  const priceFilter: Prisma.DecimalFilter = {};
  if (params.minPrice && Number.isFinite(min)) priceFilter.gte = min;
  if (params.maxPrice && Number.isFinite(max)) priceFilter.lte = max;
  if (priceFilter.gte !== undefined || priceFilter.lte !== undefined) where.price = priceFilter;

  const updatedFrom = parseDate(params.updatedFrom);
  const updatedTo = parseDate(params.updatedTo, true);
  if (updatedFrom || updatedTo) {
    where.updatedAt = { ...(updatedFrom ? { gte: updatedFrom } : {}), ...(updatedTo ? { lte: updatedTo } : {}) };
  }

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.OfferPlanOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { createdAt: "desc" };

  const select = {
    id: true,
    name: true,
    type: true,
    price: true,
    promotionalPrice: true,
    billingCycle: true,
    autoRenew: true,
    expiresAfterDays: true,
    allowScheduling: true,
    status: true,
    availableForSale: true,
    imageUrl: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { id: true, name: true } },
    _count: { select: { serviceItems: true, productItems: true } },
  } satisfies Prisma.OfferPlanSelect;

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.offerPlan.findMany({ where, orderBy, select, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.offerPlan.count({ where }),
    prisma.offerPlan.count({ where: { tenantId } }),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      price: r.price.toString(),
      promotionalPrice: r.promotionalPrice?.toString() ?? null,
      itemCount: r._count.serviceItems + r._count.productItems,
    })),
    filtered,
    total,
    page,
    pageSize,
  };
}

export type OfferPlanListRow = Awaited<ReturnType<typeof listOfferPlans>>["rows"][number];

/** Categories of a tenant with their plan counts (for the combobox). */
export async function listOfferPlanCategories(tenantId: string) {
  const cats = await prisma.offerPlanCategory.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, status: true, _count: { select: { offerPlans: true } } },
  });
  return cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, status: c.status, planCount: c._count.offerPlans }));
}

export type OfferPlanCategoryRow = Awaited<ReturnType<typeof listOfferPlanCategories>>[number];

/** Active services of a tenant (for the included-services editor). */
export async function listActiveServices(tenantId: string) {
  return prisma.service.findMany({
    where: { tenantId, status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Active products of a tenant (for the included-products editor). */
export async function listActiveProducts(tenantId: string) {
  return prisma.product.findMany({
    where: { tenantId, status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Full offer plan for the edit drawer / detail page — tenant-scoped. */
export async function getOfferPlan(tenantId: string, offerPlanId: string) {
  const p = await prisma.offerPlan.findFirst({
    where: { id: offerPlanId, tenantId },
    include: {
      serviceItems: { orderBy: { sortOrder: "asc" }, include: { service: { select: { id: true, name: true } } } },
      productItems: { orderBy: { sortOrder: "asc" }, include: { product: { select: { id: true, name: true } } } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    categoryId: p.categoryId,
    type: p.type,
    price: p.price.toString(),
    promotionalPrice: p.promotionalPrice?.toString() ?? null,
    billingCycle: p.billingCycle,
    autoRenew: p.autoRenew,
    expiresAfterDays: p.expiresAfterDays,
    usageLimit: p.usageLimit,
    allowScheduling: p.allowScheduling,
    status: p.status,
    availableForSale: p.availableForSale,
    imageUrl: p.imageUrl,
    internalNotes: p.internalNotes,
    customData: (p.customData as Record<string, unknown>) ?? {},
    serviceItems: p.serviceItems.map((i) => ({
      id: i.id,
      serviceId: i.serviceId,
      serviceName: i.service.name,
      quantity: i.quantity,
      usageLimit: i.usageLimit,
      durationOverrideMinutes: i.durationOverrideMinutes,
      priceOverride: i.priceOverride?.toString() ?? null,
      included: i.included,
      sortOrder: i.sortOrder,
    })),
    productItems: p.productItems.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      quantity: i.quantity,
      usageLimit: i.usageLimit,
      priceOverride: i.priceOverride?.toString() ?? null,
      included: i.included,
      sortOrder: i.sortOrder,
    })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export type OfferPlanDetail = NonNullable<Awaited<ReturnType<typeof getOfferPlan>>>;
