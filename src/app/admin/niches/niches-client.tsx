"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

import { ActiveFiltersBar, type ActiveFilter } from "@/components/crud/active-filters-bar";
import { ConfirmActionDialog } from "@/components/crud/confirm-action-dialog";
import { CrudDrawer } from "@/components/crud/crud-drawer";
import { DataTable } from "@/components/crud/data-table";
import { DataTableColumnHeader } from "@/components/crud/data-table-column-header";
import { FilterDialog } from "@/components/crud/filter-dialog";
import { PageHeader } from "@/components/crud/page-header";
import { PaginationControls } from "@/components/crud/pagination-controls";
import { ResultCount } from "@/components/crud/result-count";
import { RowActionsMenu } from "@/components/crud/row-actions-menu";
import { SearchInput } from "@/components/crud/search-input";
import { EmptyState } from "@/components/crud/states";
import { useTableParams } from "@/components/crud/use-table-params";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toggleNicheStatusAction } from "./actions";
import type { NicheListRow } from "./data";
import NicheForm, { type NicheInitial } from "./niche-form";

const STATUS_LABELS: Record<string, string> = { active: "Ativo", inactive: "Inativo" };
const STATUS_OPTIONS = ["active", "inactive"] as const;
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function toInitial(row: NicheListRow): NicheInitial {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    customerLabel: row.customerLabel,
    entityLabel: row.entityLabel,
  };
}

export default function NichesClient({
  rows,
  filtered,
  total,
}: {
  rows: NicheListRow[];
  filtered: number;
  total: number;
}) {
  const [params, setParams] = useTableParams();
  const [status, setStatus] = useQueryState("status", parseAsString.withOptions({ shallow: false }));

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<NicheInitial | null>(null);
  const [toggling, setToggling] = useState<NicheListRow | null>(null);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });

  const clearAll = () => {
    setStatus(null);
    setParams({ q: null, page: 1 });
  };

  const columns: ColumnDef<NicheListRow, unknown>[] = [
    {
      accessorKey: "key",
      meta: { label: "Key" },
      header: () => <DataTableColumnHeader label="Key" sortKey="key" />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.key}</span>,
    },
    {
      accessorKey: "name",
      meta: { label: "Nome" },
      header: () => <DataTableColumnHeader label="Nome" sortKey="name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: "labels",
      meta: { label: "Labels" },
      header: () => <DataTableColumnHeader label="Cliente / Entidade" />,
      cell: ({ row }) => (
        <span className="text-sm text-zinc-500">
          {row.original.customerLabel ?? "—"} / {row.original.entityLabel ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: () => <DataTableColumnHeader label="Status" sortKey="status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "secondary"}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      meta: { label: "Criado em" },
      header: () => <DataTableColumnHeader label="Criado em" sortKey="createdAt" />,
      cell: ({ row }) => <span className="text-sm text-zinc-500">{dateFmt.format(row.original.createdAt)}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => {
        const isActive = row.original.status === "active";
        return (
          <div className="text-right">
            <RowActionsMenu>
              <DropdownMenuItem onClick={() => setEditing(toInitial(row.original))}>Editar</DropdownMenuItem>
              <DropdownMenuItem
                variant={isActive ? "destructive" : "default"}
                onClick={() => setToggling(row.original)}
              >
                {isActive ? "Inativar" : "Ativar"}
              </DropdownMenuItem>
            </RowActionsMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Nichos"
        description="Segmentos atendidos pela plataforma."
        action={<Button onClick={() => setCreating(true)}>Novo nicho</Button>}
      />

      <DataTable
        tableId="admin-niches"
        columns={columns}
        data={rows}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome ou key..." />}
        resultCount={<ResultCount filtered={filtered} total={total} />}
        toolbarEnd={
          <FilterDialog activeCount={status ? 1 : 0} onClear={clearAll}>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={status ?? "all"} onValueChange={(v) => setStatus(v === "all" ? null : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FilterDialog>
        }
        activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
        emptyState={
          <EmptyState
            title="Nenhum nicho cadastrado ainda"
            action={<Button onClick={() => setCreating(true)}>Novo nicho</Button>}
          />
        }
      />

      <PaginationControls total={filtered} />

      <CrudDrawer open={creating} onOpenChange={setCreating} title="Novo nicho">
        <NicheForm
          onSuccess={() => {
            setCreating(false);
            toast.success("Nicho criado.");
          }}
        />
      </CrudDrawer>

      <CrudDrawer open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title="Editar nicho">
        {editing && (
          <NicheForm
            initial={editing}
            onSuccess={() => {
              setEditing(null);
              toast.success("Nicho atualizado.");
            }}
          />
        )}
      </CrudDrawer>

      <ConfirmActionDialog
        open={toggling !== null}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.status === "active" ? "Inativar nicho" : "Ativar nicho"}
        description={
          toggling?.status === "active"
            ? `Inativar "${toggling?.name}" impede que ele seja oferecido para novos tenants e templates.`
            : `Reativar "${toggling?.name}" volta a disponibilizá-lo para novos tenants e templates.`
        }
        destructive={toggling?.status === "active"}
        confirmLabel={toggling?.status === "active" ? "Inativar" : "Ativar"}
        onConfirm={async () => {
          if (!toggling) return;
          await toggleNicheStatusAction(toggling.id);
          toast.success("Status atualizado.");
        }}
      />
    </div>
  );
}
