"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — GlassTimeline (EinUI `glass-timeline`, adapted).
 *
 * Ported from EinUI's `@einui/glass-timeline` horizontal variant, restyled to
 * the Fluuy tokens: lime current/completed nodes, neutral upcoming nodes, thin
 * connectors and **no glow** (the project's "Liquid Glass without glow" rule —
 * the upstream cyan/blue glow + `animate-pulse` halo are intentionally dropped).
 *
 * Used as the step indicator for multi-section form drawers. Nodes are
 * optionally clickable so the user can jump between already-known sections.
 */
export type TimelineStatus = "completed" | "current" | "upcoming";

export type TimelineItem = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  status?: TimelineStatus;
  /** `id` for the node button — pair with the panel's `aria-labelledby`. */
  buttonId?: string;
  /** `aria-controls` for the node button — the id of the panel it reveals. */
  controls?: string;
};

export function GlassTimeline({
  items,
  orientation = "horizontal",
  onItemClick,
  className,
}: {
  items: TimelineItem[];
  orientation?: "horizontal" | "vertical";
  className?: string;
  /** When set, each node becomes a button that jumps to that step. */
  onItemClick?: (id: string, index: number) => void;
}) {
  if (orientation === "vertical") {
    return (
      <div className={cn("relative", className)}>
        {items.map((item, index) => (
          <div key={item.id} className="flex gap-3 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <Node item={item} index={index} onItemClick={onItemClick} />
              {index < items.length - 1 && (
                <span
                  className={cn(
                    "mt-2 w-px flex-1 rounded-full",
                    item.status === "completed" ? "bg-[var(--lime-300)]" : "bg-border",
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "pt-2 text-sm leading-tight",
                item.status === "current" ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {item.title}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ol className={cn("flex items-start", className)}>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <li className="flex shrink-0 flex-col items-center gap-[7px]">
            <Node item={item} index={index} onItemClick={onItemClick} />
            <span
              className={cn(
                "max-w-[76px] text-center text-[11px] leading-tight",
                item.status === "current" ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {item.title}
            </span>
          </li>
          {index < items.length - 1 && (
            <span
              className={cn(
                "mx-1.5 mt-[18px] h-px flex-1 rounded-full",
                item.status === "completed" ? "bg-[var(--lime-300)]" : "bg-border",
              )}
            />
          )}
        </React.Fragment>
      ))}
    </ol>
  );
}

function Node({
  item,
  index,
  onItemClick,
}: {
  item: TimelineItem;
  index: number;
  onItemClick?: (id: string, index: number) => void;
}) {
  const { status } = item;
  const content =
    status === "completed" ? <Check /> : item.icon;

  const classes = cn(
    "relative grid size-10 place-items-center rounded-full border transition-colors [&_svg]:size-[18px]",
    status === "current"
      ? // Lime filled node + soft (blur-free) lime ring — the image's halo, no glow.
        "border-transparent bg-[var(--lime-300)] text-[var(--neutral-900)] ring-4 ring-[var(--lime-100)]"
      : status === "completed"
        ? "border-transparent bg-[var(--lime-100)] text-[var(--neutral-900)]"
        : "border-border bg-card text-muted-foreground",
  );

  if (onItemClick) {
    return (
      <button
        type="button"
        role="tab"
        id={item.buttonId}
        aria-controls={item.controls}
        aria-selected={status === "current"}
        aria-label={item.title}
        title={item.title}
        onClick={() => onItemClick(item.id, index)}
        className={cn(classes, status !== "current" && "hover:border-[var(--neutral-300)]")}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={classes} aria-current={status === "current" ? "step" : undefined}>
      {content}
    </div>
  );
}
