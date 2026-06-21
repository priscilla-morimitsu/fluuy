import { Check, CircleAlert, Info, Loader2 } from "lucide-react";
import * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Success message colour — readable green (lime would be too low-contrast). */
const OK_TEXT = "text-[oklch(0.52_0.13_150)]";

/**
 * Fluuy Design System — Field.
 * Field anatomy: label (+ required *), the control, and a bottom line that is
 * either an error, a success note, a hint, plus an optional counter on the
 * right. Wire `aria-describedby` to `${htmlFor}-msg` on the control.
 */
function Field({
  label,
  htmlFor,
  required,
  info,
  hint,
  error,
  ok,
  counter,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  /** Explanatory tooltip shown via an Info icon next to the label. */
  info?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  ok?: React.ReactNode;
  counter?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const message = error ?? ok ?? hint;
  const showMessage = message != null || counter != null;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <div className="flex items-center gap-1.5">
          <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
            {label}
            {required && (
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {info && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Mais informações"
                    className="grid size-4 cursor-help place-items-center text-muted-foreground outline-none focus-visible:text-foreground"
                  >
                    <Info className="size-3.5" />
                  </button>
                }
              />
              <TooltipContent>{info}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      {children}
      {showMessage && (
        <div className="flex items-start justify-between gap-2 text-xs">
          <span
            id={htmlFor ? `${htmlFor}-msg` : undefined}
            role={error ? "alert" : undefined}
            className={cn(
              error ? "text-destructive" : ok ? OK_TEXT : "text-muted-foreground"
            )}
          >
            {message}
          </span>
          {counter != null && <span className="shrink-0 text-muted-foreground">{counter}</span>}
        </div>
      )}
    </div>
  );
}

type AffixState = { invalid?: boolean; ok?: boolean; loading?: boolean };

/**
 * Input with optional lead icon, addon prefix/suffix and a trail that reflects
 * state (spinner while loading, CircleAlert on error, Check on success). The
 * whole shell carries the field states (border/ring/disabled).
 */
function AffixInput({
  leadIcon,
  prefix,
  suffix,
  trail,
  invalid,
  ok,
  loading,
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<"input">, "prefix"> &
  AffixState & {
    leadIcon?: React.ReactNode;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    trail?: React.ReactNode;
  }) {
  const computedTrail = loading ? (
    <Loader2 className="size-4 animate-spin text-muted-foreground" />
  ) : invalid ? (
    <CircleAlert className="size-4 text-destructive" />
  ) : ok ? (
    <Check className={cn("size-4", OK_TEXT)} />
  ) : (
    trail
  );

  // A boxed addon (muted background + separator) — the `.input-affix .affix` look.
  const affix = "flex h-full items-center self-stretch bg-muted px-2.5 text-sm text-muted-foreground select-none [&_svg]:size-3.5";
  const hasPrefix = prefix != null;
  const hasLead = leadIcon != null && !hasPrefix;

  return (
    <div
      data-slot="affix-input"
      className={cn(
        "flex h-11 w-full items-center overflow-hidden rounded-xl border bg-card text-sm transition-colors",
        "focus-within:ring-3 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-muted",
        invalid
          ? "border-destructive focus-within:ring-destructive/20"
          : ok
            ? "border-[oklch(0.52_0.13_150)] focus-within:ring-[oklch(0.52_0.13_150)]/20"
            : "border-border hover:border-[var(--neutral-300)] focus-within:border-ring focus-within:ring-ring/25",
        className
      )}
    >
      {hasPrefix && <span className={cn(affix, "border-r border-border")}>{prefix}</span>}
      {hasLead && (
        <span className="flex shrink-0 items-center pl-3 text-muted-foreground [&_svg]:size-4">{leadIcon}</span>
      )}
      <input
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-full w-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground",
          hasLead ? "pr-3 pl-2" : "px-3"
        )}
        {...props}
      />
      {suffix != null && <span className={cn(affix, "border-l border-border")}>{suffix}</span>}
      {computedTrail && <span className="flex shrink-0 items-center pr-3 [&_svg]:size-4">{computedTrail}</span>}
    </div>
  );
}

export { Field, AffixInput };
