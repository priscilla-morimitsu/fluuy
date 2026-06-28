"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { VariantProps } from "class-variance-authority";
import { ImageIcon, Plus } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ActiveFiltersBar, type ActiveFilter } from "@/components/crud/active-filters-bar";
import { ConfirmActionDialog } from "@/components/crud/confirm-action-dialog";
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
import type { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AffixInput } from "@/components/ui/field";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Label } from "@/components/ui/label";
import {
  OFFER_PLAN_BILLING_CYCLE_LABELS,
  OFFER_PLAN_BILLING_CYCLES,
  OFFER_PLAN_STATUS_LABELS,
  OFFER_PLAN_STATUSES,
  OFFER_PLAN_TYPE_LABELS,
  OFFER_PLAN_TYPES,
} from "@/lib/validations/offer-plan";
import type { TemplateField, TemplateLayout } from "@/lib/validations/template";

import {
  deleteOfferPlanAction,
  getOfferPlanAction,
  setOfferPlanStatusAction,
  type OfferPlanActionResult,
} from "./actions";
import type { OfferPlanListRow } from "./data";
import OfferPlanForm, {
  type CatalogOption,
  type OfferPlanInitial,
} from "./offer-plan-form";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "success",
  inactive: "secondary",
  draft: "warning",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const priceFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtPrice = (v: string | null) => (v == null ? "—" : priceFmt.format(Number(v)));

function notifyResult(res: OfferPlanActionResult, okMsg: string) {
  if (res && "error" in res) toast.error(res.error);
  else if (res && "ok" in res) toast.success(okMsg);
}

