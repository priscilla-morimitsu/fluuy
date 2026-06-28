"use client";

import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — ChipsInput (tags).
 * Type + Enter (or comma) adds a chip; Backspace on an empty field removes the
 * last; X removes a specific one. Each chip submits via a repeated hidden input
 * (`name`) → read with FormData.getAll(name). Chips use --lime-200.
 */
export function ChipsInput({
  name,
  defaultValue = [],
  placeholder = "Adicionar e pressionar Enter",
  disabled,
  id,
  className,
  onChange,
}: {
  name?: string;
  defaultValue?: string[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Fired with the full chip list whenever it changes (controlled usage). */
  onChange?: (chips: string[]) => void;
}) {
  const [chips, setChips] = React.useState<string[]>(defaultValue);
  const [draft, setDraft] = React.useState("");

  // Wraps setChips so callers always learn about the new list.
  const commit = (next: string[]) => {
    setChips(next);
    onChange?.(next);
  };

  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !chips.includes(v)) commit([...chips, v]);
    setDraft("");
  };

  return (
    <div
      className={cn(
        "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-1.5 text-sm transition-colors",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25 hover:border-[var(--neutral-300)]",
        className
      )}
    >
      {name && chips.map((c) => <input key={c} type="hidden" name={name} value={c} />)}
      {chips.map((c, i) => (
        <span
          key={c}
          className="inline-flex items-center gap-1 rounded-full bg-(--lime-200) py-0.5 pr-1 pl-2 text-xs font-medium text-(--neutral-800)"
        >
          {c}
          <button
            type="button"
            aria-label={`Remover ${c}`}
            disabled={disabled}
            onClick={() => commit(chips.filter((_, idx) => idx !== i))}
            className="grid size-4 place-items-center rounded-full hover:bg-black/10"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        disabled={disabled}
        placeholder={chips.length === 0 ? placeholder : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
            commit(chips.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        className="min-w-[8ch] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
