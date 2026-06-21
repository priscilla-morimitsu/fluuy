"use client";

import { tenantMenu } from "@/components/nav/nav-data";
import type { TenantRole } from "@/components/nav/nav-types";
import { Sidebar } from "@/components/ui/sidebar";

/**
 * Tenant workspace sidebar: the data-driven Sidebar fed the tenant menu, gated
 * by the user's role and the tenant's enabled features. Routes use the
 * `/t/[slug]` prefix.
 */
export function TenantSidebar({
  slug,
  role,
  features,
  name,
  sub,
  initials,
}: {
  slug: string;
  role: TenantRole;
  features: Record<string, boolean>;
  name: string;
  sub?: string;
  initials: string;
}) {
  return (
    <Sidebar
      className="sticky top-[76px] hidden h-[calc(100vh-92px)] md:flex"
      storageKey="fluuy:tenant-sidebar:pinned"
      context={{ isPlatformAdmin: false, role, features }}
      tenantSlug={slug}
      nodes={tenantMenu}
      header={{
        name,
        sub,
        logo: (
          <span className="grid size-[30px] shrink-0 place-items-center rounded-[7px] bg-accent text-sm font-bold text-accent-foreground">
            {initials}
          </span>
        ),
      }}
    />
  );
}
