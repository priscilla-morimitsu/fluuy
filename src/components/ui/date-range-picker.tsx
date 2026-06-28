"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange, ChevronDown } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const f = (d: Date) => format(d, "dd MMM yyyy", { locale: ptBR });

/**
 * Fluuy Design System — DateRangePicker.
 * Popover + two-month Calendar (range mode). Trigger looks like an input;
 * start/end in lime, middle days in lime-50. Label "início – fim", pt-BR.
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Período",
  id,
  disabled,
  className,
}: {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<DateRange | undefined>(value);
  const range = value ?? internal;

  const set = (r: DateRange | undefined) => {
    if (value === undefined) setInternal(r);
    onChange?.(r);
  };

  const label = range?.from
    ? range.to
      ? `${f(range.from)} – ${f(range.to)}`
      : `${f(range.from)} – …`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm outline-none transition-colors",
          "hover:border-[var(--neutral-300)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted",
          className
        )}
      >
        <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn("flex-1 truncate", !range?.from && "text-muted-foreground")}>{label}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" numberOfMonths={2} selected={range} onSelect={set} autoFocus />
      </PopoverContent>
    </Popover>
  );
}
