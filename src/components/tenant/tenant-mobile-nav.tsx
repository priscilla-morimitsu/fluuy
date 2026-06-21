"use client";

import { tenantMenu } from "@/components/nav/nav-data";
import type { TenantRole } from "@/components/nav/nav-types";
import { MobileNav } from "@/components/ui/mobile-nav";

/**
 * Tenant mobile navigation: dock + full-screen drawer shown below `md` (the
 * desktop TenantSidebar is hidden there). Same data, role and feature gating.
 */
export function TenantMobileNav({
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
    <MobileNav
      className="md:hidden"
      context={{ isPlatformAdmin: false, role, features }}
      tenantSlug={slug}
      nodes={tenantMenu}
      dockIds={["dashboard", "conversations", "customers", "settings"]}
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
