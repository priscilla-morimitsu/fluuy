import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Fluuy Design System — Glass family.
 * Liquid Glass surfaces (no glow): translucent background, refined blur, neutral
 * shadow, 1px light border. All driven by the `--glass-*` / accent tokens.
 */

const GLASS = "[backdrop-filter:var(--glass-blur)] [-webkit-backdrop-filter:var(--glass-blur)] [box-shadow:var(--glass-shadow)]"

/* ── GlassButton ──────────────────────────────────────────── */

const glassButtonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border font-medium whitespace-nowrap transition-all outline-none select-none",
    "focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] active:[box-shadow:none] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    GLASS
  ),
  {
    variants: {
      variant: {
        default:
          "border-(--glass-border) bg-(--glass-bg) text-foreground hover:bg-(--glass-bg-hover)",
        primary:
          "border-accent/60 bg-accent text-accent-foreground hover:bg-[color-mix(in_oklch,var(--accent),black_8%)]",
        outline:
          "border-(--glass-border) bg-transparent text-foreground hover:bg-(--glass-bg)",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-(--glass-bg)",
        destructive:
          "border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10",
      },
      size: {
        sm: "h-7 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-5 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
)

function GlassButton({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof glassButtonVariants>) {
  return (
    <button
      data-slot="glass-button"
      className={cn(glassButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/* ── GlassInput ───────────────────────────────────────────── */

function GlassInput({
  className,
  label,
  hint,
  ...props
}: React.ComponentProps<"input"> & {
  label?: React.ReactNode
  hint?: React.ReactNode
}) {
  const field = (
    <input
      data-slot="glass-input"
      className={cn(
        "h-9 w-full rounded-md border border-(--glass-border) bg-(--glass-bg) px-3 text-sm text-foreground outline-none transition",
        "[backdrop-filter:var(--glass-blur)] [-webkit-backdrop-filter:var(--glass-blur)] [box-shadow:var(--glass-shadow)]",
        "placeholder:text-muted-foreground focus:border-ring focus:bg-(--glass-bg-hover) focus:ring-3 focus:ring-ring/30 disabled:opacity-55",
        className
      )}
      {...props}
    />
  )
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        // Implicit association — the label wraps the control, so no id is needed.
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {field}
        </label>
      ) : (
        field
      )}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

/* ── GlassBadge ───────────────────────────────────────────── */

const glassBadgeVariants = cva(
  cn(
    "inline-flex h-[1.375rem] items-center rounded-full border px-2 text-xs font-medium whitespace-nowrap",
    "[backdrop-filter:var(--glass-blur)] [-webkit-backdrop-filter:var(--glass-blur)]"
  ),
  {
    variants: {
      variant: {
        default: "border-(--glass-border) bg-(--glass-bg) text-foreground",
        outline: "border-(--glass-border) bg-transparent text-foreground",
        brand: "border-accent/55 bg-accent/40 text-accent-foreground",
        success:
          "border-success/50 bg-success/20 text-[color-mix(in_oklch,var(--success),black_18%)] dark:text-success",
        warning:
          "border-warning/50 bg-warning/20 text-[color-mix(in_oklch,var(--warning),black_18%)] dark:text-warning",
        destructive: "border-destructive/50 bg-destructive/20 text-destructive",
        info: "border-info/50 bg-info/25 text-[color-mix(in_oklch,var(--info),black_18%)] dark:text-info",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function GlassBadge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof glassBadgeVariants>) {
  return (
    <span
      data-slot="glass-badge"
      className={cn(glassBadgeVariants({ variant }), className)}
      {...props}
    />
  )
}

/* ── GlassAvatar ──────────────────────────────────────────── */

function GlassAvatar({
  src,
  alt,
  fallback,
  size = 40,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  src?: string
  alt?: string
  fallback?: React.ReactNode
  /** Diameter in px. Default: 40. */
  size?: number
}) {
  return (
    <div
      data-slot="glass-avatar"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-(--glass-border) bg-(--glass-bg) [backdrop-filter:var(--glass-blur)] [-webkit-backdrop-filter:var(--glass-blur)] [box-shadow:var(--glass-shadow)]",
        className
      )}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? ""} className="size-full object-cover" />
      ) : (
        <span
          className="font-semibold text-foreground select-none"
          style={{ fontSize: size * 0.38 }}
        >
          {fallback ?? "?"}
        </span>
      )}
    </div>
  )
}

/* ── GlassDock ────────────────────────────────────────────── */

type DockItem = {
  id: string
  icon: React.ReactNode
  label?: string
  badge?: number | string
}

function GlassDock({
  items,
  orientation = "vertical",
  activeId,
  onSelect,
  size = 40,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "onSelect"> & {
  items: DockItem[]
  orientation?: "vertical" | "horizontal"
  activeId?: string
  onSelect?: (id: string) => void
  /** Item diameter in px. Default: 40. */
  size?: number
}) {
  const vertical = orientation === "vertical"
  return (
    <div
      data-slot="glass-dock"
      className={cn(
        "inline-flex items-center gap-1 rounded-[1.75rem] border border-(--glass-border) bg-(--glass-bg) p-1.5 [backdrop-filter:var(--glass-blur)] [-webkit-backdrop-filter:var(--glass-blur)] [box-shadow:var(--glass-shadow)]",
        vertical ? "flex-col" : "flex-row",
        className
      )}
      {...props}
    >
      {items.map((item) => {
        const active = activeId === item.id
        return (
          <div key={item.id} className="group/dock relative flex items-center">
            <button
              type="button"
              onClick={() => onSelect?.(item.id)}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center rounded-full border outline-none transition-all [&_svg]:size-5",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-accent/60 bg-accent text-accent-foreground"
                  : "border-transparent text-foreground hover:scale-110 hover:bg-(--glass-bg-hover)"
              )}
              style={{ width: size, height: size }}
            >
              {item.icon}
              {item.badge != null && (
                <span className="absolute top-0.5 right-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[9px] leading-none font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
            {item.label && (
              <span
                className={cn(
                  "pointer-events-none absolute z-10 hidden rounded-lg border border-(--glass-border) bg-(--glass-bg) px-2.5 py-1 text-xs font-medium whitespace-nowrap text-foreground [backdrop-filter:var(--glass-blur)] [box-shadow:var(--glass-shadow)] group-hover/dock:block",
                  vertical
                    ? "top-1/2 left-full ml-3 -translate-y-1/2"
                    : "bottom-full left-1/2 mb-3 -translate-x-1/2"
                )}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export {
  GlassButton,
  glassButtonVariants,
  GlassInput,
  GlassBadge,
  glassBadgeVariants,
  GlassAvatar,
  GlassDock,
  type DockItem,
}
