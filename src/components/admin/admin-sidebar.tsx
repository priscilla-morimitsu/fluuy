"use client";

import { platformAdminMenu } from "@/components/nav/nav-data";
import { Sidebar } from "@/components/ui/sidebar";

/**
 * Platform-admin sidebar: renders the data-driven Sidebar with the platform
 * menu, plus the ⌘K command launcher in the header slot.
 */
export function AdminSidebar() {
  return (
    <Sidebar
      className="sticky top-[76px] hidden h-[calc(100vh-92px)] md:flex"
      storageKey="fluuy:admin-sidebar:pinned"
      context={{ isPlatformAdmin: true }}
      nodes={platformAdminMenu}
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
