"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — SwitchToggle (spec: button-component-spec v2.0.0).
 *
 * A SINGLE button that flips between TWO values (`a` / `b`), each with its own
 * color — e.g. lime = Pessoa Física, azul = Pessoa Jurídica. Clicking switches
 * to the other value; the button always renders the *active* value.
 *
 * - Light: translucent `tint` at rest, solid (`solid`/`on`) on hover.
 * - Dark: ALWAYS solid (the `.dark` ancestor forces the solid treatment).
 *
 * Each value's colors come from props, so they're applied through inline CSS
 * variables (`--st-*`) and consumed by static Tailwind classes — never build the
 * color classes from interpolated values, or Tailwind won't emit them.
 */
export type SwitchToggleOption = {
  /** Stable identifier reported by `value` / `onChange` and submitted via `name`. */
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Translucent rest background (light mode). */
  tint: string;
  /** Text color at rest (light mode). */
  c: string;
  /** Border color at rest (light mode). */
  bd: string;
  /** Solid background — hover (light) and always (dark). */
  solid: string;
  /** Text color over the solid background. */
  on: string;
};

function optionStyle(o: SwitchToggleOption): React.CSSProperties {
  return {
    "--st-tint": o.tint,
    "--st-c": o.c,
    "--st-bd": o.bd,
    "--st-solid": o.solid,
    "--st-on": o.on,
  } as React.CSSProperties;
}

export function SwitchToggle({
  a,
  b,
  value,
  defaultValue,
  onChange,
  name,
  disabled,
  size = "default",
  className,
}: {
  a: SwitchToggleOption;
  b: SwitchToggleOption;
  /** Controlled active value (must equal `a.value` or `b.value`). */
  value?: string;
  /** Uncontrolled initial value; defaults to `a.value`. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Renders a hidden input so the active value submits inside a form. */
  name?: string;
  disabled?: boolean;
  size?: "default" | "sm";
  className?: string;
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? a.value);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const active = current === b.value ? b : a;
  const next = active.value === a.value ? b : a;

  const flip = () => {
    if (!isControlled) setInternal(next.value);
    onChange?.(next.value);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active.value === b.value}
      aria-label={typeof active.label === "string" ? active.label : undefined}
      disabled={disabled}
      onClick={flip}
      style={optionStyle(active)}
      className={cn(
        "inline-flex items-center justify-center gap-[7px] rounded-2xl border font-semibold transition-colors outline-none select-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        "[&_svg]:size-[19px] [&_svg]:shrink-0 [&_svg]:[stroke-width:2.2]",
        size === "default" ? "h-[44px] px-4 text-sm" : "h-9 px-3 text-sm",
        // light: translucent tint at rest → solid on hover
        "border-[var(--st-bd)] bg-[var(--st-tint)] text-[var(--st-c)]",
        "hover:border-[var(--st-solid)] hover:bg-[var(--st-solid)] hover:text-[var(--st-on)]",
        // dark: always solid
        "dark:border-[var(--st-solid)] dark:bg-[var(--st-solid)] dark:text-[var(--st-on)]",
        className
      )}
    >
      {active.icon}
      {active.label}
      {name && <input type="hidden" name={name} value={active.value} />}
    </button>
  );
}
