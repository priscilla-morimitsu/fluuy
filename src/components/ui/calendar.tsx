"use client";

import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — Calendar (react-day-picker, pt-BR).
 * Selected day = lime; today = inset lime ring. No glow.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={ptBR}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-2",
        month: "flex flex-col gap-3",
        month_caption: "flex h-8 items-center justify-center px-8 capitalize",
        caption_label: "text-sm font-medium",
        nav: "absolute flex w-full items-center justify-between px-1",
        button_previous: "grid size-7 place-items-center rounded-md text-foreground hover:bg-(--glass-bg-hover) disabled:opacity-40",
        button_next: "grid size-7 place-items-center rounded-md text-foreground hover:bg-(--glass-bg-hover) disabled:opacity-40",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-[0.7rem] font-normal text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "size-8 p-0 text-center text-sm",
        day_button:
          "grid size-8 place-items-center rounded-md font-normal outline-none hover:bg-(--glass-bg-hover) focus-visible:ring-3 focus-visible:ring-ring/40",
        selected: "[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:hover:bg-accent",
        range_start: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        range_end: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        range_middle: "bg-(--lime-50) [&>button]:rounded-none [&>button]:bg-transparent [&>button]:text-foreground",
        today: "[&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-[var(--lime-400)]",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cls }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", cls)} />
          ) : (
            <ChevronRight className={cn("size-4", cls)} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
