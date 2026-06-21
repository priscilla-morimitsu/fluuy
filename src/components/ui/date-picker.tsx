"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import * as React from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — DatePicker (Popover + Calendar, pt-BR).
 * Always use this instead of a native date input. The trigger looks like an
 * input; the popover holds the calendar plus a "Hoje" shortcut.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  id,
  name,
  disabled,
  ariaInvalid,
  className,
}: {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Submit the canonical ISO date with the form; UI shows the pt-BR label. */}
      {name && <input type="hidden" name={name} value={value ? format(value, "yyyy-MM-dd") : ""} />}
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm outline-none transition-colors",
          "hover:border-[var(--neutral-300)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn("flex-1 truncate", !value && "text-muted-foreground")}>
          {value ? format(value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange?.(d);
            setOpen(false);
          }}
          autoFocus
        />
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => {
              onChange?.(new Date());
              setOpen(false);
            }}
            className="w-full rounded-md px-2 py-1.5 text-center text-sm font-medium text-foreground hover:bg-(--glass-bg-hover)"
          >
            Hoje
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
