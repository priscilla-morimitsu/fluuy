import { TrendingDown, TrendingUp } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Fluuy Design System — MetricCard.
 * Glass metric card for dashboards (no glow). Shows a label, a large value, an
 * optional delta (direction inferred from the sign when not given), an optional
 * icon and a hint line.
 */
function MetricCard({
  label,
  value,
  delta,
  deltaDirection,
  icon,
  hint,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  label: React.ReactNode
  value: React.ReactNode
  delta?: React.ReactNode
  deltaDirection?: "up" | "down"
  icon?: React.ReactNode
  hint?: React.ReactNode
}) {
  const dir =
    deltaDirection ??
    (delta != null && String(delta).trim().startsWith("-") ? "down" : "up")

  return (
    <div
      data-slot="metric-card"
      className={cn(
        "glass flex flex-col gap-3 rounded-xl p-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span className="grid size-[30px] shrink-0 place-items-center rounded-md border border-(--glass-border) bg-(--glass-bg) text-foreground [&_svg]:size-4">
            {icon}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl leading-none font-bold tracking-tight">{value}</span>
        {delta != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold [&_svg]:size-3",
              dir === "down" ? "text-destructive" : "text-success"
            )}
          >
            {dir === "down" ? <TrendingDown /> : <TrendingUp />}
            {delta}
          </span>
        )}
      </div>

      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

export { MetricCard }
