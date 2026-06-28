"use client";

import * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — Toggle.
 * On/off button with `aria-pressed`. On: lime fill + lime border + dark text.
 * Off: transparent + neutral border, hover --secondary (dark-safe). Controlled (`pressed`)
 * or uncontrolled (`defaultPressed`). Icon-only toggles must pass `tooltip`.
 */
export function Toggle({
  pressed,
  defaultPressed = false,
  onPressedChange,
  children,
  tooltip,
  disabled,
  size = "default",
  className,
}: {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  children?: React.ReactNode;
  tooltip?: string;
  disabled?: boolean;
  size?: "default" | "sm";
  className?: string;
}) {
  const [internal, setInternal] = React.useState(defaultPressed);
  const isControlled = pressed !== undefined;
  const on = isControlled ? pressed : internal;

  const toggle = () => {
    const next = !on;
    if (!isControlled) setInternal(next);
    onPressedChange?.(next);
  };

  const btn = (
    <button
      type="button"
      aria-pressed={on}
      aria-label={tooltip}
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center gap-[7px] rounded-2xl border font-semibold transition-colors outline-none select-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        "[&_svg]:size-[19px] [&_svg]:shrink-0 [&_svg]:[stroke-width:2.2]",
        size === "default" ? "h-[44px] min-w-[44px] px-4 text-sm" : "h-9 min-w-9 px-3 text-sm",
        on
          ? "border-[var(--lime-400)] bg-[var(--lime-300)] text-[var(--neutral-900)]"
          : "border-border bg-transparent text-foreground hover:bg-[var(--secondary)]",
        className
      )}
    >
      {children}
    </button>
  );

  if (!tooltip) return btn;
  return (
    <Tooltip>
      <TooltipTrigger render={btn} />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
