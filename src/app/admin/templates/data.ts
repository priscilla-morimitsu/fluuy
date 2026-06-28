import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { TEMPLATE_ENTITY_TYPES } from "@/lib/validations/template";

const PAGE_SIZES = [10, 25, 50];
const SORTABLE = new Set(["name", "version", "status", "createdAt"]);
const STATUSES = new Set(["draft", "active", "inactive"]);
const ENTITY_TYPES = new Set<string>(TEMPLATE_ENTITY_TYPES);

export type TemplateListParams = {
  q?: string;
  status?: string;
  nicheId?: string;
  entityType?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

export async function listTemplates(params: TemplateListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 10) ? (params.pageSize ?? 10) : 10;

  const where: Prisma.TemplateWhereInput = {};
  if (params.q) where.name = { contains: params.q, mode: "insensitive" };
  if (params.status && STATUSES.has(params.status)) {
    where.status = params.status as "draft" | "active" | "inactive";
  }
  if (params.nicheId) where.nicheId = params.nicheId;
  if (params.entityType && ENTITY_TYPES.has(params.entityType)) {
    where.entityType = params.entityType as Prisma.TemplateWhereInput["entityType"];
  }

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.TemplateOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { createdAt: "desc" };

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.template.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        nicheId: true,
        entityType: true,
        name: true,
        description: true,
        fields: true,
        config: true,
        version: true,
        status: true,
        createdAt: true,
        niche: { select: { name: true } },
      },
    }),
    prisma.template.count({ where }),
    prisma.template.count(),
  ]);

  return { rows, filtered, total, page, pageSize };
}

export type TemplateListRow = Awaited<ReturnType<typeof listTemplates>>["rows"][number];
