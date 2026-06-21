"use client";

import * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ToggleGroupItem = {
  value: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  tooltip?: string;
};

/**
 * Fluuy Design System — ToggleGroup.
 * Contiguous block of toggles (shared corners). `type="single"` behaves like a
 * radio (one active); `type="multiple"` like checkboxes. Active item: lime fill
 * + lime border, raised above siblings so the border shows whole. Icon-only
 * items keep min-width 50 and a tooltip.
 */
export function ToggleGroup({
  type = "single",
  items,
  value,
  defaultValue,
  onValueChange,
  disabled,
  className,
}: {
  type?: "single" | "multiple";
  items: ToggleGroupItem[];
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const toArr = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v : v != null ? [v] : [];
  const [internal, setInternal] = React.useState<string[]>(() => toArr(defaultValue));
  const controlled = value !== undefined;
  const sel = controlled ? toArr(value) : internal;

  const emit = (next: string[]) => {
    if (!controlled) setInternal(next);
    onValueChange?.(type === "multiple" ? next : (next[0] ?? ""));
  };

  const onItem = (v: string) => {
    if (type === "multiple") emit(sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);
    else emit([v]);
  };

  return (
    <div role="group" className={cn("isolate inline-flex", className)}>
      {items.map((o, i) => {
        const on = sel.includes(o.value);
        const btn = (
          <button
            type="button"
            aria-pressed={on}
            aria-label={o.tooltip}
            disabled={disabled}
            onClick={() => onItem(o.value)}
            className={cn(
              "inline-flex h-[50px] min-w-[50px] items-center justify-center gap-1.5 border font-semibold text-sm outline-none transition-colors",
              "focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              "[&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:[stroke-width:2.2]",
              o.label ? "px-3.5" : "px-0",
              i === 0 && "rounded-l-2xl",
              i === items.length - 1 && "rounded-r-2xl",
              i > 0 && "-ml-px",
              on
                ? "z-10 border-[var(--lime-400)] bg-[var(--lime-300)] text-[var(--neutral-900)]"
                : "border-border bg-transparent text-foreground hover:bg-[var(--neutral-100)]"
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
        return o.tooltip ? (
          <Tooltip key={o.value}>
            <TooltipTrigger render={btn} />
            <TooltipContent>{o.tooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <React.Fragment key={o.value}>{btn}</React.Fragment>
        );
      })}
    </div>
  );
}
