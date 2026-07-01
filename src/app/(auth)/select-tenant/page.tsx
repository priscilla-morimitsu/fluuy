import { redirect } from "next/navigation";

import { resolveTenantsForUser } from "@/lib/auth/tenant-resolution";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

import SelectTenantForm from "./select-tenant-form";

export default async function SelectTenantPage() {
  const user = await requireUser();
  const resolution = await resolveTenantsForUser(user.id, user.isPlatformAdmin ?? false);

  if (resolution.kind !== "multiple") redirect("/home");

  const tenants = await prisma.tenant.findMany({
    where: { id: { in: resolution.tenantIds } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg px-4">
      <SelectTenantForm tenants={tenants} />
    </div>
  );
}
