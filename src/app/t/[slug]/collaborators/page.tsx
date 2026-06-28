import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { templateFieldSchema, templateLayoutSchema } from "@/lib/validations/template";

import CollaboratorsClient from "./collaborators-client";
import { listCollaborators } from "./data";
import { listCollaboratorDepartments, listCollaboratorRoles, listTenantProfessionals } from "./queries";

export default async function CollaboratorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const num = (v: string | string[] | undefined) => {
    const n = Number(str(v));
    return Number.isFinite(n) ? n : undefined;
  };

  // Feature gate + role enforced server-side — hiding the menu is not enough.
  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "collaborator_management" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;

  const [list, roles, departments, professionals, template] = await Promise.all([
    listCollaborators(tenant.id, {
      q: str(sp.q),
      status: str(sp.status),
      roleId: str(sp.roleId),
      departmentId: str(sp.departmentId),
      sortBy: str(sp.sortBy),
      sortDir: str(sp.sortDir),
      page: num(sp.page),
      pageSize: num(sp.pageSize),
    }),
    listCollaboratorRoles(tenant.id),
    listCollaboratorDepartments(tenant.id),
    listTenantProfessionals(tenant.id),
    prisma.template.findFirst({
      where: { nicheId: tenant.nicheId, entityType: "collaborator", status: "active" },
      orderBy: { version: "desc" },
      select: { fields: true, config: true },
    }),
  ]);

  const parsedFields = templateFieldSchema.array().safeParse(template?.fields ?? []);
  const parsedLayout = templateLayoutSchema.safeParse((template?.config as { layout?: unknown } | null)?.layout);

  return (
    <CollaboratorsClient
      slug={slug}
      role={role}
      rows={list.rows}
      filtered={list.filtered}
      total={list.total}
      roles={roles}
      departments={departments}
      professionals={professionals}
      templateFields={parsedFields.success ? parsedFields.data : []}
      templateLayout={parsedLayout.success ? parsedLayout.data : undefined}
    />
  );
}
