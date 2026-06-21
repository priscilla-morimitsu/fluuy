"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import * as React from "react";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboOption = {
  value: string;
  label: string;
  /** Secondary line shown under the label (e.g. bairro · cidade). */
  description?: string;
};

/**
 * Fluuy Design System — Combobox (searchable select).
 * Trigger looks like an input; the panel is a cmdk Command inside a Popover.
 * Supports local filtering (static lists) or async search (`onSearchChange` +
 * `filter={false}`), an optional custom typed value, and loading state.
 */
export function Combobox({
  value,
  defaultValue,
  onValueChange,
  name,
  options,
  placeholder = "Selecione…",
  searchPlaceholder = "Buscar…",
  emptyText = "Nada encontrado.",
  allowCustom = false,
  loading = false,
  disabled = false,
  filter = true,
  onSearchChange,
  id,
  ariaInvalid,
  ariaLabel,
  className,
}: {
  value?: string;
  /** Uncontrolled initial value (used with `name`). */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** When set, submits the value via a hidden input and self-manages state. */
  name?: string;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  loading?: boolean;
  disabled?: boolean;
  filter?: boolean;
  onSearchChange?: (query: string) => void;
  id?: string;
  ariaInvalid?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [internal, setInternal] = React.useState(defaultValue ?? "");

  const current = value !== undefined ? value : internal;
  const selected = options.find((o) => o.value === current);
  const display = selected?.label ?? (current && allowCustom ? current : "");

  const commit = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
    setOpen(false);
    setQuery("");
  };

  const showCustom =
    allowCustom &&
    query.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      {name && <input type="hidden" name={name} value={current} />}
      <PopoverTrigger
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm outline-none transition-colors",
          "hover:border-[var(--neutral-300)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          className
        )}
      >
        <span className={cn("truncate", !display && "text-muted-foreground")}>
          {display || placeholder}
        </span>
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={filter}>
          <CommandInput
            value={query}
            onValueChange={(q) => {
              setQuery(q);
              onSearchChange?.(q);
            }}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Carregando…
              </div>
            ) : (
              <>
                {!showCustom && <CommandEmpty>{emptyText}</CommandEmpty>}
                {options.map((o) => (
                  <CommandItem key={o.value} value={o.label} onSelect={() => commit(o.value)}>
                    <Check className={cn("size-4", current === o.value ? "opacity-100" : "opacity-0")} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{o.label}</span>
                      {o.description && (
                        <span className="truncate text-xs text-muted-foreground">{o.description}</span>
                      )}
                    </span>
                  </CommandItem>
                ))}
                {showCustom && (
                  <CommandItem value={`__custom_${query}`} onSelect={() => commit(query.trim())}>
                    <Check className="size-4 opacity-0" />
                    Usar “{query.trim()}”
                  </CommandItem>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
