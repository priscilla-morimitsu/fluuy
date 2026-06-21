"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ImageOff, Plus } from "lucide-react";
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import type { TenantRole } from "@/components/nav/nav-types";
import type { TemplateField } from "@/lib/validations/template";

import {
  deleteProductAction,
  fetchProductAction,
  setProductAvailabilityAction,
  setProductStatusAction,
} from "./actions";
import type { ProductListRow } from "./data";
import { FormDrawer } from "@/components/ui/form-drawer";
import ProductForm, { type ProductCategoryOption, type ProductInitial } from "./product-form";

const STATUS_LABELS: Record<string, string> = { draft: "Rascunho", active: "Ativo", inactive: "Inativo" };
const STATUS_OPTIONS = ["draft", "active", "inactive"] as const;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const fmt = (v: string | null) => (v ? money.format(Number(v)) : "—");

export default function ProductsClient({
  slug,
  role,
  rows,
  filtered,
  total,
  categories,
  templateFields,
}: {
  slug: string;
  role: TenantRole;
  rows: ProductListRow[];
  filtered: number;
  total: number;
  categories: ProductCategoryOption[];
  templateFields: TemplateField[];
}) {
  const canWrite = role !== "tenant_viewer";
  const canDelete = role === "tenant_owner" || role === "tenant_manager";
  const canManageCategories = canDelete;

  const [params, setParams] = useTableParams();
  const [status, setStatus] = useQueryState("status", parseAsString.withOptions({ shallow: false }));
  const [categoryId, setCategoryId] = useQueryState("categoryId", parseAsString.withOptions({ shallow: false }));
  const [available, setAvailable] = useQueryState("availableForSale", parseAsString.withOptions({ shallow: false }));

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProductInitial | null>(null);
  const [deleting, setDeleting] = useState<ProductListRow | null>(null);
  const [statusToggle, setStatusToggle] = useState<ProductListRow | null>(null);
  const [, startEdit] = useTransition();

  const openEdit = (id: string) =>
    startEdit(async () => {
      const p = await fetchProductAction(slug, id);
      if (p) setEditing(p);
      else toast.error("Produto não encontrado.");
    });

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });
  if (categoryId) {
    const c = categories.find((x) => x.id === categoryId);
    activeFilters.push({ key: "categoryId", label: `Categoria: ${c?.name ?? categoryId}`, onRemove: () => setCategoryId(null) });
  }
  if (available) activeFilters.push({ key: "availableForSale", label: `Disponível: ${available === "true" ? "Sim" : "Não"}`, onRemove: () => setAvailable(null) });

  const clearAll = () => {
    setStatus(null);
    setCategoryId(null);
    setAvailable(null);
    setParams({ q: null, page: 1 });
  };
  const activeCount = (status ? 1 : 0) + (categoryId ? 1 : 0) + (available ? 1 : 0);

  const columns: ColumnDef<ProductListRow, unknown>[] = [
    {
      id: "image",
      meta: { label: "Imagem" },
      header: () => <DataTableColumnHeader label="Imagem" />,
      cell: ({ row }) =>
        row.original.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.original.imageUrl} alt="" className="size-10 rounded-lg border border-border object-cover" />
        ) : (
          <span className="grid size-10 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
            <ImageOff className="size-4" />
          </span>
        ),
    },
    {
      accessorKey: "name",
      meta: { label: "Nome" },
      header: () => <DataTableColumnHeader label="Nome" sortKey="name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: "category",
      meta: { label: "Categoria" },
      header: () => <DataTableColumnHeader label="Categoria" />,
      cell: ({ row }) => row.original.category?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "brand",
      meta: { label: "Marca" },
      header: () => <DataTableColumnHeader label="Marca" />,
      cell: ({ row }) => row.original.brand ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "salePrice",
      meta: { label: "Preço" },
      header: () => <DataTableColumnHeader label="Preço" sortKey="salePrice" />,
      cell: ({ row }) => <span className="tabular-nums">{fmt(row.original.salePrice)}</span>,
    },
    {
      accessorKey: "promotionalPrice",
      meta: { label: "Promoção" },
      header: () => <DataTableColumnHeader label="Promoção" sortKey="promotionalPrice" />,
      cell: ({ row }) => <span className="tabular-nums">{fmt(row.original.promotionalPrice)}</span>,
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: () => <DataTableColumnHeader label="Status" sortKey="status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "success" : row.original.status === "draft" ? "warning" : "secondary"}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
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
      cell: ({ row }) => {
        const p = row.original;
        const isActive = p.status === "active";
        if (!canWrite) return null;
        return (
          <div className="text-right">
            <RowActionsMenu>
              <DropdownMenuItem onClick={() => openEdit(p.id)}>Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusToggle(p)}>{isActive ? "Inativar" : "Ativar"}</DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const res = await setProductAvailabilityAction(slug, p.id, !p.availableForSale);
                  if (res && "error" in res) toast.error(res.error);
                  else toast.success("Disponibilidade atualizada.");
                }}
              >
                {p.availableForSale ? "Marcar indisponível" : "Marcar disponível"}
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                  Excluir
                </DropdownMenuItem>
              )}
            </RowActionsMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Produtos"
        description="Catálogo de produtos da sua empresa."
        action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo produto</Button> : undefined}
      />

      <DataTable
        tableId="tenant-products"
        columns={columns}
        data={rows}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome, marca, SKU ou código..." />}
        resultCount={<ResultCount filtered={filtered} total={total} />}
        toolbarEnd={
          <FilterButton activeCount={activeCount} onClear={clearAll}>
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
              <Label>Status</Label>
              <Combobox
                value={status ?? "all"}
                onValueChange={(v) => setStatus(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Disponível</Label>
              <Combobox
                value={available ?? "all"}
                onValueChange={(v) => setAvailable(v === "all" ? null : v)}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "true", label: "Sim" },
                  { value: "false", label: "Não" },
                ]}
              />
            </div>
          </FilterButton>
        }
        activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
        emptyState={
          <EmptyState
            title="Nenhum produto cadastrado ainda"
            action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo produto</Button> : undefined}
          />
        }
      />

      <PaginationControls total={filtered} />

      <FormDrawer open={creating} onOpenChange={setCreating} title="Novo produto" hideFooter contentScrolls={false}>
        <ProductForm
          slug={slug}
          categories={categories}
          templateFields={templateFields}
          canManageCategories={canManageCategories}
          onCancel={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success("Produto criado.");
          }}
        />
      </FormDrawer>

      <FormDrawer open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title="Editar produto" hideFooter contentScrolls={false}>
        {editing && (
          <ProductForm
            slug={slug}
            categories={categories}
            templateFields={templateFields}
            canManageCategories={canManageCategories}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSuccess={() => {
              setEditing(null);
              toast.success("Produto atualizado.");
            }}
          />
        )}
      </FormDrawer>

      <ConfirmActionDialog
        open={statusToggle !== null}
        onOpenChange={(o) => !o && setStatusToggle(null)}
        title={statusToggle?.status === "active" ? "Inativar produto" : "Ativar produto"}
        description={
          statusToggle?.status === "active"
            ? `"${statusToggle?.name}" deixará de ser usado pelo atendimento.`
            : `"${statusToggle?.name}" ficará ativo (visível à IA se disponível para venda).`
        }
        destructive={statusToggle?.status === "active"}
        confirmLabel={statusToggle?.status === "active" ? "Inativar" : "Ativar"}
        onConfirm={async () => {
          if (!statusToggle) return;
          const next = statusToggle.status === "active" ? "inactive" : "active";
          const res = await setProductStatusAction(slug, statusToggle.id, next);
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Status atualizado.");
        }}
      />

      <ConfirmActionDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir produto"
        description={`Excluir "${deleting?.name}"? Esta ação não pode ser desfeita. Se houver registros vinculados, inative o produto.`}
        destructive
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteProductAction(slug, deleting.id);
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Produto excluído.");
        }}
      />
    </div>
  );
}
