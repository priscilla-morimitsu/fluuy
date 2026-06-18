import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZES = [10, 25, 50];
const SORTABLE = new Set(["key", "name", "price", "billingPeriod", "status", "createdAt"]);
const STATUSES = new Set(["active", "inactive"]);
const PERIODS = new Set(["monthly", "yearly"]);

export type BillingPlanListParams = {
  q?: string;
  status?: string;
  billingPeriod?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

export type BillingPlanListRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: string;
  billingPeriod: string;
  status: string;
  createdAt: Date;
  featureIds: string[];
  featureNames: string[];
};

export async function listBillingPlans(params: BillingPlanListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 10) ? (params.pageSize ?? 10) : 10;

  const where: Prisma.BillingPlanWhereInput = {};
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { key: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.status && STATUSES.has(params.status)) {
    where.status = params.status as "active" | "inactive";
  }
  if (params.billingPeriod && PERIODS.has(params.billingPeriod)) {
    where.billingPeriod = params.billingPeriod as "monthly" | "yearly";
  }

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.BillingPlanOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { createdAt: "desc" };

  const [plans, filtered, total] = await prisma.$transaction([
    prisma.billingPlan.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        price: true,
        billingPeriod: true,
        status: true,
        createdAt: true,
        planFeatures: { select: { feature: { select: { id: true, name: true } } } },
      },
    }),
    prisma.billingPlan.count({ where }),
    prisma.billingPlan.count(),
  ]);

  // Decimal and relations aren't directly serializable to client components.
  const rows: BillingPlanListRow[] = plans.map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description,
    price: p.price.toString(),
    billingPeriod: p.billingPeriod,
    status: p.status,
    createdAt: p.createdAt,
    featureIds: p.planFeatures.map((pf) => pf.feature.id),
    featureNames: p.planFeatures.map((pf) => pf.feature.name),
  }));

  return { rows, filtered, total, page, pageSize };
}
