import "server-only";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TenantUserRole } from "@/generated/prisma/client";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Per the multi-tenant rule: every mutating server action/route re-checks
 * role server-side, never trusting the UI to have hidden a button.
 */
export async function requirePlatformAdmin() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  if (!session.user.isPlatformAdmin) throw new ForbiddenError("Platform admin only.");
  return session.user;
}

export async function requireUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new UnauthorizedError();
  return { ...session.user, id };
}

/**
 * Resolves the caller's role for a given tenant from tenant_users — never
 * from client input. Throws if the user has no active membership, or if the
 * membership's role isn't in `allowedRoles` (when provided).
 */
export async function requireTenantRole(tenantId: string, allowedRoles?: TenantUserRole[]) {
  const user = await requireUser();
  if (user.isPlatformAdmin) return { userId: user.id, role: "tenant_owner" as TenantUserRole };

  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId: user.id } },
  });

  if (!membership || membership.status !== "active") {
    throw new ForbiddenError("No active membership for this tenant.");
  }
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new ForbiddenError(`Requires one of: ${allowedRoles.join(", ")}.`);
  }
  return { userId: user.id, role: membership.role };
}
