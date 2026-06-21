import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — CheckboxCard (Choice Card).
 * A clickable card wrapping a real checkbox: the whole card toggles it. Selected
 * gets a lime border + subtle lime fill + lime ring. Form-friendly via `name`.
 */
export function CheckboxCard({
  title,
  sub,
  name,
  value,
  defaultChecked,
  disabled,
  className,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  name?: string;
  value?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors",
        "hover:border-[var(--neutral-300)] has-[input:checked]:border-[var(--lime-400)] has-[input:checked]:bg-(--lime-50) has-[input:checked]:shadow-[0_0_0_1px_var(--lime-400)]",
        "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60",
        className
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 size-[18px] shrink-0 accent-[var(--lime-400)]"
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </span>
    </label>
  );
}
