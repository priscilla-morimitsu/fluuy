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
import { TEMPLATE_ENTITY_TYPES } from "@/lib/validations/template";

import { toggleTemplateStatusAction } from "./actions";
import type { TemplateListRow } from "./data";
import TemplateForm, { type TemplateInitial } from "./template-form";

const STATUS_LABELS: Record<string, string> = { draft: "Rascunho", active: "Ativo", inactive: "Inativo" };
const STATUS_OPTIONS = ["draft", "active", "inactive"] as const;
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function toInitial(row: TemplateListRow): TemplateInitial {
  return {
    id: row.id,
    nicheId: row.nicheId,
    entityType: row.entityType,
    name: row.name,
    description: row.description,
    fields: row.fields,
  };
}

export default function TemplatesClient({
  rows,
  filtered,
  total,
  niches,
}: {
  rows: TemplateListRow[];
  filtered: number;
  total: number;
  niches: { id: string; name: string }[];
}) {
  const [params, setParams] = useTableParams();
  const [status, setStatus] = useQueryState("status", parseAsString.withOptions({ shallow: false }));
  const [nicheId, setNicheId] = useQueryState("nicheId", parseAsString.withOptions({ shallow: false }));
  const [entityType, setEntityType] = useQueryState("entityType", parseAsString.withOptions({ shallow: false }));

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TemplateInitial | null>(null);
  const [toggling, setToggling] = useState<TemplateListRow | null>(null);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });
  if (nicheId) {
    const n = niches.find((x) => x.id === nicheId);
    activeFilters.push({ key: "nicheId", label: `Nicho: ${n?.name ?? nicheId}`, onRemove: () => setNicheId(null) });
  }
  if (entityType) activeFilters.push({ key: "entityType", label: `Entidade: ${entityType}`, onRemove: () => setEntityType(null) });

  const clearAll = () => {
    setStatus(null);
    setNicheId(null);
    setEntityType(null);
    setParams({ q: null, page: 1 });
  };

  const activeCount = (status ? 1 : 0) + (nicheId ? 1 : 0) + (entityType ? 1 : 0);

  const columns: ColumnDef<TemplateListRow, unknown>[] = [
    {
      id: "niche",
      meta: { label: "Nicho" },
      header: () => <DataTableColumnHeader label="Nicho" />,
      cell: ({ row }) => row.original.niche.name,
    },
    {
      accessorKey: "entityType",
      meta: { label: "Entidade" },
      header: () => <DataTableColumnHeader label="Entidade" />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.entityType}</span>,
    },
    {
      accessorKey: "name",
      meta: { label: "Nome" },
      header: () => <DataTableColumnHeader label="Nome" sortKey="name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "version",
      meta: { label: "Versão" },
      header: () => <DataTableColumnHeader label="Versão" sortKey="version" />,
      cell: ({ row }) => <span className="text-sm">v{row.original.version}</span>,
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
        title="Templates"
        description="Campos e comportamentos por nicho e entidade."
        action={<Button onClick={() => setCreating(true)}>Novo template</Button>}
      />

      <DataTable
        tableId="admin-templates"
        columns={columns}
        data={rows}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome..." />}
        resultCount={<ResultCount filtered={filtered} total={total} />}
        toolbarEnd={
          <FilterDialog activeCount={activeCount} onClear={clearAll}>
            <div className="flex flex-col gap-2">
              <Label>Nicho</Label>
              <Select value={nicheId ?? "all"} onValueChange={(v) => setNicheId(v === "all" ? null : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {niches.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Entidade</Label>
              <Select value={entityType ?? "all"} onValueChange={(v) => setEntityType(v === "all" ? null : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {TEMPLATE_ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            title="Nenhum template cadastrado ainda"
            action={<Button onClick={() => setCreating(true)}>Novo template</Button>}
          />
        }
      />

      <PaginationControls total={filtered} />

      <CrudDrawer open={creating} onOpenChange={setCreating} title="Novo template">
        <TemplateForm
          niches={niches}
          onSuccess={() => {
            setCreating(false);
            toast.success("Template criado.");
          }}
        />
      </CrudDrawer>

      <CrudDrawer open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title="Editar template">
        {editing && (
          <TemplateForm
            niches={niches}
            initial={editing}
            onSuccess={() => {
              setEditing(null);
              toast.success("Template atualizado.");
            }}
          />
        )}
      </CrudDrawer>

      <ConfirmActionDialog
        open={toggling !== null}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.status === "active" ? "Inativar template" : "Ativar template"}
        description={
          toggling?.status === "active"
            ? `Inativar "${toggling?.name}" impede que ele seja usado para validar custom_data de novos registros.`
            : `Ativar "${toggling?.name}" passa a usá-lo na validação de custom_data do nicho/entidade.`
        }
        destructive={toggling?.status === "active"}
        confirmLabel={toggling?.status === "active" ? "Inativar" : "Ativar"}
        onConfirm={async () => {
          if (!toggling) return;
          await toggleTemplateStatusAction(toggling.id);
          toast.success("Status atualizado.");
        }}
      />
    </div>
  );
}
