"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import {
  hasActiveDescendant,
  resolveHref,
  type NavItem,
} from "@/components/nav/nav-types";
import { cn } from "@/lib/utils";

/**
 * Shared rendering primitives for the Fluuy navigation menu, used by both the
 * desktop `Sidebar` and the mobile `MobileNav` drawer so the data-driven tree
 * (leaves, accordion submenus, badges) renders identically in either surface.
 */
export type RenderCtx = {
  /** Collapsed = icon-only (desktop, no hover/unpinned). The drawer is never collapsed. */
  collapsed: boolean;
  activeId: string | null;
  tenantSlug?: string;
  counts: Record<string, number>;
  clearCount: (id: string) => void;
  openMap: Record<string, boolean>;
  toggleOpen: (id: string, fallback: boolean) => void;
  /** Fired after a leaf navigation — the mobile drawer uses it to close itself. */
  onNavigate?: () => void;
};

export const rowBase =
  "group/row relative flex min-h-9 items-center rounded-md text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Inactive-item hover. The spec calls for `--neutral-100` (a subtle gray
 * visible on the light glass), explicitly NOT `--glass-bg-hover` (white
 * translucent). `--neutral-100` isn't a token here; `bg-muted` (oklch 0.96) is
 * its faithful equivalent.
 */
const hoverInactive = "hover:bg-muted";

/* ── Count badge: pill when expanded, corner dot when collapsed ── */
function CountBadge({
  count,
  collapsed,
  active,
}: {
  count: number;
  collapsed: boolean;
  active: boolean;
}) {
  if (count <= 0) return null;
  if (collapsed) {
    return (
      <span
        aria-hidden
        className={cn(
          "absolute top-1 right-1 size-[7px] rounded-full border-[1.5px] border-card",
          active ? "bg-(--lime-500)" : "bg-accent"
        )}
      />
    );
  }
  return (
    <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-(--lime-200) px-[5px] text-[10px] font-semibold text-(--neutral-800)">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ── Leaf item ── */
function Leaf({ item, ctx, child = false }: { item: NavItem; ctx: RenderCtx; child?: boolean }) {
  const href = resolveHref(item.href, ctx.tenantSlug) ?? "#";
  const active = ctx.activeId === item.id;
  const count = item.badge ? (ctx.counts[item.id] ?? 0) : 0;
  const Icon = item.icon;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={ctx.collapsed ? item.label : undefined}
      onClick={() => {
        if (item.badge) ctx.clearCount(item.id);
        ctx.onNavigate?.();
      }}
      className={cn(
        rowBase,
        ctx.collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
        active ? "bg-accent font-medium text-accent-foreground" : cn("text-foreground", hoverInactive),
        child && !ctx.collapsed && "pl-[30px]"
      )}
    >
      <Icon className={cn("shrink-0", child ? "size-[15px]" : "size-[18px]")} />
      {!ctx.collapsed && <span className="truncate">{item.label}</span>}
      {!ctx.collapsed && <CountBadge count={count} collapsed={false} active={active} />}
      {ctx.collapsed && <CountBadge count={count} collapsed active={active} />}
    </Link>
  );
}

/* ── Parent item (accordion submenu) ── */
function Parent({ item, ctx }: { item: NavItem; ctx: RenderCtx }) {
  const Icon = item.icon;
  const childActive = hasActiveDescendant(item, ctx.activeId);
  const children = item.children ?? [];

  // Collapsed: a single icon that links to the first child's route.
  if (ctx.collapsed) {
    const firstHref = resolveHref(children[0]?.href, ctx.tenantSlug) ?? "#";
    return (
      <Link
        href={firstHref}
        title={item.label}
        onClick={() => ctx.onNavigate?.()}
        className={cn(
          rowBase,
          "justify-center px-0",
          childActive ? "font-medium text-foreground" : cn("text-foreground", hoverInactive)
        )}
      >
        <Icon className="size-[18px] shrink-0" />
      </Link>
    );
  }

  const open = ctx.openMap[item.id] ?? childActive;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => ctx.toggleOpen(item.id, childActive)}
        className={cn(
          rowBase,
          "w-full gap-2.5 px-2.5",
          childActive ? "font-medium text-foreground" : cn("text-foreground", hoverInactive)
        )}
      >
        <Icon className="size-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
        <ChevronRight
          className={cn(
            "ml-auto size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
      </button>
      {open && (
        <div className="mt-px flex flex-col gap-px">
          {children.map((c) => (
            <Leaf key={c.id} item={c} ctx={ctx} child />
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders a single nav item — a submenu parent or a leaf link. */
export function renderItem(item: NavItem, ctx: RenderCtx) {
  return item.children && item.children.length > 0 ? (
    <Parent key={item.id} item={item} ctx={ctx} />
  ) : (
    <Leaf key={item.id} item={item} ctx={ctx} />
  );
}
