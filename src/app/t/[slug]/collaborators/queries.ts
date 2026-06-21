import "server-only";

import { prisma } from "@/lib/prisma";

/** Active-or-selected roles of a tenant with member counts (manage combobox). */
export async function listCollaboratorRoles(tenantId: string) {
  const roles = await prisma.collaboratorRole.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, status: true, _count: { select: { collaborators: true } } },
  });
  return roles.map((r) => ({ id: r.id, name: r.name, slug: r.slug, status: r.status, memberCount: r._count.collaborators }));
}

export async function listCollaboratorDepartments(tenantId: string) {
  const deps = await prisma.collaboratorDepartment.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, status: true, _count: { select: { collaborators: true } } },
  });
  return deps.map((d) => ({ id: d.id, name: d.name, slug: d.slug, status: d.status, memberCount: d._count.collaborators }));
}

export type CollaboratorEntityRow = Awaited<ReturnType<typeof listCollaboratorRoles>>[number];

/** Active professionals of the tenant — for the "link professional" combobox. */
export async function listTenantProfessionals(tenantId: string) {
  return prisma.professional.findMany({
    where: { tenantId, status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export type TenantProfessionalRow = Awaited<ReturnType<typeof listTenantProfessionals>>[number];

/** Full collaborator for the edit drawer / detail — scoped to the tenant. */
export async function getCollaborator(tenantId: string, collaboratorId: string) {
  const c = await prisma.collaborator.findFirst({ where: { id: collaboratorId, tenantId } }); // tenant-scoped
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    avatarUrl: c.avatarUrl,
    phone: c.phone,
    whatsapp: c.whatsapp,
    email: c.email,
    document: c.document,
    status: c.status,
    roleId: c.roleId,
    departmentId: c.departmentId,
    hasSystemAccess: c.hasSystemAccess,
    tenantRole: c.tenantRole,
    isServiceProfessional: c.isServiceProfessional,
    professionalId: c.professionalId,
    internalNotes: c.internalNotes,
    customData: (c.customData as Record<string, unknown>) ?? {},
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export type CollaboratorDetail = NonNullable<Awaited<ReturnType<typeof getCollaborator>>>;
