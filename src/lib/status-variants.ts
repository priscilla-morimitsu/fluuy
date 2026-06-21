import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * Maps a tenant lifecycle status to a Fluuy Design System badge variant.
 * active → success (green), trial → brand (lime), suspended → warning,
 * blocked → destructive. Keeps status colour semantics consistent across the
 * admin tables and the tenant detail screen.
 */
export function tenantStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "active":
      return "success";
    case "trial":
      return "brand";
    case "suspended":
      return "warning";
    case "blocked":
      return "destructive";
    default:
      return "secondary";
  }
}
