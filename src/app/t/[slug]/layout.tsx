import { notFound } from "next/navigation";

import type { TenantRole } from "@/components/nav/nav-types";
import { TenantMobileNav } from "@/components/tenant/tenant-mobile-nav";
import { TenantSidebar } from "@/components/tenant/tenant-sidebar";
import { TenantTopbar } from "@/components/tenant/tenant-topbar";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireTenantRole, UnauthorizedError } from "@/lib/rbac";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug }, include: { niche: true } });
  if (!tenant) notFound();

  // Defense in depth: actions re-check this themselves (see rbac.ts). 404
  // instead of a 403/500 here so the route doesn't leak which slugs exist
  // to users who aren't members of that tenant.
  let role: TenantRole;
  try {
    role = (await requireTenantRole(tenant.id)).role;
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }

  const session = await auth();
  const email = session?.user?.email ?? undefined;

  // Enabled features → { [key]: true }, gates the sidebar modules.
  const tenantFeatures = await prisma.tenantFeature.findMany({
    where: { tenantId: tenant.id, enabled: true },
    include: { feature: { select: { key: true } } },
  });
  const features = Object.fromEntries(tenantFeatures.map((tf) => [tf.feature.key, true]));

  const initials = tenant.name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="gradient-bg flex min-h-screen flex-col">
      <TenantTopbar
        brand={tenant.name}
        user={{ name: session?.user?.name ?? email ?? "Usuário", email }}
        logoutAction={logout}
      />
      <div className="flex flex-1 gap-4 p-4">
        <TenantSidebar
          slug={slug}
          role={role}
          features={features}
          name={tenant.name}
          sub={tenant.niche.name}
          initials={initials}
        />
        <main className="min-w-0 flex-1 pt-2 pb-28 md:pb-2">{children}</main>
      </div>
      <TenantMobileNav
        slug={slug}
        role={role}
        features={features}
        name={tenant.name}
        sub={tenant.niche.name}
        initials={initials}
      />
    </div>
  );
}
