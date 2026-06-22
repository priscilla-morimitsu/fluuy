"use client";

import {
  type ColumnDef,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { FilteredEmptyState } from "./states";

function loadVisibility(tableId: string): VisibilityState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(`crud-cols:${tableId}`) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * Server-side table: data/sorting/pagination are driven by URL params and the
 * parent Server Component — TanStack here only owns the column model and
 * per-user column visibility (persisted to localStorage by `tableId`).
 *
 * Renders the standardized CRUD toolbar so search/result-count sit on the
 * left and the filters button + columns menu align on the right.
 */
export function DataTable<TData>({
  columns,
  data,
  tableId,
  hasActiveFilters = false,
  onClearFilters,
  emptyState,
  toolbarStart,
  resultCount,
  toolbarEnd,
  activeFilters,
  onRowClick,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  tableId: string;
  /**
   * Opens the row's edit drawer. Rows become `cursor-pointer`; clicks that land
   * on an interactive descendant (link, button, menu, input) are ignored so the
   * row actions menu and inline links keep working.
   */
  onRowClick?: (row: TData) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  emptyState?: ReactNode;
  /** Left side of the toolbar — typically the search field. */
  toolbarStart?: ReactNode;
  /** Left side, after search — typically the result count. */
  resultCount?: ReactNode;
  /** Right side, before the columns menu — typically the filters button. */
  toolbarEnd?: ReactNode;
  /** Applied-filter badges row, rendered below the toolbar. */
  activeFilters?: ReactNode;
}) {
  // Columns flagged `meta.defaultHidden` start hidden but stay toggleable in the
  // "Colunas" menu. A user's stored choice always wins over the default.
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const defaults: VisibilityState = {};
    for (const col of columns) {
      const meta = col.meta as { defaultHidden?: boolean } | undefined;
      if (!meta?.defaultHidden) continue;
      const id = col.id ?? ("accessorKey" in col ? String(col.accessorKey) : undefined);
      if (id) defaults[id] = false;
    }
    return { ...defaults, ...loadVisibility(tableId) };
  });

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        try {
          window.localStorage.setItem(`crud-cols:${tableId}`, JSON.stringify(next));
        } catch {
          // ignore storage failures (private mode, quota) — visibility is best-effort
        }
        return next;
      });
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
  });

  const hideableColumns = table.getAllColumns().filter((c) => c.getCanHide());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {toolbarStart}
          {resultCount}
        </div>
        <div className="flex items-center gap-2">
          {toolbarEnd}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="size-4" /> Colunas
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
                {hideableColumns.map((column) => {
                const label =
                  typeof column.columnDef.meta === "object" &&
                  column.columnDef.meta &&
                  "label" in column.columnDef.meta
                    ? String((column.columnDef.meta as { label: string }).label)
                    : column.id;
                return (
                  <label
                    key={column.id}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      checked={column.getIsVisible()}
                      onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}
                    />
                    {label}
                  </label>
                );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {activeFilters}

      {data.length === 0 ? (
        hasActiveFilters ? (
          <FilteredEmptyState onClear={onClearFilters} />
        ) : (
          emptyState
        )
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={
                    onRowClick
                      ? (e) => {
                          // Ignore clicks on interactive descendants (links,
                          // buttons, menus, inputs) so row actions still work.
                          if ((e.target as HTMLElement).closest("a,button,input,select,textarea,[role='menuitem'],[data-no-row-click]")) {
                            return;
                          }
                          onRowClick(row.original);
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
