"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { renderItem, type RenderCtx } from "@/components/nav/nav-render";
import {
  filterNodes,
  hasActiveDescendant,
  isGroup,
  resolveActiveId,
  resolveHref,
  type NavContext,
  type NavItem,
  type NavNode,
} from "@/components/nav/nav-types";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { SidebarHeader } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** Flattens the visible tree (groups → items → children) for dock id lookup. */
function flattenItems(nodes: NavNode[]): NavItem[] {
  const out: NavItem[] = [];
  const walk = (item: NavItem) => {
    out.push(item);
    item.children?.forEach(walk);
  };
  for (const node of nodes) {
    if (isGroup(node)) node.items.forEach(walk);
    else walk(node);
  }
  return out;
}

/**
 * Fluuy Design System — MobileNav.
 * The phone-sized counterpart to the desktop `Sidebar`: a floating glass dock
 * (main-route shortcuts + a visually distinct hamburger) plus a full-screen
 * drawer that renders the same data-driven menu. Hide the desktop sidebar and
 * render this with `className="md:hidden"` below the `md` breakpoint.
 *
 * Visibility rules (role/feature/admin) and active state derive exactly like
 * the sidebar: filtered nodes + the current pathname.
 */
export function MobileNav({
  nodes,
  context,
  header,
  tenantSlug,
  unseenCounts = {},
  dockIds = ["dashboard", "conversations", "appointments", "orders"],
  className,
}: {
  nodes: NavNode[];
  context: NavContext;
  header: SidebarHeader;
  tenantSlug?: string;
  unseenCounts?: Record<string, number>;
  /** Item ids surfaced as dock shortcuts, in order. Hidden ids are skipped. */
  dockIds?: string[];
  className?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});
  const [counts, setCounts] = React.useState<Record<string, number>>(() => ({ ...unseenCounts }));

  const visibleNodes = React.useMemo(() => filterNodes(nodes, context), [nodes, context]);
  const activeId = resolveActiveId(visibleNodes, pathname, tenantSlug);

  const clearCount = React.useCallback(
    (id: string) => setCounts((c) => (c[id] ? { ...c, [id]: 0 } : c)),
    []
  );

  // Dock shortcuts resolve to visible items only; a parent shortcut links to
  // its first child route (mirrors the collapsed-sidebar behavior).
  const dockItems = React.useMemo(() => {
    const flat = flattenItems(visibleNodes);
    return dockIds
      .map((id) => flat.find((it) => it.id === id))
      .filter((it): it is NavItem => Boolean(it));
  }, [visibleNodes, dockIds]);

  const ctx: RenderCtx = {
    collapsed: false,
    activeId,
    tenantSlug,
    counts,
    clearCount,
    openMap,
    toggleOpen: (id, fallback) => setOpenMap((m) => ({ ...m, [id]: !(m[id] ?? fallback) })),
    onNavigate: () => setOpen(false),
  };

  const defaultLogo = (
    <span className="grid size-[30px] shrink-0 place-items-center rounded-[7px] bg-accent text-sm font-bold text-accent-foreground">
      {header.name[0]?.toUpperCase() ?? "F"}
    </span>
  );

  return (
    <>
      {/* Floating dock — centered at the bottom, max 85% wide */}
      <div className={cn("fixed inset-x-0 bottom-4 z-40 flex justify-center px-4", className)}>
        <nav
          aria-label="Atalhos de navegação"
          className="glass-dock flex max-w-[85%] items-center gap-1 rounded-full p-1.5"
        >
          {dockItems.map((item) => {
            const href =
              resolveHref(item.href, tenantSlug) ??
              resolveHref(item.children?.[0]?.href, tenantSlug) ??
              "#";
            const active = activeId === item.id || hasActiveDescendant(item, activeId);
            const count = item.badge ? (counts[item.id] ?? 0) : 0;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                title={item.label}
                onClick={() => item.badge && clearCount(item.id)}
                className={cn(
                  "relative grid size-11 place-items-center rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-5" />
                {count > 0 && (
                  <span
                    aria-hidden
                    className="absolute top-[7px] right-[7px] size-[7px] rounded-full border-[1.5px] border-card bg-(--lime-500)"
                  />
                )}
              </Link>
            );
          })}
          {/* Hamburger — visually distinct: divider + dark fill, lime icon */}
          <span aria-hidden className="mx-0.5 h-[26px] w-px bg-(--glass-border)" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-(--neutral-900) text-accent outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Menu className="size-5" />
          </button>
        </nav>
      </div>

      {/* Full-screen drawer with the complete menu (Sheet = focus trap, Esc, restore) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="glass-drawer w-full max-w-none gap-0 border-(--glass-border) p-0 sm:max-w-none"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex items-center gap-2.5 border-b border-(--glass-border) px-4 pt-4 pb-3 select-none">
            {header.logo ?? defaultLogo}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold tracking-tight">{header.name}</div>
              {header.sub && (
                <div className="truncate text-[10px] font-medium text-muted-foreground">{header.sub}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="grid size-[34px] shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-[18px]" />
            </button>
          </div>
          <nav
            aria-label="Navegação principal"
            className="flex flex-1 flex-col gap-px overflow-y-auto p-2"
          >
            {visibleNodes.map((node) => {
              if (isGroup(node)) {
                return (
                  <div key={node.id} className="flex flex-col gap-px">
                    <div className="px-2.5 pt-3 pb-1 text-[10px] font-bold tracking-[0.07em] text-muted-foreground uppercase">
                      {node.label}
                    </div>
                    {node.items.map((item) => renderItem(item, ctx))}
                  </div>
                );
              }
              return renderItem(node, ctx);
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
