import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Fluuy Design System — GlassCard.
 * Liquid Glass surface (no glow). Translucent background, refined blur, neutral
 * shadow and a 1px light border, all driven by the `--glass-*` tokens via the
 * `.glass` utility. Use for elevated panels, auth cards and overlays.
 */
function GlassCard({
  className,
  padding,
  radius,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  /** Inner padding. Default: var(--card-spacing). */
  padding?: string | number
  /** Border radius in px. Default: 16. */
  radius?: number
}) {
  return (
    <div
      data-slot="glass-card"
      className={cn(
        "glass group/glass-card flex flex-col gap-(--card-spacing) py-(--card-spacing) text-sm text-card-foreground [--card-spacing:--spacing(4)]",
        className
      )}
      style={{
        ...(radius !== undefined ? { borderRadius: radius } : { borderRadius: "var(--radius-card, 0.75rem)" }),
        ...(padding !== undefined ? { padding } : null),
        ...style,
      }}
      {...props}
    />
  )
}

function GlassCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 px-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function GlassCardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="glass-card-title"
      className={cn("font-heading text-base leading-snug font-semibold", className)}
      {...props}
    />
  )
}

function GlassCardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="glass-card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function GlassCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function GlassCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-footer"
      className={cn(
        "flex items-center gap-2 border-t border-(--glass-border) px-(--card-spacing) pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
}
