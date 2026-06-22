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
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AffixInput } from "@/components/ui/field";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Label } from "@/components/ui/label";
import type { badgeVariants } from "@/components/ui/badge";
import { SERVICE_DELIVERY_MODE_LABELS } from "@/lib/validations/service";
import type { TemplateField } from "@/lib/validations/template";

import {
  deleteServiceAction,
  getServiceAction,
  setServiceStatusAction,
  type ServiceActionResult,
} from "./actions";
import type { ServiceListRow } from "./data";
import ServiceForm, {
  type LocationOption,
  type ProfessionalOption,
  type ServiceInitial,
} from "./service-form";

const STATUS_LABELS: Record<string, string> = { draft: "Rascunho", active: "Ativo", inactive: "Inativo" };
const STATUS_OPTIONS = ["draft", "active", "inactive"] as const;
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "success",
  inactive: "secondary",
  draft: "warning",
};

const DELIVERY_MODES = ["at_location", "at_home", "online"] as const;

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const priceFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtPrice = (v: string | null) => (v == null ? "—" : priceFmt.format(Number(v)));

function notifyResult(res: ServiceActionResult, okMsg: string) {
  if (res && "error" in res) toast.error(res.error);
  else if (res && "ok" in res) toast.success(okMsg);
}

export default function ServicesClient({
  slug,
  rows,
  filtered,
  total,
  categories,
  professionals,
  locations,
  templateFields,
  canWrite,
}: {
  slug: string;
  rows: ServiceListRow[];
  filtered: number;
  total: number;
  categories: { id: string; name: string }[];
  professionals: ProfessionalOption[];
  locations: LocationOption[];
  templateFields: TemplateField[];
  canWrite: boolean;
}) {
  const [params, setParams] = useTableParams();
  const opts = parseAsString.withOptions({ shallow: false });
  const [status, setStatus] = useQueryState("status", opts);
  const [categoryId, setCategoryId] = useQueryState("categoryId", opts);
  const [availableForBooking, setAvailable] = useQueryState("availableForBooking", opts);
  const [requiresScheduling, setRequires] = useQueryState("requiresScheduling", opts);
  const [deliveryMode, setDeliveryMode] = useQueryState("deliveryMode", opts);
  const [minPrice, setMinPrice] = useQueryState("minPrice", opts);
  const [maxPrice, setMaxPrice] = useQueryState("maxPrice", opts);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ServiceInitial | null>(null);
  const [loadingEdit, startLoadEdit] = useTransition();
  const [statusChange, setStatusChange] = useState<{ service: ServiceListRow; target: string } | null>(null);
  const [deleting, setDeleting] = useState<ServiceListRow | null>(null);

  const boolLabel = (v: string | null) => (v === "true" ? "Sim" : v === "false" ? "Não" : v);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });
  if (categoryId) {
    const c = categories.find((x) => x.id === categoryId);
    activeFilters.push({ key: "categoryId", label: `Categoria: ${c?.name ?? categoryId}`, onRemove: () => setCategoryId(null) });
  }
  if (availableForBooking) activeFilters.push({ key: "availableForBooking", label: `Disponível: ${boolLabel(availableForBooking)}`, onRemove: () => setAvailable(null) });
  if (requiresScheduling) activeFilters.push({ key: "requiresScheduling", label: `Agendamento: ${boolLabel(requiresScheduling)}`, onRemove: () => setRequires(null) });
  if (deliveryMode) activeFilters.push({ key: "deliveryMode", label: `Modalidade: ${SERVICE_DELIVERY_MODE_LABELS[deliveryMode as keyof typeof SERVICE_DELIVERY_MODE_LABELS] ?? deliveryMode}`, onRemove: () => setDeliveryMode(null) });
  if (minPrice) activeFilters.push({ key: "minPrice", label: `Preço ≥ ${minPrice}`, onRemove: () => setMinPrice(null) });
  if (maxPrice) activeFilters.push({ key: "maxPrice", label: `Preço ≤ ${maxPrice}`, onRemove: () => setMaxPrice(null) });

  const clearAll = () => {
    setStatus(null);
    setCategoryId(null);
    setAvailable(null);
    setRequires(null);
    setDeliveryMode(null);
    setMinPrice(null);
    setMaxPrice(null);
    setParams({ q: null, page: 1 });
  };

  const openEdit = (id: string) => {
    startLoadEdit(async () => {
      const res = await getServiceAction(slug, id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      const s = res.service;
      setEditing({
        id: s.id,
        name: s.name,
        description: s.description,
        categoryId: s.categoryId,
        basePrice: s.basePrice,
        promotionalPrice: s.promotionalPrice,
        estimatedDurationMinutes: s.estimatedDurationMinutes,
        status: s.status,
        availableForBooking: s.availableForBooking,
        requiresScheduling: s.requiresScheduling,
        deliveryModes: s.deliveryModes,
        onlineInstructions: s.onlineInstructions,
        homeServiceNotes: s.homeServiceNotes,
        imageUrl: s.imageUrl,
        internalNotes: s.internalNotes,
        customData: s.customData,
        professionalIds: s.professionalIds,
        locationIds: s.locationIds,
      });
    });
  };

  const columns: ColumnDef<ServiceListRow, unknown>[] = [
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
        <Link href={`/t/${slug}/services/${row.original.id}`} className="font-medium hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "category",
      meta: { label: "Categoria" },
      header: () => <DataTableColumnHeader label="Categoria" />,
      cell: ({ row }) => row.original.category?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "basePrice",
      meta: { label: "Preço" },
      header: () => <DataTableColumnHeader label="Preço" sortKey="basePrice" />,
      cell: ({ row }) =>
        row.original.promotionalPrice ? (
          <span className="flex flex-col">
            <span className="font-medium">{fmtPrice(row.original.promotionalPrice)}</span>
            <span className="text-xs text-muted-foreground line-through">{fmtPrice(row.original.basePrice)}</span>
          </span>
        ) : (
          fmtPrice(row.original.basePrice)
        ),
    },
    {
      accessorKey: "estimatedDurationMinutes",
      meta: { label: "Duração" },
      header: () => <DataTableColumnHeader label="Duração" sortKey="estimatedDurationMinutes" />,
      cell: ({ row }) =>
        row.original.estimatedDurationMinutes ? `${row.original.estimatedDurationMinutes} min` : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "deliveryModes",
      meta: { label: "Modalidades" },
      header: () => <DataTableColumnHeader label="Modalidades" />,
      cell: ({ row }) => (
        <span className="flex flex-wrap gap-1">
          {row.original.deliveryModes.map((m) => (
            <Badge key={m} variant="secondary">
              {SERVICE_DELIVERY_MODE_LABELS[m]}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: () => <DataTableColumnHeader label="Status" sortKey="status" />,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "availableForBooking",
      meta: { label: "Disponível" },
      header: () => <DataTableColumnHeader label="Disponível" sortKey="availableForBooking" />,
      cell: ({ row }) => (
        <Badge variant={row.original.availableForBooking ? "success" : "secondary"}>
          {row.original.availableForBooking ? "Sim" : "Não"}
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
              <DropdownMenuItem render={<Link href={`/t/${slug}/services/${row.original.id}`} />}>
                Disponibilidade
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(row.original.id)}>Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.filter((s) => s !== row.original.status).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusChange({ service: row.original, target: s })}>
                  Marcar como {STATUS_LABELS[s]}
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
    (status ? 1 : 0) +
    (categoryId ? 1 : 0) +
    (availableForBooking ? 1 : 0) +
    (requiresScheduling ? 1 : 0) +
    (deliveryMode ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Serviços"
        description="Catálogo de serviços oferecidos pela empresa."
        action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo serviço</Button> : undefined}
      />

      <DataTable
        tableId="tenant-services"
        columns={columns}
        data={rows}
        onRowClick={canWrite ? (row) => openEdit(row.id) : undefined}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome, descrição ou categoria..." />}
        resultCount={<ResultCount filtered={filtered} total={total} />}
        toolbarEnd={
          <FilterButton activeCount={filterCount} onClear={clearAll}>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Combobox
                value={status ?? "all"}
                onValueChange={(v) => setStatus(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
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
              <Label>Modalidade</Label>
              <Combobox
                value={deliveryMode ?? "all"}
                onValueChange={(v) => setDeliveryMode(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todas" }, ...DELIVERY_MODES.map((m) => ({ value: m, label: SERVICE_DELIVERY_MODE_LABELS[m] }))]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Disponível para reserva</Label>
              <Combobox
                value={availableForBooking ?? "all"}
                onValueChange={(v) => setAvailable(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, { value: "true", label: "Sim" }, { value: "false", label: "Não" }]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Exige agendamento</Label>
              <Combobox
                value={requiresScheduling ?? "all"}
                onValueChange={(v) => setRequires(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, { value: "true", label: "Sim" }, { value: "false", label: "Não" }]}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="minPrice">Preço mín.</Label>
                <AffixInput
                  id="minPrice"
                  prefix="R$"
                  inputMode="decimal"
                  defaultValue={minPrice ?? ""}
                  onBlur={(e) => setMinPrice(e.target.value || null)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="maxPrice">Preço máx.</Label>
                <AffixInput
                  id="maxPrice"
                  prefix="R$"
                  inputMode="decimal"
                  defaultValue={maxPrice ?? ""}
                  onBlur={(e) => setMaxPrice(e.target.value || null)}
                />
              </div>
            </div>
          </FilterButton>
        }
        activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
        emptyState={
          <EmptyState
            title="Nenhum serviço cadastrado ainda"
            description={canWrite ? "Crie o primeiro serviço do catálogo." : "Nenhum serviço disponível no momento."}
            action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo serviço</Button> : undefined}
          />
        }
      />

      <PaginationControls total={filtered} />

      {canWrite && (
        <>
          <FormDrawer
            open={creating}
            onOpenChange={setCreating}
            title="Novo serviço"
            description="Cadastre um serviço do catálogo da empresa."
            hideFooter
            contentScrolls={false}
          >
            <ServiceForm
              slug={slug}
              categories={categories}
              professionals={professionals}
              locations={locations}
              templateFields={templateFields}
              onCancel={() => setCreating(false)}
              onSuccess={() => {
                setCreating(false);
                toast.success("Serviço criado.");
              }}
            />
          </FormDrawer>

          <FormDrawer
            open={editing !== null}
            onOpenChange={(open) => !open && setEditing(null)}
            title="Editar serviço"
            hideFooter
            contentScrolls={false}
          >
            {editing && (
              <ServiceForm
                slug={slug}
                categories={categories}
                professionals={professionals}
                locations={locations}
                templateFields={templateFields}
                initial={editing}
                onCancel={() => setEditing(null)}
                onSuccess={() => {
                  setEditing(null);
                  toast.success("Serviço atualizado.");
                }}
              />
            )}
          </FormDrawer>

          <ConfirmActionDialog
            open={statusChange !== null}
            onOpenChange={(open) => !open && setStatusChange(null)}
            title="Alterar status do serviço"
            description={
              statusChange
                ? `Marcar "${statusChange.service.name}" como ${STATUS_LABELS[statusChange.target]}.`
                : ""
            }
            confirmLabel="Confirmar"
            onConfirm={async () => {
              if (!statusChange) return;
              notifyResult(
                await setServiceStatusAction(slug, statusChange.service.id, statusChange.target),
                "Status atualizado.",
              );
            }}
          />

          <ConfirmActionDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            title="Excluir serviço"
            description={
              deleting
                ? `Esta ação não pode ser desfeita. O serviço "${deleting.name}" será excluído permanentemente. Se houver registros vinculados, inative-o em vez de excluir.`
                : ""
            }
            destructive
            confirmLabel="Excluir"
            onConfirm={async () => {
              if (!deleting) return;
              notifyResult(await deleteServiceAction(slug, deleting.id), "Serviço excluído.");
            }}
          />
        </>
      )}

      <span className="sr-only" aria-live="polite">
        {loadingEdit ? "Carregando serviço…" : ""}
      </span>
    </div>
  );
}
