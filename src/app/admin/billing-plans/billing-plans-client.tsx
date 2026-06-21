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

import { toggleBillingPlanStatusAction } from "./actions";
import type { BillingPlanListRow } from "./data";
import BillingPlanForm, { type BillingPlanInitial } from "./billing-plan-form";

const STATUS_LABELS: Record<string, string> = { active: "Ativo", inactive: "Inativo" };
const STATUS_OPTIONS = ["active", "inactive"] as const;
const PERIOD_LABELS: Record<string, string> = { monthly: "Mensal", yearly: "Anual" };
const PERIOD_OPTIONS = ["monthly", "yearly"] as const;
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toInitial(row: BillingPlanListRow): BillingPlanInitial {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    price: row.price,
    billingPeriod: row.billingPeriod,
    featureIds: row.featureIds,
  };
}

export default function BillingPlansClient({
  rows,
  filtered,
  total,
  features,
}: {
  rows: BillingPlanListRow[];
  filtered: number;
  total: number;
  features: { id: string; name: string }[];
}) {
  const [params, setParams] = useTableParams();
  const [status, setStatus] = useQueryState("status", parseAsString.withOptions({ shallow: false }));
  const [period, setPeriod] = useQueryState("billingPeriod", parseAsString.withOptions({ shallow: false }));

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BillingPlanInitial | null>(null);
  const [toggling, setToggling] = useState<BillingPlanListRow | null>(null);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });
  if (period) activeFilters.push({ key: "billingPeriod", label: `Período: ${PERIOD_LABELS[period] ?? period}`, onRemove: () => setPeriod(null) });

  const clearAll = () => {
    setStatus(null);
    setPeriod(null);
    setParams({ q: null, page: 1 });
  };

  const columns: ColumnDef<BillingPlanListRow, unknown>[] = [
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
      accessorKey: "price",
      meta: { label: "Preço" },
      header: () => <DataTableColumnHeader label="Preço" sortKey="price" />,
      cell: ({ row }) => brl.format(Number(row.original.price)),
    },
    {
      accessorKey: "billingPeriod",
      meta: { label: "Período" },
      header: () => <DataTableColumnHeader label="Período" sortKey="billingPeriod" />,
      cell: ({ row }) => PERIOD_LABELS[row.original.billingPeriod] ?? row.original.billingPeriod,
    },
    {
      id: "features",
      meta: { label: "Features" },
      header: () => <DataTableColumnHeader label="Features" />,
      cell: ({ row }) => (
        <span className="text-xs text-zinc-500">{row.original.featureNames.join(", ") || "—"}</span>
      ),
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
        title="Planos comerciais"
        description="Planos e as features que cada um inclui."
        action={<Button onClick={() => setCreating(true)}><Plus /> Novo plano</Button>}
      />

      <DataTable
        tableId="admin-billing-plans"
        columns={columns}
        data={rows}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome ou key..." />}
        resultCount={<ResultCount filtered={filtered} total={total} />}
        toolbarEnd={
          <FilterButton activeCount={(status ? 1 : 0) + (period ? 1 : 0)} onClear={clearAll}>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Combobox
                value={status ?? "all"}
                onValueChange={(v) => setStatus(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Período</Label>
              <Combobox
                value={period ?? "all"}
                onValueChange={(v) => setPeriod(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...PERIOD_OPTIONS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))]}
              />
            </div>
          </FilterButton>
        }
        activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
        emptyState={
          <EmptyState
            title="Nenhum plano cadastrado ainda"
            action={<Button onClick={() => setCreating(true)}><Plus /> Novo plano</Button>}
          />
        }
      />

      <PaginationControls total={filtered} />

      <FormDrawer open={creating} onOpenChange={setCreating} title="Novo plano comercial" hideFooter contentScrolls={false}>
        <BillingPlanForm
          features={features}
          onCancel={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success("Plano criado.");
          }}
        />
      </FormDrawer>

      <FormDrawer
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Editar plano comercial"
        hideFooter
        contentScrolls={false}
      >
        {editing && (
          <BillingPlanForm
            features={features}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSuccess={() => {
              setEditing(null);
              toast.success("Plano atualizado.");
            }}
          />
        )}
      </FormDrawer>

      <ConfirmActionDialog
        open={toggling !== null}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.status === "active" ? "Inativar plano" : "Ativar plano"}
        description={
          toggling?.status === "active"
            ? `Inativar "${toggling?.name}" impede que ele seja oferecido a novos tenants.`
            : `Reativar "${toggling?.name}" volta a disponibilizá-lo.`
        }
        destructive={toggling?.status === "active"}
        confirmLabel={toggling?.status === "active" ? "Inativar" : "Ativar"}
        onConfirm={async () => {
          if (!toggling) return;
          await toggleBillingPlanStatusAction(toggling.id);
          toast.success("Status atualizado.");
        }}
      />
    </div>
  );
}
