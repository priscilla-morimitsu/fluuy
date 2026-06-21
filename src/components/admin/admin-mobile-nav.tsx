"use client";

import { platformAdminMenu } from "@/components/nav/nav-data";
import { MobileNav } from "@/components/ui/mobile-nav";

/**
 * Platform-admin mobile navigation: the dock + full-screen drawer shown below
 * the `md` breakpoint (the desktop `AdminSidebar` is hidden there). Same data,
 * visibility and active-state rules as the sidebar.
 */
export function AdminMobileNav() {
  return (
    <MobileNav
      className="md:hidden"
      context={{ isPlatformAdmin: true }}
      nodes={platformAdminMenu}
      dockIds={["admin_dashboard", "admin_tenants", "admin_leads", "admin_settings"]}
      header={{
        name: "Fluuy",
        sub: "Platform Admin",
        logo: (
          <span className="grid size-[30px] shrink-0 place-items-center rounded-[7px] bg-accent text-sm font-bold text-accent-foreground">
            F
          </span>
        ),
      }}
    />
  );
}
