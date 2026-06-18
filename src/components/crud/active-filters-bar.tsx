"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ActiveFilter = { key: string; label: string; onRemove: () => void };

/**
 * Renders applied filters as removable badges above the table, plus a
 * "Limpar tudo" shortcut. Renders nothing when there are no active filters.
 */
export function ActiveFiltersBar({
  filters,
  onClearAll,
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <Badge key={f.key} variant="secondary" className="gap-1 pr-1">
          {f.label}
          <button
            type="button"
            onClick={f.onRemove}
            aria-label={`Remover filtro ${f.label}`}
            className="rounded-sm hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll}>
        Limpar tudo
      </Button>
    </div>
  );
}
