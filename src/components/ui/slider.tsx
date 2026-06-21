"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — Slider.
 * Native range input with lime accent; the current value is shown on the right
 * of the label row. Form-friendly via `name`.
 */
export function Slider({
  name,
  label,
  defaultValue = 50,
  min = 0,
  max = 100,
  step = 1,
  format,
  disabled,
  id,
  className,
}: {
  name?: string;
  label?: React.ReactNode;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => React.ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between text-sm">
        {label && <span className="text-muted-foreground">{label}</span>}
        <strong className="font-semibold">{format ? format(value) : value}</strong>
      </div>
      <input
        id={id}
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-[var(--lime-400)] disabled:opacity-50"
      />
    </div>
  );
}
