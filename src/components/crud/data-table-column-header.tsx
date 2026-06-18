"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useTableParams } from "./use-table-params";

/**
 * Sortable column header. Click cycles asc → desc → no sort (server-side via
 * URL params). Non-sortable columns just render the label.
 */
export function DataTableColumnHeader({
  label,
  sortKey,
}: {
  label: string;
  sortKey?: string;
}) {
  const [params, setParams] = useTableParams();

  if (!sortKey) return <span>{label}</span>;

  const active = params.sortBy === sortKey;
  const dir = active ? params.sortDir : "";

  const next = () => {
    // asc → desc → cleared
    if (!active || dir === "") return setParams({ sortBy: sortKey, sortDir: "asc", page: 1 });
    if (dir === "asc") return setParams({ sortBy: sortKey, sortDir: "desc", page: 1 });
    return setParams({ sortBy: "", sortDir: "", page: 1 });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-7 gap-1 data-[active=true]:text-foreground"
      data-active={active}
      onClick={next}
      aria-label={`Ordenar por ${label}`}
    >
      {label}
      {active && dir === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : active && dir === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-50" />
      )}
    </Button>
  );
}
