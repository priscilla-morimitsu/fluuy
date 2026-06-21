import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SERVICE_SORTABLE,
  serviceDeliveryModeSchema,
  serviceStatusSchema,
} from "@/lib/validations/service";
import { templateFieldSchema, type TemplateField } from "@/lib/validations/template";

const PAGE_SIZES = [10, 20, 50, 100];
const SORTABLE = new Set<string>(SERVICE_SORTABLE);

export type ServiceListParams = {
  q?: string;
  categoryId?: string;
  status?: string;
  availableForBooking?: string;
  requiresScheduling?: string;
  deliveryMode?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

/** Active "service" template fields for a niche (dynamic customData section). */
export async function serviceTemplateFields(nicheId: string): Promise<TemplateField[]> {
  const template = await prisma.template.findFirst({
    where: { nicheId, entityType: "service", status: "active" },
    orderBy: { version: "desc" },
    select: { fields: true },
  });
  const parsed = templateFieldSchema.array().safeParse(template?.fields ?? []);
  return parsed.success ? parsed.data : [];
}

/** Tenant-scoped, filtered, sorted, paginated service list for the table. */
export async function listServices(tenantId: string, params: ServiceListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 20) ? (params.pageSize ?? 20) : 20;

  const where: Prisma.ServiceWhereInput = { tenantId };
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
      { category: { name: { contains: params.q, mode: "insensitive" } } },
    ];
  }
  if (params.categoryId) where.categoryId = params.categoryId;
  const status = serviceStatusSchema.safeParse(params.status);
  if (status.success) where.status = status.data;
  if (params.availableForBooking === "true") where.availableForBooking = true;
  if (params.availableForBooking === "false") where.availableForBooking = false;
  if (params.requiresScheduling === "true") where.requiresScheduling = true;
  if (params.requiresScheduling === "false") where.requiresScheduling = false;
  const mode = serviceDeliveryModeSchema.safeParse(params.deliveryMode);
  if (mode.success) where.deliveryModes = { has: mode.data };

  const min = Number(params.minPrice);
  const max = Number(params.maxPrice);
  const priceFilter: Prisma.DecimalFilter = {};
  if (params.minPrice && Number.isFinite(min)) priceFilter.gte = min;
  if (params.maxPrice && Number.isFinite(max)) priceFilter.lte = max;
  if (priceFilter.gte !== undefined || priceFilter.lte !== undefined) where.basePrice = priceFilter;

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.ServiceOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { createdAt: "desc" };

  const select = {
    id: true,
    name: true,
    slug: true,
    basePrice: true,
    promotionalPrice: true,
    estimatedDurationMinutes: true,
    status: true,
    availableForBooking: true,
    requiresScheduling: true,
    deliveryModes: true,
    imageUrl: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { id: true, name: true } },
    // internalNotes / customData / onlineInstructions / homeServiceNotes are
    // deliberately excluded from the list (fetched via getService on edit).
  } satisfies Prisma.ServiceSelect;

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.service.findMany({ where, orderBy, select, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.service.count({ where }),
    prisma.service.count({ where: { tenantId } }),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      basePrice: r.basePrice.toString(),
      promotionalPrice: r.promotionalPrice?.toString() ?? null,
    })),
    filtered,
    total,
    page,
    pageSize,
  };
}

export type ServiceListRow = Awaited<ReturnType<typeof listServices>>["rows"][number];

/** Categories of a tenant with their service counts (for the combobox). */
export async function listServiceCategories(tenantId: string) {
  const cats = await prisma.serviceCategory.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      status: true,
      _count: { select: { services: true } },
    },
  });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    status: c.status,
    serviceCount: c._count.services,
  }));
}

export type ServiceCategoryRow = Awaited<ReturnType<typeof listServiceCategories>>[number];

/** Active professionals of a tenant (for the link multi-select). */
export async function listProfessionals(tenantId: string) {
  return prisma.professional.findMany({
    where: { tenantId, status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, title: true },
  });
}

export type ProfessionalRow = Awaited<ReturnType<typeof listProfessionals>>[number];

/** Active locations of a tenant (for the link multi-select). */
export async function listLocations(tenantId: string) {
  return prisma.location.findMany({
    where: { tenantId, status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
  });
}

export type LocationRow = Awaited<ReturnType<typeof listLocations>>[number];

/** Full service for the edit drawer — scoped to the tenant. */
export async function getService(tenantId: string, serviceId: string) {
  const s = await prisma.service.findFirst({
    where: { id: serviceId, tenantId }, // tenant-scoped
    include: {
      serviceProfessionals: { select: { professionalId: true } },
      serviceLocations: { select: { locationId: true } },
    },
  });
  if (!s) return null;
  return {
    professionalIds: s.serviceProfessionals.map((sp) => sp.professionalId),
    locationIds: s.serviceLocations.map((sl) => sl.locationId),
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    categoryId: s.categoryId,
    basePrice: s.basePrice.toString(),
    promotionalPrice: s.promotionalPrice?.toString() ?? null,
    estimatedDurationMinutes: s.estimatedDurationMinutes,
    status: s.status,
    availableForBooking: s.availableForBooking,
    requiresScheduling: s.requiresScheduling,
    deliveryModes: s.deliveryModes,
    onlineInstructions: s.onlineInstructions,
    homeServiceNotes: s.homeServiceNotes,
    imageUrl: s.imageUrl,
    internalNotes: s.internalNotes,
    customData: (s.customData as Record<string, unknown>) ?? {},
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export type ServiceDetail = NonNullable<Awaited<ReturnType<typeof getService>>>;

/** Availability rules of a service (tenant-scoped), ordered for display. */
export async function listAvailabilityRules(tenantId: string, serviceId: string) {
  const rules = await prisma.serviceAvailabilityRule.findMany({
    where: { tenantId, serviceId },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      deliveryMode: true,
      weekday: true,
      startTime: true,
      endTime: true,
      slotDurationMinutes: true,
      bufferBeforeMinutes: true,
      bufferAfterMinutes: true,
      status: true,
      professional: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });
  return rules.map((r) => ({
    ...r,
    professionalId: r.professional?.id ?? null,
    locationId: r.location?.id ?? null,
  }));
}

export type AvailabilityRuleRow = Awaited<ReturnType<typeof listAvailabilityRules>>[number];
