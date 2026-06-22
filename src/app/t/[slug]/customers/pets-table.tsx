"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Cat, ChevronRight, Dog, PawPrint } from "lucide-react";

import { DataTable } from "@/components/crud/data-table";
import { DataTableColumnHeader } from "@/components/crud/data-table-column-header";
import { Badge } from "@/components/ui/badge";

import type { PetListRow } from "./data";
import { describePetAge } from "./template-fields";

/** Stored label → species icon. custom_data persists "Cão"/"Gato"/"Outro". */
function speciesIcon(especie: string) {
  const v = especie.toLowerCase();
  if (v.startsWith("cã") || v.startsWith("ca")) return Dog;
  if (v.startsWith("gat")) return Cat;
  return PawPrint;
}

// Sex drives the species-badge color (spec: macho=blue, femea=pink, none=neutral
// — never lime). Stored values are "Macho"/"Fêmea". Badge has no blue/pink
// variant, so colors are applied via className on the `outline` base.
function sexBadgeClass(sexo: string): string {
  const v = sexo.toLowerCase();
  if (v.startsWith("mac")) return "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  if (v.startsWith("fê") || v.startsWith("fe"))
    return "border-pink-300 bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300";
  return "";
}

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/**
 * Fluuy — PetsTable.
 *
 * TanStack table for the Pets view. Server-side data (URL params + parent
 * Server Component); rows open the shared PetSheet in edit mode via `onRowClick`.
 */
export function PetsTable({
  rows,
  onRowClick,
  toolbarStart,
  toolbarEnd,
  activeFilters,
  hasActiveFilters,
  onClearFilters,
  resultCount,
  emptyState,
}: {
  rows: PetListRow[];
  onRowClick: (row: PetListRow) => void;
  toolbarStart: React.ReactNode;
  toolbarEnd: React.ReactNode;
  activeFilters: React.ReactNode;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  resultCount: React.ReactNode;
  emptyState: React.ReactNode;
}) {
  const columns: ColumnDef<PetListRow, unknown>[] = [
    {
      id: "especie",
      meta: { label: "Espécie" },
      header: () => <DataTableColumnHeader label="Espécie" sortKey="especie" />,
      cell: ({ row }) => {
        const especie = str(row.original.customData.especie);
        const sexo = str(row.original.customData.sexo);
        const Icon = speciesIcon(especie);
        return (
          <Badge variant="outline" className={sexBadgeClass(sexo)}>
            <Icon className="size-3.5" />
            {especie || "—"}
            {sexo && <span className="sr-only">{sexo}</span>}
          </Badge>
        );
      },
    },
    {
      id: "pet",
      enableHiding: false,
      meta: { label: "Pet" },
      header: () => <DataTableColumnHeader label="Pet" sortKey="nome" />,
      cell: ({ row }) => <span className="font-medium">{str(row.original.customData.nome) || "—"}</span>,
    },
    {
      id: "raca",
      meta: { label: "Raça" },
      header: () => <DataTableColumnHeader label="Raça" sortKey="raca" />,
      cell: ({ row }) => {
        const raca = str(row.original.customData.raca);
        return raca ? <span className="text-sm">{raca}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "porte",
      meta: { label: "Porte" },
      header: () => <DataTableColumnHeader label="Porte" sortKey="porte" />,
      cell: ({ row }) => {
        const porte = str(row.original.customData.porte);
        return porte ? <span className="text-sm">{porte}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "idade",
      meta: { label: "Idade" },
      header: () => <DataTableColumnHeader label="Idade" />,
      cell: ({ row }) => {
        const info = describePetAge(str(row.original.customData.nasc) || null);
        if (!info) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="flex items-center gap-2 text-sm">
            {info.age}
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${info.tone}`}>
              {info.stage}
            </span>
          </span>
        );
      },
    },
    {
      id: "tutor",
      meta: { label: "Tutor" },
      header: () => <DataTableColumnHeader label="Tutor" />,
      cell: ({ row }) => <span className="text-sm">{row.original.customerName}</span>,
    },
    {
      id: "chevron",
      enableHiding: false,
      header: () => null,
      cell: () => (
        <div className="text-right text-muted-foreground">
          <ChevronRight className="ml-auto size-4" aria-hidden="true" />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      tableId="tenant-pets"
      columns={columns}
      data={rows}
      onRowClick={onRowClick}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={onClearFilters}
      toolbarStart={toolbarStart}
      resultCount={resultCount}
      toolbarEnd={toolbarEnd}
      activeFilters={activeFilters}
      emptyState={emptyState}
    />
  );
}
