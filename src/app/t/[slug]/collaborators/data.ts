import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { COLLABORATOR_SORTABLE, collaboratorStatusSchema } from "@/lib/validations/collaborator";

const PAGE_SIZES = [10, 20, 50, 100];
const SORTABLE = new Set<string>(COLLABORATOR_SORTABLE);

export type CollaboratorListParams = {
  q?: string;
  status?: string;
  roleId?: string;
  departmentId?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

/** Tenant-scoped, filtered, sorted, paginated collaborator list for the table. */
export async function listCollaborators(tenantId: string, params: CollaboratorListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 20) ? (params.pageSize ?? 20) : 20;

  const where: Prisma.CollaboratorWhereInput = { tenantId };
  if (params.q) {
    const digits = params.q.replace(/\D/g, "");
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { role: { name: { contains: params.q, mode: "insensitive" } } },
      { department: { name: { contains: params.q, mode: "insensitive" } } },
      ...(digits
        ? [
            { phoneNormalized: { contains: digits } },
            { whatsappNormalized: { contains: digits } },
            { documentNormalized: { contains: digits } },
          ]
        : []),
    ];
  }
  if (params.roleId) where.roleId = params.roleId;
  if (params.departmentId) where.departmentId = params.departmentId;
  const status = collaboratorStatusSchema.safeParse(params.status);
  if (status.success) where.status = status.data;

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.CollaboratorOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { name: "asc" };

  const select = {
    id: true,
    name: true,
    avatarUrl: true,
    email: true,
    whatsapp: true,
    status: true,
    hasSystemAccess: true,
    tenantRole: true,
    isServiceProfessional: true,
    updatedAt: true,
    role: { select: { id: true, name: true } },
    department: { select: { id: true, name: true } },
    // document/internalNotes/customData are deliberately excluded (LGPD).
  } satisfies Prisma.CollaboratorSelect;

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.collaborator.findMany({ where, orderBy, select, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.collaborator.count({ where }),
    prisma.collaborator.count({ where: { tenantId } }),
  ]);

  return { rows, filtered, total, page, pageSize };
}

export type CollaboratorListRow = Awaited<ReturnType<typeof listCollaborators>>["rows"][number];
