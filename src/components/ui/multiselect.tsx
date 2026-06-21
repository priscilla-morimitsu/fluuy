"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
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
import type { ComboOption } from "@/components/ui/combobox";

/**
 * Fluuy Design System — MultiSelect.
 * Searchable multi-select; the trigger shows the chosen items as removable
 * chips. Form-friendly: each selected value submits via a repeated hidden input
 * (`name`) → read with FormData.getAll(name). Uncontrolled by default
 * (`defaultValue`), with an optional `onValueChange`.
 */
export function MultiSelect({
  name,
  options,
  defaultValue = [],
  onValueChange,
  placeholder = "Selecione…",
  searchPlaceholder = "Buscar…",
  emptyText = "Nada encontrado.",
  disabled = false,
  id,
  ariaInvalid,
  className,
}: {
  name?: string;
  options: ComboOption[];
  defaultValue?: string[];
  onValueChange?: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  ariaInvalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(defaultValue);

  const update = (next: string[]) => {
    setSelected(next);
    onValueChange?.(next);
  };
  const toggle = (value: string) =>
    update(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const labelOf = (value: string) => options.find((o) => o.value === value)?.label ?? value;

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      {name && selected.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      <PopoverTrigger
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-left text-sm outline-none transition-colors",
          "hover:border-[var(--neutral-300)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:bg-muted",
          className
        )}
      >
        {selected.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          <span className="flex flex-1 flex-wrap gap-1">
            {selected.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full bg-(--lime-200) py-0.5 pr-1 pl-2 text-xs font-medium text-(--neutral-800)"
              >
                {labelOf(v)}
                <span
                  role="button"
                  aria-label={`Remover ${labelOf(v)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(v);
                  }}
                  className="grid size-4 place-items-center rounded-full hover:bg-black/10"
                >
                  <X className="size-3" />
                </span>
              </span>
            ))}
          </span>
        )}
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((o) => {
              const isSel = selected.includes(o.value);
              return (
                <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                  <Check className={cn("size-4", isSel ? "opacity-100" : "opacity-0")} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{o.label}</span>
                    {o.description && (
                      <span className="truncate text-xs text-muted-foreground">{o.description}</span>
                    )}
                  </span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
