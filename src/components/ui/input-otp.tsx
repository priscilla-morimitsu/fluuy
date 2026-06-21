"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — InputOtp.
 * One-time-code field: `length` boxes (44×50), numeric, focus auto-advances and
 * Backspace steps back. Submits the joined value via a hidden input (`name`).
 */
export function InputOtp({
  length = 6,
  name,
  onComplete,
  disabled,
  className,
}: {
  length?: number;
  name?: string;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [vals, setVals] = React.useState<string[]>(() => Array(length).fill(""));
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const set = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, "").slice(-1);
    const next = [...vals];
    next[i] = d;
    setVals(next);
    if (d && i < length - 1) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) onComplete?.(next.join(""));
  };

  return (
    <div className={cn("flex gap-2", className)} role="group" aria-label="Código de verificação">
      {name && <input type="hidden" name={name} value={vals.join("")} />}
      {vals.map((x, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={x}
          disabled={disabled}
          aria-label={`Dígito ${i + 1}`}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !x && i > 0) refs.current[i - 1]?.focus();
          }}
          className="h-[50px] w-11 rounded-xl border border-border bg-card text-center text-lg font-semibold text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted"
        />
      ))}
    </div>
  );
}
