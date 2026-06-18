import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZES = [10, 25, 50];
const SORTABLE = new Set(["key", "name", "group", "status", "createdAt"]);
const STATUSES = new Set(["active", "inactive"]);

export type FeatureListParams = {
  q?: string;
  status?: string;
  featureGroup?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

export async function listFeatures(params: FeatureListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 10) ? (params.pageSize ?? 10) : 10;

  const where: Prisma.FeatureWhereInput = {};
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { key: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.status && STATUSES.has(params.status)) {
    where.status = params.status as "active" | "inactive";
  }
  if (params.featureGroup) where.group = params.featureGroup;

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.FeatureOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { createdAt: "desc" };

  const [rows, filtered, total, groups] = await prisma.$transaction([
    prisma.feature.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        group: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.feature.count({ where }),
    prisma.feature.count(),
    prisma.feature.findMany({
      where: { group: { not: null } },
      select: { group: true },
      distinct: ["group"],
      orderBy: { group: "asc" },
    }),
  ]);

  return {
    rows,
    filtered,
    total,
    page,
    pageSize,
    groups: groups.map((g) => g.group).filter((g): g is string => g !== null),
  };
}

export type FeatureListRow = Awaited<ReturnType<typeof listFeatures>>["rows"][number];
