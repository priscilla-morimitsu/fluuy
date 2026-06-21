import type { LucideIcon } from "lucide-react";

export type NavScope = "tenant" | "platform";
export type TenantRole =
  | "tenant_owner"
  | "tenant_manager"
  | "tenant_operator"
  | "tenant_viewer";

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  scope?: NavScope;
  /** Hide the item unless this feature is enabled for the tenant. */
  featureKey?: string;
  /** Show only when the user's role is in the list. */
  allowedRoles?: TenantRole[];
  /** Show only for platform admins. */
  platformAdminOnly?: boolean;
  /** Whether the item displays an unseen-count badge. */
  badge?: boolean;
  children?: NavItem[];
};

export type NavGroup = {
  id: string;
  type: "group";
  label: string;
  items: NavItem[];
};

export type NavNode = NavGroup | NavItem;

export type NavContext = {
  isPlatformAdmin: boolean;
  role?: TenantRole;
  features?: Record<string, boolean>;
};

export function isGroup(node: NavNode): node is NavGroup {
  return (node as NavGroup).type === "group";
}

function itemVisible(item: NavItem, ctx: NavContext): boolean {
  if (item.platformAdminOnly && !ctx.isPlatformAdmin) return false;
  if (item.allowedRoles && (!ctx.role || !item.allowedRoles.includes(ctx.role)))
    return false;
  if (item.featureKey && ctx.features?.[item.featureKey] !== true) return false;
  return true;
}

/** Returns the item with visible children, or null when it should be hidden. */
function filterItem(item: NavItem, ctx: NavContext): NavItem | null {
  if (!itemVisible(item, ctx)) return null;
  if (item.children) {
    const children = item.children
      .map((c) => filterItem(c, ctx))
      .filter((c): c is NavItem => c !== null);
    // A parent with no surviving children and no route of its own is dropped.
    if (children.length === 0 && !item.href) return null;
    return { ...item, children };
  }
  return item;
}

/**
 * Applies the spec's visibility rules (platformAdminOnly, allowedRoles,
 * featureKey) and drops empty groups. Run before rendering.
 */
export function filterNodes(nodes: NavNode[], ctx: NavContext): NavNode[] {
  const out: NavNode[] = [];
  for (const node of nodes) {
    if (isGroup(node)) {
      const items = node.items
        .map((i) => filterItem(i, ctx))
        .filter((i): i is NavItem => i !== null);
      if (items.length > 0) out.push({ ...node, items });
    } else {
      const item = filterItem(node, ctx);
      if (item) out.push(item);
    }
  }
  return out;
}

/** Resolves `[tenantSlug]` placeholders in an href. */
export function resolveHref(href: string | undefined, tenantSlug?: string) {
  if (!href) return undefined;
  return tenantSlug ? href.replace("[tenantSlug]", tenantSlug) : href;
}

/**
 * Picks the active item id: the one whose resolved href is the longest path
 * prefix of the current pathname (so /admin never wins over /admin/tenants).
 */
export function resolveActiveId(
  nodes: NavNode[],
  pathname: string,
  tenantSlug?: string
): string | null {
  let bestId: string | null = null;
  let bestLen = -1;

  const visit = (item: NavItem) => {
    const href = resolveHref(item.href, tenantSlug);
    if (href) {
      const matches = pathname === href || pathname.startsWith(`${href}/`);
      if (matches && href.length > bestLen) {
        bestLen = href.length;
        bestId = item.id;
      }
    }
    item.children?.forEach(visit);
  };

  for (const node of nodes) {
    if (isGroup(node)) node.items.forEach(visit);
    else visit(node);
  }
  return bestId;
}

/** True when the item or any descendant is the active id. */
export function hasActiveDescendant(item: NavItem, activeId: string | null): boolean {
  if (!activeId) return false;
  if (item.id === activeId) return true;
  return item.children?.some((c) => hasActiveDescendant(c, activeId)) ?? false;
}
