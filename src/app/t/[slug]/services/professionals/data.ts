import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PROFESSIONAL_SORTABLE, professionalStatusSchema } from "@/lib/validations/professional";
import {
  templateFieldSchema,
  templateLayoutSchema,
  type TemplateField,
  type TemplateLayout,
} from "@/lib/validations/template";

const PAGE_SIZES = [10, 20, 50, 100];
const SORTABLE = new Set<string>(PROFESSIONAL_SORTABLE);

export type ProfessionalListParams = {
  q?: string;
  status?: string;
  publicProfile?: string;
  specialtyId?: string;
  serviceId?: string;
  locationId?: string;
  hasUser?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

/** Active "professional" template fields + layout for a niche (dynamic customData). */
export async function professionalTemplateFields(
  nicheId: string,
): Promise<{ fields: TemplateField[]; layout?: TemplateLayout }> {
  const template = await prisma.template.findFirst({
    where: { nicheId, entityType: "professional", status: "active" },
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

/** Tenant-scoped, filtered, sorted, paginated professionals list for the table. */
export async function listProfessionals(tenantId: string, params: ProfessionalListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 20) ? (params.pageSize ?? 20) : 20;

  const where: Prisma.ProfessionalWhereInput = { tenantId };
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { title: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { phone: { contains: params.q, mode: "insensitive" } },
      { specialtyAssignments: { some: { specialty: { name: { contains: params.q, mode: "insensitive" } } } } },
    ];
  }
  const status = professionalStatusSchema.safeParse(params.status);
  if (status.success) where.status = status.data;
  if (params.publicProfile === "true") where.publicProfile = true;
  if (params.publicProfile === "false") where.publicProfile = false;
  if (params.specialtyId) where.specialtyAssignments = { some: { specialtyId: params.specialtyId } };
  if (params.serviceId) where.serviceProfessionals = { some: { serviceId: params.serviceId } };
  if (params.locationId) where.professionalLocations = { some: { locationId: params.locationId } };
  if (params.hasUser === "true") where.userId = { not: null };
  if (params.hasUser === "false") where.userId = null;

  const updated: Prisma.DateTimeFilter = {};
  if (params.updatedFrom) {
    const d = new Date(params.updatedFrom);
    if (!Number.isNaN(d.getTime())) updated.gte = d;
  }
  if (params.updatedTo) {
    const d = new Date(params.updatedTo);
    if (!Number.isNaN(d.getTime())) updated.lte = d;
  }
  if (updated.gte !== undefined || updated.lte !== undefined) where.updatedAt = updated;

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.ProfessionalOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { name: "asc" };

  const select = {
    id: true,
    name: true,
    title: true,
    avatarUrl: true,
    email: true,
    whatsapp: true,
    status: true,
    publicProfile: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    user: { select: { name: true } },
    specialtyAssignments: { select: { specialty: { select: { id: true, name: true } } } },
    _count: { select: { serviceProfessionals: true, professionalLocations: true } },
    // internalNotes / customData / phone are excluded from the list payload.
  } satisfies Prisma.ProfessionalSelect;

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.professional.findMany({ where, orderBy, select, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.professional.count({ where }),
    prisma.professional.count({ where: { tenantId } }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      title: r.title,
      avatarUrl: r.avatarUrl,
      email: r.email,
      whatsapp: r.whatsapp,
      status: r.status,
      publicProfile: r.publicProfile,
      userName: r.user?.name ?? null,
      hasUser: r.userId !== null,
      specialties: r.specialtyAssignments.map((a) => a.specialty),
      servicesCount: r._count.serviceProfessionals,
      locationsCount: r._count.professionalLocations,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    filtered,
    total,
    page,
    pageSize,
  };
}

export type ProfessionalListRow = Awaited<ReturnType<typeof listProfessionals>>["rows"][number];

/** Specialties of a tenant with their professional counts (for the combobox). */
export async function listProfessionalSpecialties(tenantId: string) {
  const rows = await prisma.professionalSpecialty.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      _count: { select: { assignments: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    status: r.status,
    professionalCount: r._count.assignments,
  }));
}

export type SpecialtyRow = Awaited<ReturnType<typeof listProfessionalSpecialties>>[number];

/** All services of a tenant (id+name) for the link multi-select. */
export async function listServiceOptions(tenantId: string) {
  return prisma.service.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Active tenant members (User) for the optional user link combobox. */
export async function listTenantMembers(tenantId: string) {
  const members = await prisma.tenantUser.findMany({
    where: { tenantId, status: "active" },
    orderBy: { user: { name: "asc" } },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  return members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }));
}

/** Full professional for the edit drawer — scoped to the tenant. */
export async function getProfessional(tenantId: string, professionalId: string) {
  const p = await prisma.professional.findFirst({
    where: { id: professionalId, tenantId }, // tenant-scoped
    include: {
      specialtyAssignments: { select: { specialtyId: true } },
      serviceProfessionals: { select: { serviceId: true } },
      professionalLocations: { select: { locationId: true } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    title: p.title,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    phone: p.phone,
    whatsapp: p.whatsapp,
    email: p.email,
    status: p.status,
    publicProfile: p.publicProfile,
    internalNotes: p.internalNotes,
    customData: (p.customData as Record<string, unknown>) ?? {},
    specialtyIds: p.specialtyAssignments.map((a) => a.specialtyId),
    serviceIds: p.serviceProfessionals.map((s) => s.serviceId),
    locationIds: p.professionalLocations.map((l) => l.locationId),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export type ProfessionalDetail = NonNullable<Awaited<ReturnType<typeof getProfessional>>>;
