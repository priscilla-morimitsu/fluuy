import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZES = [10, 25, 50];
const SORTABLE = new Set(["key", "name", "status", "createdAt"]);
const STATUSES = new Set(["active", "inactive"]);

export type NicheListParams = {
  q?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

export async function listNiches(params: NicheListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 10) ? (params.pageSize ?? 10) : 10;

  const where: Prisma.NicheWhereInput = {};
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { key: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.status && STATUSES.has(params.status)) {
    where.status = params.status as "active" | "inactive";
  }

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.NicheOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { createdAt: "desc" };

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.niche.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        customerLabel: true,
        entityLabel: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.niche.count({ where }),
    prisma.niche.count(),
  ]);

  return { rows, filtered, total, page, pageSize };
}

export type NicheListRow = Awaited<ReturnType<typeof listNiches>>["rows"][number];