export default function PlansClient({
  slug,
  rows,
  filtered,
  total,
  categories,
  services,
  products,
  templateFields,
  templateLayout,
  canWrite,
}: {
  slug: string;
  rows: OfferPlanListRow[];
  filtered: number;
  total: number;
  categories: { id: string; name: string }[];
  services: CatalogOption[];
  products: CatalogOption[];
  templateFields: TemplateField[];
  templateLayout?: TemplateLayout;
  canWrite: boolean;
}) {
  const [params, setParams] = useTableParams();
  const opts = parseAsString.withOptions({ shallow: false });
  const [type, setType] = useQueryState("type", opts);
  const [status, setStatus] = useQueryState("status", opts);
  const [categoryId, setCategoryId] = useQueryState("categoryId", opts);
  const [billingCycle, setBillingCycle] = useQueryState("billingCycle", opts);
  const [availableForSale, setAvailable] = useQueryState("availableForSale", opts);
  const [hasServices, setHasServices] = useQueryState("hasServices", opts);
  const [hasProducts, setHasProducts] = useQueryState("hasProducts", opts);
  const [minPrice, setMinPrice] = useQueryState("minPrice", opts);
  const [maxPrice, setMaxPrice] = useQueryState("maxPrice", opts);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OfferPlanInitial | null>(null);
  const [loadingEdit, startLoadEdit] = useTransition();
  const [statusChange, setStatusChange] = useState<{ plan: OfferPlanListRow; target: string } | null>(null);
  const [deleting, setDeleting] = useState<OfferPlanListRow | null>(null);

  const boolLabel = (v: string | null) => (v === "true" ? "Sim" : v === "false" ? "Não" : v);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (type) activeFilters.push({ key: "type", label: `Tipo: ${OFFER_PLAN_TYPE_LABELS[type as keyof typeof OFFER_PLAN_TYPE_LABELS] ?? type}`, onRemove: () => setType(null) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${OFFER_PLAN_STATUS_LABELS[status as keyof typeof OFFER_PLAN_STATUS_LABELS] ?? status}`, onRemove: () => setStatus(null) });
  if (categoryId) {
    const c = categories.find((x) => x.id === categoryId);
    activeFilters.push({ key: "categoryId", label: `Categoria: ${c?.name ?? categoryId}`, onRemove: () => setCategoryId(null) });
  }
  if (billingCycle) activeFilters.push({ key: "billingCycle", label: `Ciclo: ${OFFER_PLAN_BILLING_CYCLE_LABELS[billingCycle as keyof typeof OFFER_PLAN_BILLING_CYCLE_LABELS] ?? billingCycle}`, onRemove: () => setBillingCycle(null) });
  if (availableForSale) activeFilters.push({ key: "availableForSale", label: `Disponível: ${boolLabel(availableForSale)}`, onRemove: () => setAvailable(null) });
  if (hasServices) activeFilters.push({ key: "hasServices", label: `Com serviços: ${boolLabel(hasServices)}`, onRemove: () => setHasServices(null) });
  if (hasProducts) activeFilters.push({ key: "hasProducts", label: `Com produtos: ${boolLabel(hasProducts)}`, onRemove: () => setHasProducts(null) });
  if (minPrice) activeFilters.push({ key: "minPrice", label: `Preço ≥ ${minPrice}`, onRemove: () => setMinPrice(null) });
  if (maxPrice) activeFilters.push({ key: "maxPrice", label: `Preço ≤ ${maxPrice}`, onRemove: () => setMaxPrice(null) });

  const clearAll = () => {
    setType(null);
    setStatus(null);
    setCategoryId(null);
    setBillingCycle(null);
    setAvailable(null);
    setHasServices(null);
    setHasProducts(null);
    setMinPrice(null);
    setMaxPrice(null);
    setParams({ q: null, page: 1 });
  };

  const openEdit = (id: string) => {
    startLoadEdit(async () => {
      const res = await getOfferPlanAction(slug, id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      const p = res.offerPlan;
      setEditing({
        id: p.id,
        name: p.name,
        description: p.description,
        categoryId: p.categoryId,
        type: p.type,
        price: p.price,
        promotionalPrice: p.promotionalPrice,
        billingCycle: p.billingCycle,
        autoRenew: p.autoRenew,
        expiresAfterDays: p.expiresAfterDays,
        usageLimit: p.usageLimit,
        allowScheduling: p.allowScheduling,
        status: p.status,
        availableForSale: p.availableForSale,
        imageUrl: p.imageUrl,
        internalNotes: p.internalNotes,
        customData: p.customData,
        serviceItems: p.serviceItems.map((i) => ({
          serviceId: i.serviceId,
          quantity: i.quantity,
          usageLimit: i.usageLimit,
          durationOverrideMinutes: i.durationOverrideMinutes,
          priceOverride: i.priceOverride,
          included: i.included,
        })),
        productItems: p.productItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          usageLimit: i.usageLimit,
          priceOverride: i.priceOverride,
          included: i.included,
        })),
      });
    });
  };

  const columns: ColumnDef<OfferPlanListRow, unknown>[] = [
    {
      id: "image",
      enableHiding: false,
      header: () => null,
      cell: ({ row }) =>
        row.original.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.original.imageUrl} alt="" className="size-9 rounded-md border border-border object-cover" />
        ) : (
          <div className="grid size-9 place-items-center rounded-md border border-dashed border-border text-muted-foreground">
            <ImageIcon className="size-4" />
          </div>
        ),
    },
    {
      accessorKey: "name",
      meta: { label: "Nome" },
      header: () => <DataTableColumnHeader label="Nome" sortKey="name" />,
      cell: ({ row }) => (
        <Link href={`/t/${slug}/plans/${row.original.id}`} className="font-medium hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "type",
      meta: { label: "Tipo" },
      header: () => <DataTableColumnHeader label="Tipo" sortKey="type" />,
      cell: ({ row }) => <Badge variant="secondary">{OFFER_PLAN_TYPE_LABELS[row.original.type]}</Badge>,
    },
    {
      id: "category",
      meta: { label: "Categoria" },
      header: () => <DataTableColumnHeader label="Categoria" />,
      cell: ({ row }) => row.original.category?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "price",
      meta: { label: "Preço" },
      header: () => <DataTableColumnHeader label="Preço" sortKey="price" />,
      cell: ({ row }) =>
        row.original.promotionalPrice ? (
          <span className="flex flex-col">
            <span className="font-medium">{fmtPrice(row.original.promotionalPrice)}</span>
            <span className="text-xs text-muted-foreground line-through">{fmtPrice(row.original.price)}</span>
          </span>
        ) : (
          fmtPrice(row.original.price)
        ),
    },
    {
      accessorKey: "billingCycle",
      meta: { label: "Ciclo" },
      header: () => <DataTableColumnHeader label="Ciclo" sortKey="billingCycle" />,
      cell: ({ row }) =>
        row.original.billingCycle ? (
          OFFER_PLAN_BILLING_CYCLE_LABELS[row.original.billingCycle]
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "items",
      meta: { label: "Itens" },
      header: () => <DataTableColumnHeader label="Itens" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.itemCount}</span>,
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: () => <DataTableColumnHeader label="Status" sortKey="status" />,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
          {OFFER_PLAN_STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "availableForSale",
      meta: { label: "Disponível" },
      header: () => <DataTableColumnHeader label="Disponível" sortKey="availableForSale" />,
      cell: ({ row }) => (
        <Badge variant={row.original.availableForSale ? "success" : "secondary"}>
          {row.original.availableForSale ? "Sim" : "Não"}
        </Badge>
      ),
    },
    {
      accessorKey: "updatedAt",
      meta: { label: "Atualizado em" },
      header: () => <DataTableColumnHeader label="Atualizado em" sortKey="updatedAt" />,
      cell: ({ row }) => <span className="text-sm text-zinc-500">{dateFmt.format(row.original.updatedAt)}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => null,
      cell: ({ row }) =>
        canWrite ? (
          <div className="text-right">
            <RowActionsMenu>
              <DropdownMenuItem render={<Link href={`/t/${slug}/plans/${row.original.id}`} />}>Detalhes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(row.original.id)}>Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              {OFFER_PLAN_STATUSES.filter((s) => s !== row.original.status).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusChange({ plan: row.original, target: s })}>
                  Marcar como {OFFER_PLAN_STATUS_LABELS[s]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(row.original)}>
                Excluir
              </DropdownMenuItem>
            </RowActionsMenu>
          </div>
        ) : null,
    },
  ];

  const filterCount =
    (type ? 1 : 0) +
    (status ? 1 : 0) +
    (categoryId ? 1 : 0) +
    (billingCycle ? 1 : 0) +
    (availableForSale ? 1 : 0) +
    (hasServices ? 1 : 0) +
    (hasProducts ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Planos e Pacotes"
        description="Planos, pacotes e combos que a empresa vende aos clientes."
        action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo plano/pacote</Button> : undefined}
      />

      <DataTable
        tableId="tenant-offer-plans"
        columns={columns}
        data={rows}
        onRowClick={canWrite ? (row) => openEdit(row.id) : undefined}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome, descrição, categoria, serviço ou produto..." />}
        resultCount={<ResultCount filtered={filtered} total={total} />}
        toolbarEnd={
          <FilterButton activeCount={filterCount} onClear={clearAll}>
            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <Combobox
                value={type ?? "all"}
                onValueChange={(v) => setType(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...OFFER_PLAN_TYPES.map((t) => ({ value: t, label: OFFER_PLAN_TYPE_LABELS[t] }))]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Combobox
                value={status ?? "all"}
                onValueChange={(v) => setStatus(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...OFFER_PLAN_STATUSES.map((s) => ({ value: s, label: OFFER_PLAN_STATUS_LABELS[s] }))]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Categoria</Label>
              <Combobox
                value={categoryId ?? "all"}
                onValueChange={(v) => setCategoryId(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todas" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                searchPlaceholder="Buscar categoria…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Ciclo de cobrança</Label>
              <Combobox
                value={billingCycle ?? "all"}
                onValueChange={(v) => setBillingCycle(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...OFFER_PLAN_BILLING_CYCLES.map((c) => ({ value: c, label: OFFER_PLAN_BILLING_CYCLE_LABELS[c] }))]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Disponível para venda</Label>
              <Combobox
                value={availableForSale ?? "all"}
                onValueChange={(v) => setAvailable(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, { value: "true", label: "Sim" }, { value: "false", label: "Não" }]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Com serviços</Label>
              <Combobox
                value={hasServices ?? "all"}
                onValueChange={(v) => setHasServices(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, { value: "true", label: "Sim" }, { value: "false", label: "Não" }]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Com produtos</Label>
              <Combobox
                value={hasProducts ?? "all"}
                onValueChange={(v) => setHasProducts(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, { value: "true", label: "Sim" }, { value: "false", label: "Não" }]}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="minPrice">Preço mín.</Label>
                <AffixInput id="minPrice" prefix="R$" inputMode="decimal" defaultValue={minPrice ?? ""} onBlur={(e) => setMinPrice(e.target.value || null)} />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="maxPrice">Preço máx.</Label>
                <AffixInput id="maxPrice" prefix="R$" inputMode="decimal" defaultValue={maxPrice ?? ""} onBlur={(e) => setMaxPrice(e.target.value || null)} />
              </div>
            </div>
          </FilterButton>
        }
        activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
        emptyState={
          <EmptyState
            title="Nenhum plano ou pacote cadastrado ainda"
            description={canWrite ? "Crie o primeiro plano, pacote ou combo." : "Nenhum plano disponível no momento."}
            action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo plano/pacote</Button> : undefined}
          />
        }
      />

      <PaginationControls total={filtered} />

      {canWrite && (
        <>
          <FormDrawer open={creating} onOpenChange={setCreating} title="Novo plano/pacote" description="Cadastre um plano, pacote ou combo." hideFooter contentScrolls={false}>
            <OfferPlanForm
              slug={slug}
              categories={categories}
              services={services}
              products={products}
              templateFields={templateFields}
              templateLayout={templateLayout}
              onCancel={() => setCreating(false)}
              onSuccess={() => {
                setCreating(false);
                toast.success("Plano/pacote criado.");
              }}
            />
          </FormDrawer>

          <FormDrawer open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} title="Editar plano/pacote" hideFooter contentScrolls={false}>
            {editing && (
              <OfferPlanForm
                slug={slug}
                categories={categories}
                services={services}
                products={products}
                templateFields={templateFields}
                initial={editing}
                onCancel={() => setEditing(null)}
                onSuccess={() => {
                  setEditing(null);
                  toast.success("Plano/pacote atualizado.");
                }}
              />
            )}
          </FormDrawer>

          <ConfirmActionDialog
            open={statusChange !== null}
            onOpenChange={(open) => !open && setStatusChange(null)}
            title="Alterar status do plano"
            description={
              statusChange
                ? `Marcar "${statusChange.plan.name}" como ${OFFER_PLAN_STATUS_LABELS[statusChange.target as keyof typeof OFFER_PLAN_STATUS_LABELS]}.`
                : ""
            }
            confirmLabel="Confirmar"
            onConfirm={async () => {
              if (!statusChange) return;
              notifyResult(await setOfferPlanStatusAction(slug, statusChange.plan.id, statusChange.target), "Status atualizado.");
            }}
          />

          <ConfirmActionDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            title="Excluir plano/pacote"
            description={
              deleting
                ? `Esta ação não pode ser desfeita. "${deleting.name}" será excluído permanentemente. Se houver registros vinculados, inative-o em vez de excluir.`
                : ""
            }
            destructive
            confirmLabel="Excluir"
            onConfirm={async () => {
              if (!deleting) return;
              notifyResult(await deleteOfferPlanAction(slug, deleting.id), "Plano/pacote excluído.");
            }}
          />
        </>
      )}

      <span className="sr-only" aria-live="polite">
        {loadingEdit ? "Carregando plano…" : ""}
      </span>
    </div>
  );
}
