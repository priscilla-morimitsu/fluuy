"use client";

import { Search } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — Autocomplete.
 * Free-text input that suggests matching options while typing, with keyboard
 * navigation (↑/↓/Enter/Esc). Closes on outside click. Submits the text via a
 * hidden input (`name`).
 */
export function Autocomplete({
  options,
  name,
  defaultValue = "",
  placeholder = "Digite para sugerir…",
  onValueChange,
  id,
  disabled,
  className,
}: {
  options: string[];
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  onValueChange?: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [q, setQ] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [hl, setHl] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const list = q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : [];
  const commit = (v: string) => {
    setQ(v);
    onValueChange?.(v);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={q} />}
      <div className="flex h-11 w-full items-center overflow-hidden rounded-xl border border-border bg-card pl-3 transition-colors hover:border-[var(--neutral-300)] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          id={id}
          value={q}
          disabled={disabled}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHl(0);
          }}
          onFocus={() => q && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHl((h) => Math.min(h + 1, list.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHl((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && list[hl]) {
              e.preventDefault();
              commit(list[hl]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="h-full w-full min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
      {open && list.length > 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
          <div id={listId} role="listbox" className="max-h-[180px] overflow-y-auto">
            {list.map((o, i) => (
              <div
                key={o}
                role="option"
                aria-selected={i === hl}
                onMouseEnter={() => setHl(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(o);
                }}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-2 text-sm",
                  i === hl && "bg-[var(--neutral-100)]"
                )}
              >
                {o}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
