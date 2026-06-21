"use client";

import { ListFilter } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Fluuy Design System — FilterButton.
 * Outline "Filtros" button with a lime badge counting active filters; opens a
 * Popover with the organized filter fields (passed as children), a header
 * (title + Limpar) and a footer (Cancelar + Aplicar). Filters write to the URL
 * live, so Aplicar/Cancelar simply close; Limpar resets via `onClear`.
 */
export function FilterButton({
  activeCount,
  onClear,
  children,
  title = "Filtros",
}: {
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ListFilter className="size-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="brand" className="ml-1 font-bold">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-0 shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">{title}</span>
          <button
            type="button"
            onClick={onClear}
            disabled={activeCount === 0}
            className="text-xs font-medium text-foreground hover:underline disabled:opacity-40 disabled:no-underline"
          >
            Limpar
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="brand" size="sm" onClick={() => setOpen(false)}>
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
