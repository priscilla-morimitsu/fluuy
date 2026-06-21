import "server-only";

import type { TenantUserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireTenantRole } from "@/lib/rbac";

/**
 * Resolves a tenant by slug and enforces, server-side: active membership +
 * role (via rbac), and an optional enabled feature flag. The tenantId is taken
 * from the resolved tenant — never from client input. Throws ForbiddenError on
 * any failure so callers map it to a safe, generic response.
 */
export async function resolveTenantContext(
  slug: string,
  opts?: { roles?: TenantUserRole[]; feature?: string },
) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, nicheId: true, slug: true, name: true },
  });
  if (!tenant) throw new ForbiddenError("Empresa não encontrada.");

  const { userId, role } = await requireTenantRole(tenant.id, opts?.roles);

  if (opts?.feature) {
    const feature = await prisma.tenantFeature.findFirst({
      where: { tenantId: tenant.id, enabled: true, feature: { key: opts.feature } },
      select: { id: true },
    });
    if (!feature) throw new ForbiddenError("Recurso indisponível para esta empresa.");
  }

  return { tenant, userId, role };
}
