import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — SwitchCard.
 * A clickable card holding a toggle: clicking anywhere flips it. Uses a native
 * checkbox (form-friendly via `name`); the track/thumb are CSS, and the card
 * highlights through `:has(input:checked)`.
 */
export function SwitchCard({
  title,
  hint,
  name,
  defaultChecked,
  checked,
  onChange,
  disabled,
  className,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 transition-colors",
        "hover:border-[var(--neutral-300)] has-[input:checked]:border-[var(--lime-400)] has-[input:checked]:bg-(--lime-50) has-[input:checked]:shadow-[0_0_0_1px_var(--lime-400)]",
        "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <span className="relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full bg-[var(--neutral-300)] p-0.5 transition-colors peer-checked:bg-[var(--lime-400)] peer-checked:[&>span]:translate-x-4 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
        <span className="size-[18px] rounded-full bg-white shadow-sm transition-transform" />
      </span>
    </label>
  );
}
