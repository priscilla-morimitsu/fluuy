"use client";

import { Pin, PinOff } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";

import { renderItem, type RenderCtx } from "@/components/nav/nav-render";
import {
  filterNodes,
  isGroup,
  resolveActiveId,
  type NavContext,
  type NavNode,
} from "@/components/nav/nav-types";
import { cn } from "@/lib/utils";

/* ── Pinned persistence (external store → no effect / no SSR mismatch) ── */
function usePinned(storageKey: string, defaultPinned: boolean): [boolean, (v: boolean) => void] {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      window.addEventListener(storageKey, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(storageKey, cb);
        window.removeEventListener("storage", cb);
      };
    },
    [storageKey]
  );
  const getSnapshot = React.useCallback(() => {
    const v = window.localStorage.getItem(storageKey);
    return v == null ? (defaultPinned ? "1" : "0") : v;
  }, [storageKey, defaultPinned]);
  const getServerSnapshot = React.useCallback(() => (defaultPinned ? "1" : "0"), [defaultPinned]);
  const raw = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setPinned = React.useCallback(
    (v: boolean) => {
      window.localStorage.setItem(storageKey, v ? "1" : "0");
      window.dispatchEvent(new Event(storageKey));
    },
    [storageKey]
  );
  return [raw === "1", setPinned];
}

export type SidebarHeader = {
  logo?: React.ReactNode;
  name: string;
  sub?: string;
};

/**
 * Fluuy Design System — Sidebar.
 * Data-driven glass navigation with pin/collapse, hover-expand, groups,
 * accordion submenus, unseen-count badges (pill / collapsed dot), and
 * role/feature/admin visibility rules. Active item derives from the pathname.
 */
export function Sidebar({
  nodes,
  context,
  header,
  tenantSlug,
  unseenCounts = {},
  storageKey = "fluuy:sidebar:pinned",
  defaultPinned = true,
  className,
}: {
  nodes: NavNode[];
  context: NavContext;
  header: SidebarHeader;
  tenantSlug?: string;
  unseenCounts?: Record<string, number>;
  storageKey?: string;
  defaultPinned?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const [pinned, setPinned] = usePinned(storageKey, defaultPinned);
  const [hover, setHover] = React.useState(false);
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});
  const [counts, setCounts] = React.useState<Record<string, number>>(() => ({ ...unseenCounts }));

  const collapsed = !pinned && !hover;

  const visibleNodes = React.useMemo(() => filterNodes(nodes, context), [nodes, context]);
  const activeId = resolveActiveId(visibleNodes, pathname, tenantSlug);

  const ctx: RenderCtx = {
    collapsed,
    activeId,
    tenantSlug,
    counts,
    clearCount: (id) => setCounts((c) => ({ ...c, [id]: 0 })),
    openMap,
    toggleOpen: (id, fallback) =>
      setOpenMap((m) => ({ ...m, [id]: !(m[id] ?? fallback) })),
  };

  const defaultLogo = (
    <span className="grid size-[30px] shrink-0 place-items-center rounded-[7px] bg-accent text-sm font-bold text-accent-foreground">
      {header.name[0]?.toUpperCase() ?? "F"}
    </span>
  );

  const firstGroupId = visibleNodes.find(isGroup)?.id;

  return (
    <aside
      onMouseEnter={() => !pinned && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ width: collapsed ? 68 : 256 }}
      className={cn(
        "glass flex h-full flex-col rounded-xl p-2 transition-[width] duration-200 ease-out",
        className
      )}
    >
      {/* Header — non-clickable identity */}
      <div
        className={cn(
          "mb-1.5 flex items-center gap-2.5 border-b border-(--glass-border) px-1 pb-2 select-none",
          collapsed && "justify-center"
        )}
      >
        {header.logo ?? defaultLogo}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold tracking-tight">{header.name}</div>
            {header.sub && (
              <div className="truncate text-[10px] font-medium text-muted-foreground">{header.sub}</div>
            )}
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            aria-pressed={pinned}
            aria-label={pinned ? "Desafixar menu (expandir só no hover)" : "Fixar menu expandido"}
            onClick={() => setPinned(!pinned)}
            className={cn(
              "grid size-[30px] shrink-0 place-items-center rounded-md outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4",
              pinned
                ? "bg-accent text-accent-foreground"
                : "border border-(--glass-border) text-muted-foreground hover:bg-(--glass-bg-hover)"
            )}
          >
            {pinned ? <PinOff /> : <Pin />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        aria-label="Navegação principal"
        className="flex flex-1 flex-col gap-px overflow-x-hidden overflow-y-auto"
      >
        {visibleNodes.map((node) => {
          if (isGroup(node)) {
            return (
              <div key={node.id} className="flex flex-col gap-px">
                {collapsed ? (
                  node.id !== firstGroupId && <div className="mx-2.5 my-[7px] h-px bg-(--neutral-200)" />
                ) : (
                  <div className="px-2.5 pt-3 pb-1 text-[10px] font-bold tracking-[0.07em] text-muted-foreground uppercase">
                    {node.label}
                  </div>
                )}
                {node.items.map((item) => renderItem(item, ctx))}
              </div>
            );
          }
          return renderItem(node, ctx);
        })}
      </nav>
    </aside>
  );
}
