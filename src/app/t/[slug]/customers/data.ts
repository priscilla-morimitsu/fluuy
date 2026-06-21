import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { onlyDigits } from "@/lib/masks";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SORTABLE,
  customerPersonTypeSchema,
  customerSourceSchema,
  customerStatusSchema,
} from "@/lib/validations/customer";
import { templateFieldSchema, type TemplateField } from "@/lib/validations/template";

const PAGE_SIZES = [10, 20, 50, 100];
const SORTABLE = new Set<string>(CUSTOMER_SORTABLE);

export type CustomerListParams = {
  q?: string;
  status?: string;
  source?: string;
  personType?: string;
  tagId?: string;
  hasAddress?: string;
  hasConsent?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

/** Active "customer" template fields for a niche (dynamic customData section). */
export async function customerTemplateFields(nicheId: string): Promise<TemplateField[]> {
  const template = await prisma.template.findFirst({
    where: { nicheId, entityType: "customer", status: "active" },
    orderBy: { version: "desc" },
    select: { fields: true },
  });
  const parsed = templateFieldSchema.array().safeParse(template?.fields ?? []);
  return parsed.success ? parsed.data : [];
}

/** Niche labels that drive the dynamic UI wording (Tutor / Paciente / …). */
export async function customerNicheLabels(nicheId: string) {
  const niche = await prisma.niche.findUnique({
    where: { id: nicheId },
    select: { customerLabel: true, entityLabel: true },
  });
  return {
    customerLabel: niche?.customerLabel ?? null,
    entityLabel: niche?.entityLabel ?? null,
  };
}

/** A valid Date or undefined from a "yyyy-MM-dd" search param. */
function parseDate(v: string | undefined, endOfDay = false): Date | undefined {
  if (!v) return undefined;
  const d = new Date(endOfDay ? `${v}T23:59:59.999` : `${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Tenant-scoped, filtered, sorted, paginated customer list for the table. */
export async function listCustomers(tenantId: string, params: CustomerListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 20) ? (params.pageSize ?? 20) : 20;

  const where: Prisma.CustomerWhereInput = { tenantId };

  if (params.q) {
    const term = params.q.trim();
    const digits = onlyDigits(term);
    const or: Prisma.CustomerWhereInput[] = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { tagLinks: { some: { tag: { name: { contains: term, mode: "insensitive" } } } } },
    ];
    if (digits.length >= 3) {
      or.push(
        { phoneNormalized: { contains: digits } },
        { whatsappNormalized: { contains: digits } },
        { documentNormalized: { contains: digits } },
      );
    }
    where.OR = or;
  }

  const status = customerStatusSchema.safeParse(params.status);
  if (status.success) where.status = status.data;
  const source = customerSourceSchema.safeParse(params.source);
  if (source.success) where.source = source.data;
  const personType = customerPersonTypeSchema.safeParse(params.personType);
  if (personType.success) where.personType = personType.data;
  if (params.tagId) where.tagLinks = { some: { tagId: params.tagId } };
  if (params.hasAddress === "true") where.addresses = { some: {} };
  if (params.hasAddress === "false") where.addresses = { none: {} };
  if (params.hasConsent === "true") where.consentAcceptedAt = { not: null };
  if (params.hasConsent === "false") where.consentAcceptedAt = null;

  const createdFrom = parseDate(params.createdFrom);
  const createdTo = parseDate(params.createdTo, true);
  if (createdFrom || createdTo) {
    where.createdAt = { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdTo ? { lte: createdTo } : {}) };
  }
  const updatedFrom = parseDate(params.updatedFrom);
  const updatedTo = parseDate(params.updatedTo, true);
  if (updatedFrom || updatedTo) {
    where.updatedAt = { ...(updatedFrom ? { gte: updatedFrom } : {}), ...(updatedTo ? { lte: updatedTo } : {}) };
  }

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.CustomerOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { createdAt: "desc" };

  const select = {
    id: true,
    name: true,
    phone: true,
    whatsapp: true,
    email: true,
    personType: true,
    status: true,
    source: true,
    consentAcceptedAt: true,
    createdAt: true,
    updatedAt: true,
    // document / documentNormalized / internalNotes / customData are sensitive —
    // never selected for the list (loaded via getCustomer for the edit drawer).
    tagLinks: { select: { tag: { select: { id: true, name: true, color: true } } } },
    addresses: {
      where: { isDefault: true },
      take: 1,
      select: { city: true, state: true, neighborhood: true },
    },
    _count: { select: { addresses: true } },
  } satisfies Prisma.CustomerSelect;

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, orderBy, select, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.customer.count({ where }),
    prisma.customer.count({ where: { tenantId } }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      whatsapp: r.whatsapp,
      email: r.email,
      personType: r.personType,
      status: r.status,
      source: r.source,
      hasConsent: r.consentAcceptedAt != null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      tags: r.tagLinks.map((l) => l.tag),
      defaultAddress: r.addresses[0]
        ? [r.addresses[0].neighborhood, r.addresses[0].city, r.addresses[0].state]
            .filter(Boolean)
            .join(", ")
        : null,
      addressCount: r._count.addresses,
    })),
    filtered,
    total,
    page,
    pageSize,
  };
}

export type CustomerListRow = Awaited<ReturnType<typeof listCustomers>>["rows"][number];

/** Tenant tags with how many customers each is linked to (for the combobox). */
export async function listCustomerTags(tenantId: string) {
  const tags = await prisma.customerTag.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      description: true,
      status: true,
      _count: { select: { assignments: true } },
    },
  });
  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    color: t.color,
    description: t.description,
    status: t.status,
    customerCount: t._count.assignments,
  }));
}

export type CustomerTagRow = Awaited<ReturnType<typeof listCustomerTags>>[number];

/** Full customer for the edit drawer — scoped to the tenant. */
export async function getCustomer(tenantId: string, customerId: string) {
  const c = await prisma.customer.findFirst({
    where: { id: customerId, tenantId }, // tenant-scoped
    include: {
      addresses: { orderBy: { createdAt: "asc" } },
      tagLinks: { select: { tagId: true } },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    whatsapp: c.whatsapp,
    email: c.email,
    personType: c.personType,
    document: c.document,
    birthDate: c.birthDate ? c.birthDate.toISOString().slice(0, 10) : null,
    status: c.status,
    source: c.source,
    consentAcceptedAt: c.consentAcceptedAt ? c.consentAcceptedAt.toISOString().slice(0, 10) : null,
    consentSource: c.consentSource,
    internalNotes: c.internalNotes,
    customData: (c.customData as Record<string, unknown>) ?? {},
    tagIds: c.tagLinks.map((l) => l.tagId),
    addresses: c.addresses.map((a) => ({
      id: a.id,
      type: a.type,
      name: a.name,
      zipCode: a.zipCode,
      street: a.street,
      number: a.number,
      complement: a.complement,
      neighborhood: a.neighborhood,
      city: a.city,
      state: a.state,
      country: a.country,
      reference: a.reference,
      isDefault: a.isDefault,
    })),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export type CustomerDetail = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;

/** Active "customer_entity" template fields for a niche (dynamic customData). */
export async function customerEntityTemplateFields(nicheId: string): Promise<TemplateField[]> {
  const template = await prisma.template.findFirst({
    where: { nicheId, entityType: "customer_entity", status: "active" },
    orderBy: { version: "desc" },
    select: { fields: true },
  });
  const parsed = templateFieldSchema.array().safeParse(template?.fields ?? []);
  return parsed.success ? parsed.data : [];
}

/** Lightweight customer header for the detail page (tenant-scoped). */
export async function getCustomerSummary(tenantId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true, name: true, status: true, phone: true, whatsapp: true, email: true },
  });
}

/** Related entities of a customer (tenant-scoped), for the detail manager. */
export async function listCustomerEntities(tenantId: string, customerId: string) {
  const entities = await prisma.customerEntity.findMany({
    where: { tenantId, customerId },
    orderBy: [{ entityType: "asc" }, { name: "asc" }],
    select: {
      id: true,
      entityType: true,
      name: true,
      status: true,
      customData: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return entities.map((e) => ({
    id: e.id,
    entityType: e.entityType,
    name: e.name,
    status: e.status,
    customData: (e.customData as Record<string, unknown>) ?? {},
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }));
}

export type CustomerEntityRow = Awaited<ReturnType<typeof listCustomerEntities>>[number];
