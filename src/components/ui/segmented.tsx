import * as React from "react";

import { cn } from "@/lib/utils";

export type SegmentedOption = { value: string; label: React.ReactNode };

/**
 * Fluuy Design System — Segmented control.
 * For 2–3 short, mutually exclusive options (e.g. Mensal / Anual). Native
 * radios (form-friendly via `name`); the selected segment sits on `--card`
 * over a `--muted` track. Uncontrolled by default (`defaultValue`).
 */
export function Segmented({
  name,
  options,
  defaultValue,
  className,
  ariaLabel,
}: {
  name: string;
  options: SegmentedOption[];
  defaultValue?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-11 items-center gap-1 rounded-xl bg-muted p-1 text-sm",
        className
      )}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className="relative flex flex-1 cursor-pointer items-center justify-center"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={defaultValue === o.value}
            className="peer sr-only"
          />
          <span className="w-full rounded-xl px-3 py-1.5 text-center font-medium text-muted-foreground transition-colors peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
