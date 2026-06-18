import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { TENANT_STATUSES, tenantStatusSchema } from "@/lib/validations/tenant";

const PAGE_SIZES = [10, 25, 50];
// Whitelist of sortable columns — never interpolate a raw sortBy into Prisma.
const SORTABLE = new Set(["name", "slug", "status", "createdAt"]);

export type TenantListParams = {
  q?: string;
  status?: string;
  nicheId?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

export async function listTenants(params: TenantListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 10) ? (params.pageSize ?? 10) : 10;

  const where: Prisma.TenantWhereInput = {};
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { slug: { contains: params.q, mode: "insensitive" } },
    ];
  }
  const status = tenantStatusSchema.safeParse(params.status);
  if (status.success) where.status = status.data;
  if (params.nicheId) where.nicheId = params.nicheId;

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.TenantOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy)
      ? { [params.sortBy]: dir }
      : { createdAt: "desc" };

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.tenant.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      // Only the columns the table + edit drawer need (no whole-record dump).
      select: {
        id: true,
        nicheId: true,
        name: true,
        slug: true,
        legalName: true,
        document: true,
        description: true,
        publicPhone: true,
        publicEmail: true,
        notificationPhone: true,
        hasProducts: true,
        hasServices: true,
        hasPlans: true,
        hasDelivery: true,
        hasPickup: true,
        acceptsOnlinePayment: true,
        status: true,
        createdAt: true,
        niche: { select: { name: true } },
      },
    }),
    prisma.tenant.count({ where }),
    prisma.tenant.count(),
  ]);

  return { rows, filtered, total, page, pageSize };
}

export type TenantListRow = Awaited<ReturnType<typeof listTenants>>["rows"][number];
export { TENANT_STATUSES };
