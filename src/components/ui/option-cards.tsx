import * as React from "react";

import { cn } from "@/lib/utils";

export type OptionCard = {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
};

/**
 * Fluuy Design System — OptionCards (single choice as cards).
 * Clickable cards; the selected one gets a lime border + subtle lime fill.
 * Native radios (form-friendly via `name`).
 */
export function OptionCards({
  name,
  options,
  defaultValue,
  columns = 1,
  className,
}: {
  name: string;
  options: OptionCard[];
  defaultValue?: string;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-2.5",
        columns === 2 && "@[440px]:grid-cols-2",
        columns === 3 && "@[440px]:grid-cols-3",
        className
      )}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors",
            "hover:border-[var(--neutral-300)] has-[input:checked]:border-[var(--lime-400)] has-[input:checked]:bg-(--lime-50) has-[input:checked]:shadow-[0_0_0_1px_var(--lime-400)]",
            "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60"
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={defaultValue === o.value}
            disabled={o.disabled}
            className="peer sr-only"
          />
          <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-(--neutral-300) peer-checked:border-[var(--lime-400)] peer-checked:[&>span]:opacity-100">
            <span className="size-2 rounded-full bg-[var(--lime-400)] opacity-0 transition-opacity" />
          </span>
          {o.icon && <span className="shrink-0 text-foreground [&_svg]:size-5">{o.icon}</span>}
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium text-foreground">{o.label}</span>
            {o.description && (
              <span className="text-xs text-muted-foreground">{o.description}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
