"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

import { ActiveFiltersBar, type ActiveFilter } from "@/components/crud/active-filters-bar";
import { ConfirmActionDialog } from "@/components/crud/confirm-action-dialog";
import { FormDrawer } from "@/components/ui/form-drawer";
import { DataTable } from "@/components/crud/data-table";
import { DataTableColumnHeader } from "@/components/crud/data-table-column-header";
import { FilterButton } from "@/components/crud/filter-button";
import { PageHeader } from "@/components/crud/page-header";
import { PaginationControls } from "@/components/crud/pagination-controls";
import { ResultCount } from "@/components/crud/result-count";
import { RowActionsMenu } from "@/components/crud/row-actions-menu";
import { SearchInput } from "@/components/crud/search-input";
import { EmptyState } from "@/components/crud/states";
import { useTableParams } from "@/components/crud/use-table-params";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

import { toggleFeatureStatusAction } from "./actions";
import type { FeatureListRow } from "./data";
import FeatureForm, { type FeatureInitial } from "./feature-form";

const STATUS_LABELS: Record<string, string> = { active: "Ativa", inactive: "Inativa" };
const STATUS_OPTIONS = ["active", "inactive"] as const;
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function toInitial(row: FeatureListRow): FeatureInitial {
  return { id: row.id, key: row.key, name: row.name, description: row.description, group: row.group };
}

export default function FeaturesClient({
  rows,
  filtered,
  total,
  groups,
}: {
  rows: FeatureListRow[];
  filtered: number;
  total: number;
  groups: string[];
}) {
  const [params, setParams] = useTableParams();
  const [status, setStatus] = useQueryState("status", parseAsString.withOptions({ shallow: false }));
  const [group, setGroup] = useQueryState("featureGroup", parseAsString.withOptions({ shallow: false }));

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FeatureInitial | null>(null);
  const [toggling, setToggling] = useState<FeatureListRow | null>(null);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });
  if (group) activeFilters.push({ key: "featureGroup", label: `Grupo: ${group}`, onRemove: () => setGroup(null) });

  const clearAll = () => {
    setStatus(null);
    setGroup(null);
    setParams({ q: null, page: 1 });
  };

  const columns: ColumnDef<FeatureListRow, unknown>[] = [
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
      accessorKey: "group",
      meta: { label: "Grupo" },
      header: () => <DataTableColumnHeader label="Grupo" sortKey="group" />,
      cell: ({ row }) => <span className="text-sm text-zinc-500">{row.original.group ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: () => <DataTableColumnHeader label="Status" sortKey="status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "success" : "secondary"}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      meta: { label: "Criada em" },
      header: () => <DataTableColumnHeader label="Criada em" sortKey="createdAt" />,
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
        title="Features"
        description="Catálogo global de features da plataforma."
        action={<Button onClick={() => setCreating(true)}><Plus /> Nova feature</Button>}
      />

      <DataTable
        tableId="admin-features"
        columns={columns}
        data={rows}
        onRowClick={(row) => setEditing(toInitial(row))}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome ou key..." />}
        resultCount={<ResultCount filtered={filtered} total={total} />}
        toolbarEnd={
          <FilterButton activeCount={(status ? 1 : 0) + (group ? 1 : 0)} onClear={clearAll}>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Combobox
                value={status ?? "all"}
                onValueChange={(v) => setStatus(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Grupo</Label>
              <Combobox
                value={group ?? "all"}
                onValueChange={(v) => setGroup(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...groups.map((g) => ({ value: g, label: g }))]}
              />
            </div>
          </FilterButton>
        }
        activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
        emptyState={
          <EmptyState
            title="Nenhuma feature cadastrada ainda"
            action={<Button onClick={() => setCreating(true)}><Plus /> Nova feature</Button>}
          />
        }
      />

      <PaginationControls total={filtered} />

      <FormDrawer open={creating} onOpenChange={setCreating} title="Nova feature" hideFooter contentScrolls={false}>
        <FeatureForm
          onCancel={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success("Feature criada.");
          }}
        />
      </FormDrawer>

      <FormDrawer
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Editar feature"
        hideFooter
        contentScrolls={false}
      >
        {editing && (
          <FeatureForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSuccess={() => {
              setEditing(null);
              toast.success("Feature atualizada.");
            }}
          />
        )}
      </FormDrawer>

      <ConfirmActionDialog
        open={toggling !== null}
        onOpenChange={(open) => !open && setToggling(null)}
        title={toggling?.status === "active" ? "Inativar feature" : "Ativar feature"}
        description={
          toggling?.status === "active"
            ? `Inativar "${toggling?.name}" esconde o módulo correspondente para novos tenants. As liberações já existentes (TenantFeature) são preservadas.`
            : `Reativar "${toggling?.name}" volta a disponibilizá-la para liberação por tenant.`
        }
        destructive={toggling?.status === "active"}
        confirmLabel={toggling?.status === "active" ? "Inativar" : "Ativar"}
        onConfirm={async () => {
          if (!toggling) return;
          await toggleFeatureStatusAction(toggling.id);
          toast.success("Status atualizado.");
        }}
      />
    </div>
  );
}
