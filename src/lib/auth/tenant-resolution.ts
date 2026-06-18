import "server-only";

import { prisma } from "@/lib/prisma";

export type TenantResolution =
  | { kind: "none" }
  | { kind: "single"; tenantId: string }
  | { kind: "multiple"; tenantIds: string[] };

/**
 * Resolves which tenant(s) a freshly-authenticated user can access: platform
 * admins bypass tenant membership entirely (kind "none" — they never need a
 * selectedTenantId), everyone else needs an active tenant_user row pointing
 * at an active tenant.
 */
export async function resolveTenantsForUser(userId: string, isPlatformAdmin: boolean): Promise<TenantResolution> {
  if (isPlatformAdmin) return { kind: "none" };

  const memberships = await prisma.tenantUser.findMany({
    where: { userId, status: "active", tenant: { status: { in: ["active", "trial"] } } },
    select: { tenantId: true },
  });

  if (memberships.length === 0) return { kind: "none" };
  if (memberships.length === 1) return { kind: "single", tenantId: memberships[0].tenantId };
  return { kind: "multiple", tenantIds: memberships.map((m) => m.tenantId) };
}

/** Re-validates that `userId` still has an active membership in `tenantId`. */
export async function userHasActiveTenantMembership(userId: string, tenantId: string): Promise<boolean> {
  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  return Boolean(membership && membership.status === "active");
}
