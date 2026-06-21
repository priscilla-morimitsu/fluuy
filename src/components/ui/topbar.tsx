"use client";

import { Bell, Calendar, ChevronDown, Lock, LogOut, Search } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export type TopbarUser = {
  name: string;
  email?: string;
  /** Custom initials; derived from the name when omitted. */
  initials?: string;
};

export type TopbarMessage = { title: string; text: string; time: string };
export type TopbarRequest = { type: string; text: string; time: string };

function deriveInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

/** Icon action button with an optional lime count badge. */
function IconButton({
  active,
  badge,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  badge?: number;
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={active}
      className={cn(
        "relative flex size-9 cursor-pointer items-center justify-center rounded-md border text-foreground outline-none transition-colors hover:bg-(--glass-bg-hover) focus-visible:ring-3 focus-visible:ring-foreground/50 [&_svg]:size-[18px]",
        active ? "border-border bg-(--glass-bg-hover)" : "border-transparent"
      )}
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute top-1 right-1 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-[1.5px] border-card bg-[var(--lime-300)] px-1 text-[9px] font-bold text-[var(--neutral-900)]">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

/** Generic dropdown panel anchored under a topbar action. */
function Dropdown({
  title,
  footer,
  onFooter,
  width = 320,
  children,
}: {
  title?: React.ReactNode;
  footer?: React.ReactNode;
  onFooter?: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      role="menu"
      className="absolute top-[calc(100%+8px)] right-0 z-10 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--glass-shadow)]"
      style={{ width }}
    >
      {title && (
        <div className="border-b border-border px-3.5 py-3 text-sm font-semibold">
          {title}
        </div>
      )}
      <div className="max-h-[300px] overflow-y-auto">{children}</div>
      {footer && (
        <div className="border-t border-border px-3.5 py-2.5 text-center">
          <button
            type="button"
            onClick={onFooter}
            className="cursor-pointer rounded-md px-1 text-xs font-medium text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-foreground/50"
          >
            {footer}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Fluuy Design System — TopbarMenuItem.
 * Row inside the user menu; `danger` renders the destructive (logout) style.
 */
export function TopbarMenuItem({
  icon,
  children,
  danger,
  onClick,
}: {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-foreground/50 [&_svg]:size-4",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-(--glass-bg-hover)"
      )}
    >
      {icon && <span className="flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

/**
 * Fluuy Design System — Topbar.
 * Sticky glass app bar: logo + wordmark, global search, notifications
 * (messages + requests) and a user menu (change password / logout). Dropdowns
 * close on outside click or Esc.
 */
export function Topbar({
  user = { name: "Usuário" },
  brand = "fluuy",
  logo,
  homeHref = "/",
  onLogoClick,
  searchPlaceholder = "Buscar no sistema…",
  searchValue,
  onSearch,
  onSubmitSearch,
  messages = [],
  requests = [],
  messageCount,
  requestCount,
  onChangePassword,
  onLogout,
  onViewMessages,
  onViewRequests,
  className,
  style,
}: {
  user: TopbarUser;
  brand?: string;
  logo?: React.ReactNode;
  homeHref?: string;
  onLogoClick?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  /** Fired on Enter in the search field (additive to the DS API). */
  onSubmitSearch?: (value: string) => void;
  messages?: TopbarMessage[];
  requests?: TopbarRequest[];
  messageCount?: number;
  requestCount?: number;
  onChangePassword?: () => void;
  onLogout?: () => void;
  onViewMessages?: () => void;
  onViewRequests?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = React.useState<"msgs" | "reqs" | "user" | "search" | null>(null);
  const [compact, setCompact] = React.useState(false);
  const [isXSmall, setIsXSmall] = React.useState(false); // <= 420px
  const headerRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setCompact(width <= 600);
        setIsXSmall(width <= 420);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const msgN = messageCount ?? messages.length;
  const reqN = requestCount ?? requests.length;
  const av = user.initials || deriveInitials(user.name);

  return (
    <header
      ref={headerRef}
      style={{ containerType: "inline-size", ...style }}
      className={cn(
        "sticky top-0 z-40 flex h-[60px] items-center gap-4 border-b border-border bg-(--glass-bg) px-[14px] [-webkit-backdrop-filter:var(--glass-blur-lg)] [backdrop-filter:var(--glass-blur-lg)]",
        className
      )}
    >
      {/* Logo + wordmark */}
      <a
        href={homeHref}
        onClick={(e) => {
          if (onLogoClick) {
            e.preventDefault();
            onLogoClick();
          }
        }}
        aria-label="Ir para a home"
        className="flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
      >
        {logo ?? (
          <Image
            src="/logo-dark.png"
            alt="Fluuy Logo"
            width={30}
            height={30}
            className="object-contain"
          />
        )}
        {brand && !isXSmall && (
          <span className="text-lg font-bold tracking-tight">{brand}</span>
        )}
      </a>

      {/* Global search */}
      {!compact && (
        <div className="relative mx-auto flex max-w-[420px] min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            value={searchValue}
            onChange={(e) => onSearch?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmitSearch?.((e.target as HTMLInputElement).value);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 w-full rounded-full border-none bg-muted pr-3 pl-[34px] text-sm text-foreground shadow-[0_1px_1.5px_oklch(0_0_0/0.03)] outline-none focus:ring-3 focus:ring-foreground/30"
          />
        </div>
      )}

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1">
        {compact && (
          <IconButton
            label="Buscar"
            active={open === "search"}
            onClick={() => setOpen((o) => (o === "search" ? null : "search"))}
          >
            <Search />
          </IconButton>
        )}

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Messages */}
        <div className="relative">
          <IconButton
            label="Mensagens não lidas"
            badge={msgN}
            active={open === "msgs"}
            onClick={() => setOpen((o) => (o === "msgs" ? null : "msgs"))}
          >
            <Bell />
          </IconButton>
          {!compact && open === "msgs" && (
            <Dropdown
              title="Mensagens não lidas"
              footer="Ver todas as conversas"
              onFooter={() => {
                setOpen(null);
                onViewMessages?.();
              }}
            >
              {messages.length === 0 ? (
                <div className="px-3.5 py-5 text-center text-sm text-muted-foreground">
                  Nenhuma mensagem nova
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    role="menuitem"
                    tabIndex={0}
                    className="flex cursor-pointer gap-2.5 rounded-md px-2.5 py-2 not-last:border-b not-last:border-border"
                  >
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--accent)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-sm font-semibold">{m.title}</span>
                        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{m.time}</span>
                      </div>
                      <div className="truncate text-xs text-[var(--muted-foreground)]">{m.text}</div>
                    </div>
                  </div>
                ))
              )}
            </Dropdown>
          )}
        </div>

        {/* Requests */}
        <div className="relative">
          <IconButton
            label="Solicitações"
            badge={reqN}
            active={open === "reqs"}
            onClick={() => setOpen((o) => (o === "reqs" ? null : "reqs"))}
          >
            <Calendar />
          </IconButton>
          {!compact && open === "reqs" && (
            <Dropdown
              title="Solicitações"
              footer="Ver pedidos e agendamentos"
              onFooter={() => {
                setOpen(null);
                onViewRequests?.();
              }}
            >
              {requests.length === 0 ? (
                <div className="px-3.5 py-5 text-center text-sm text-[var(--muted-foreground)]">
                  Nenhuma solicitação pendente
                </div>
              ) : (
                requests.map((r, i) => (
                  <div
                    key={i}
                    role="menuitem"
                    tabIndex={0}
                    className="flex cursor-pointer flex-col gap-1 px-3.5 py-2.5 not-last:border-b not-last:border-border"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex h-[18px] items-center rounded-full border border-warning/35 bg-warning/15 px-1.5 text-[10px] font-semibold text-[color-mix(in_oklch,var(--warning),black_22%)] dark:text-warning">
                        {r.type}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">{r.time}</span>
                    </div>
                    <div className="text-sm text-[var(--foreground)]">{r.text}</div>
                  </div>
                ))
              )}
            </Dropdown>
          )}
        </div>

        {!compact && <div className="mx-1.5 h-[26px] w-px bg-[var(--border)]" />}

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => (o === "user" ? null : "user"))}
            aria-label="Conta"
            aria-expanded={open === "user"}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-full border py-1 pr-2 pl-1 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-foreground/50",
              compact ? "border-none p-0" : "border-border",
              open === "user" && !compact ? "border-border bg-(--glass-bg-hover)" : ""
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--lime-300)] text-sm font-bold text-[var(--neutral-900)]">
              {av}
            </span>
            {!compact && (
              <>
                <span className="flex max-w-[150px] flex-col items-start leading-tight">
                  <span className="max-w-full truncate text-sm font-semibold">{user.name}</span>
                  {user.email && (
                    <span className="max-w-full truncate text-xs text-[var(--muted-foreground)]">{user.email}</span>
                  )}
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />
              </>
            )}
          </button>
          {!compact && open === "user" && (
            <div
              role="menu"
              className="absolute top-[calc(100%+8px)] right-0 z-10 w-[248px] overflow-hidden rounded-xl border border-border bg-card shadow-[var(--glass-shadow)]"
            >
              <div className="flex items-center gap-2.5 border-b border-[var(--border)] p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-foreground)]">
                  {av}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{user.name}</div>
                  {user.email && (
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  )}
                </div>
              </div>
              <div className="p-1.5">
                <TopbarMenuItem
                  icon={<Lock />}
                  onClick={() => {
                    setOpen(null);
                    onChangePassword?.();
                  }}
                >
                  Alterar senha
                </TopbarMenuItem>
                <TopbarMenuItem
                  icon={<LogOut />}
                  danger
                  onClick={() => {
                    setOpen(null);
                    onLogout?.();
                  }}
                >
                  Sair
                </TopbarMenuItem>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawers / Bottom Sheets */}
      <Sheet open={compact && open === "search"} onOpenChange={(io) => !io && setOpen(null)}>
        <SheetContent side="bottom" className="rounded-t-[18px] max-h-[80vh] px-4 pb-6 pt-2">
          <div className="mx-auto my-2 h-1 w-9 rounded-full bg-(--neutral-300)" />
          <SheetHeader className="p-0">
            <SheetTitle>Buscar</SheetTitle>
          </SheetHeader>
          <div className="relative mt-4 flex items-center">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <input
              autoFocus
              value={searchValue}
              onChange={(e) => onSearch?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSubmitSearch?.((e.target as HTMLInputElement).value);
                  setOpen(null);
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 w-full rounded-full border-none bg-[var(--muted)] pr-3 pl-[34px] text-sm text-foreground shadow-[0_1px_1.5px_oklch(0_0_0/0.03)] outline-none focus:ring-3 focus:ring-foreground/30"
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={compact && open === "msgs"} onOpenChange={(io) => !io && setOpen(null)}>
        <SheetContent side="bottom" className="flex max-h-[80vh] flex-col rounded-t-[18px] px-4 pt-2 pb-6">
          <div className="mx-auto my-2 h-1 w-9 rounded-full bg-(--neutral-300)" />
          <SheetHeader className="p-0">
            <SheetTitle>Mensagens não lidas</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma mensagem nova
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  role="menuitem"
                  tabIndex={0}
                  className="flex cursor-pointer gap-2.5 py-3 border-b border-border last:border-none"
                >
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-semibold">{m.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{m.time}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{m.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                onViewMessages?.();
              }}
              className="w-full cursor-pointer rounded-md py-1 text-center text-sm font-semibold text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-foreground/50"
            >
              Ver todas as conversas
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={compact && open === "reqs"} onOpenChange={(io) => !io && setOpen(null)}>
        <SheetContent side="bottom" className="flex max-h-[80vh] flex-col rounded-t-[18px] px-4 pt-2 pb-6">
          <div className="mx-auto my-2 h-1 w-9 rounded-full bg-(--neutral-300)" />
          <SheetHeader className="p-0">
            <SheetTitle>Solicitações</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {requests.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma solicitação pendente
              </div>
            ) : (
              requests.map((r, i) => (
                <div
                  key={i}
                  role="menuitem"
                  tabIndex={0}
                  className="flex cursor-pointer flex-col gap-1 py-3 border-b border-border last:border-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex h-[18px] items-center rounded-full border border-warning/35 bg-warning/15 px-1.5 text-[10px] font-semibold text-[color-mix(in_oklch,var(--warning),black_22%)] dark:text-warning">
                      {r.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{r.time}</span>
                  </div>
                  <div className="text-sm text-foreground">{r.text}</div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                onViewRequests?.();
              }}
              className="w-full cursor-pointer rounded-md py-1 text-center text-sm font-semibold text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-foreground/50"
            >
              Ver pedidos e agendamentos
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={compact && open === "user"} onOpenChange={(io) => !io && setOpen(null)}>
        <SheetContent side="bottom" className="flex max-h-[80vh] flex-col rounded-t-[18px] px-4 pt-2 pb-6">
          <div className="mx-auto my-2 h-1 w-9 rounded-full bg-(--neutral-300)" />
          <div className="flex items-center gap-2.5 pb-4 border-b border-border">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {av}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{user.name}</div>
              {user.email && (
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <TopbarMenuItem
              icon={<Lock />}
              onClick={() => {
                setOpen(null);
                onChangePassword?.();
              }}
            >
              Alterar senha
            </TopbarMenuItem>
            <TopbarMenuItem
              icon={<LogOut />}
              danger
              onClick={() => {
                setOpen(null);
                onLogout?.();
              }}
            >
              Sair
            </TopbarMenuItem>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
