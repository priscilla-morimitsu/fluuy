"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
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
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { setTenantStatusAction } from "./actions";
import type { TenantListRow } from "./data";
import TenantForm, { type TenantInitial } from "./tenant-form";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  trial: "Trial",
  suspended: "Suspenso",
  blocked: "Bloqueado",
};
const STATUS_OPTIONS = ["active", "trial", "suspended", "blocked"] as const;
const DESTRUCTIVE_STATUSES = new Set(["suspended", "blocked"]);

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function toInitial(row: TenantListRow): TenantInitial {
  return {
    id: row.id,
    nicheId: row.nicheId,
    name: row.name,
    slug: row.slug,
    legalName: row.legalName,
    document: row.document,
    description: row.description,
    publicPhone: row.publicPhone,
    publicEmail: row.publicEmail,
    notificationPhone: row.notificationPhone,
    hasProducts: row.hasProducts,
    hasServices: row.hasServices,
    hasPlans: row.hasPlans,
    hasDelivery: row.hasDelivery,
    hasPickup: row.hasPickup,
    acceptsOnlinePayment: row.acceptsOnlinePayment,
  };
}

export default function TenantsClient({
  rows,
  filtered,
  total,
  niches,
}: {
  rows: TenantListRow[];
  filtered: number;
  total: number;
  niches: { id: string; name: string }[];
}) {
  const [params, setParams] = useTableParams();
  const [status, setStatus] = useQueryState("status", parseAsString.withOptions({ shallow: false }));
  const [nicheId, setNicheId] = useQueryState("nicheId", parseAsString.withOptions({ shallow: false }));

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TenantInitial | null>(null);
  const [statusChange, setStatusChange] = useState<{ tenant: TenantListRow; target: string } | null>(null);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) {
    activeFilters.push({ key: "status", label: `Status: ${STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });
  }
  if (nicheId) {
    const n = niches.find((x) => x.id === nicheId);
    activeFilters.push({ key: "nicheId", label: `Nicho: ${n?.name ?? nicheId}`, onRemove: () => setNicheId(null) });
  }

  const clearAll = () => {
    setStatus(null);
    setNicheId(null);
    setParams({ q: null, page: 1 });
  };

  const columns: ColumnDef<TenantListRow, unknown>[] = [
    {
      accessorKey: "name",
      meta: { label: "Nome" },
      header: () => <DataTableColumnHeader label="Nome" sortKey="name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "slug",
      meta: { label: "Slug" },
      header: () => <DataTableColumnHeader label="Slug" sortKey="slug" />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.slug}</span>,
    },
    {
      id: "niche",
      meta: { label: "Nicho" },
      header: () => <DataTableColumnHeader label="Nicho" />,
      cell: ({ row }) => row.original.niche.name,
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: () => <DataTableColumnHeader label="Status" sortKey="status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "blocked" ? "destructive" : "default"}>
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
      cell: ({ row }) => (
        <div className="text-right">
          <RowActionsMenu>
            <DropdownMenuItem render={<Link href={`/admin/tenants/${row.original.id}`} />}>
              Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditing(toInitial(row.original))}>Editar</DropdownMenuItem>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.filter((s) => s !== row.original.status).map((s) => (
              <DropdownMenuItem
                key={s}
                variant={DESTRUCTIVE_STATUSES.has(s) ? "destructive" : "default"}
                onClick={() => setStatusChange({ tenant: row.original, target: s })}
              >
                Mudar para {STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </RowActionsMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tenants"
        description="Empresas clientes da plataforma."
        action={<Button onClick={() => setCreating(true)}>Novo tenant</Button>}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchInput placeholder="Buscar por nome ou slug..." />
        <FilterDialog activeCount={(status ? 1 : 0) + (nicheId ? 1 : 0)} onClear={clearAll}>
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
        </FilterDialog>
      </div>

      <ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />
      <ResultCount filtered={filtered} total={total} />

      <DataTable
        tableId="admin-tenants"
        columns={columns}
        data={rows}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        emptyState={
          <EmptyState
            title="Nenhum tenant cadastrado ainda"
            description="Crie o primeiro tenant para começar."
            action={<Button onClick={() => setCreating(true)}>Novo tenant</Button>}
          />
        }
      />

      <PaginationControls total={filtered} />

      <CrudDrawer
        open={creating}
        onOpenChange={setCreating}
        title="Novo tenant"
        description="Crie uma empresa cliente vinculada a um nicho ativo."
      >
        <TenantForm
          niches={niches}
          onSuccess={() => {
            setCreating(false);
            toast.success("Tenant criado.");
          }}
        />
      </CrudDrawer>

      <CrudDrawer
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Editar tenant"
      >
        {editing && (
          <TenantForm
            niches={niches}
            initial={editing}
            onSuccess={() => {
              setEditing(null);
              toast.success("Tenant atualizado.");
            }}
          />
        )}
      </CrudDrawer>

      <ConfirmActionDialog
        open={statusChange !== null}
        onOpenChange={(open) => !open && setStatusChange(null)}
        title="Alterar status do tenant"
        description={
          statusChange
            ? `Mudar o status de "${statusChange.tenant.name}" para ${STATUS_LABELS[statusChange.target]} pode afetar o acesso do tenant.`
            : ""
        }
        destructive={statusChange ? DESTRUCTIVE_STATUSES.has(statusChange.target) : false}
        confirmLabel="Confirmar"
        onConfirm={async () => {
          if (!statusChange) return;
          await setTenantStatusAction(statusChange.tenant.id, statusChange.target);
          toast.success("Status atualizado.");
        }}
      />
    </div>
  );
}
