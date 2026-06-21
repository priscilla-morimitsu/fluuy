"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
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
import { FormDrawer } from "@/components/ui/form-drawer";
import { Label } from "@/components/ui/label";
import type { TemplateField } from "@/lib/validations/template";
import {
  ORDER_CHANNELS,
  ORDER_FULFILLMENT_TYPES,
  ORDER_PAYMENT_METHODS,
  ORDER_PAYMENT_STATUSES,
  ORDER_SOURCES,
  ORDER_STATUSES,
} from "@/lib/validations/order";

import { deleteOrderAction, fetchOrderForEditAction, type OrderActionResult } from "./actions";
import type { OrderCatalogOption, OrderListRow } from "./data";
import OrderForm, { type OrderFormInitial } from "./order-form";
import {
  fmtBRL,
  ORDER_CHANNEL_LABELS,
  ORDER_FULFILLMENT_LABELS,
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_SOURCE_LABELS,
  ORDER_STATUS_LABELS,
  orderStatusVariant,
  paymentStatusVariant,
} from "./labels";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function notifyResult(res: OrderActionResult, okMsg: string) {
  if (res && "error" in res) toast.error(res.error);
  else if (res && "ok" in res) toast.success(okMsg);
}

export default function OrdersClient({
  slug,
  rows,
  filtered,
  total,
  customers,
  catalog,
  templateFields,
  canWrite,
}: {
  slug: string;
  rows: OrderListRow[];
  filtered: number;
  total: number;
  customers: { id: string; name: string; phone: string }[];
  catalog: { products: OrderCatalogOption[]; services: OrderCatalogOption[]; offerPlans: OrderCatalogOption[] };
  templateFields: TemplateField[];
  canWrite: boolean;
}) {
  const [params, setParams] = useTableParams();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OrderFormInitial | null>(null);
  const [, startEdit] = useTransition();

  const openEdit = (id: string) =>
    startEdit(async () => {
      const order = await fetchOrderForEditAction(slug, id);
      if (order) setEditing(order);
      else toast.error("Pedido não encontrado.");
    });

  const opts = parseAsString.withOptions({ shallow: false });
  const [status, setStatus] = useQueryState("status", opts);
  const [source, setSource] = useQueryState("source", opts);
  const [channel, setChannel] = useQueryState("channel", opts);
  const [fulfillmentType, setFulfillment] = useQueryState("fulfillmentType", opts);
  const [paymentMethod, setPayMethod] = useQueryState("paymentMethod", opts);
  const [paymentStatus, setPayStatus] = useQueryState("paymentStatus", opts);
  const [customerId, setCustomerId] = useQueryState("customerId", opts);
  const [createdByAgent, setByAgent] = useQueryState("createdByAgent", opts);

  const [deleting, setDeleting] = useState<OrderListRow | null>(null);

  const boolLabel = (v: string | null) => (v === "true" ? "Sim" : v === "false" ? "Não" : v);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${ORDER_STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });
  if (source) activeFilters.push({ key: "source", label: `Origem: ${ORDER_SOURCE_LABELS[source] ?? source}`, onRemove: () => setSource(null) });
  if (channel) activeFilters.push({ key: "channel", label: `Canal: ${ORDER_CHANNEL_LABELS[channel] ?? channel}`, onRemove: () => setChannel(null) });
  if (fulfillmentType) activeFilters.push({ key: "fulfillmentType", label: `Atendimento: ${ORDER_FULFILLMENT_LABELS[fulfillmentType] ?? fulfillmentType}`, onRemove: () => setFulfillment(null) });
  if (paymentMethod) activeFilters.push({ key: "paymentMethod", label: `Pagamento: ${ORDER_PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod}`, onRemove: () => setPayMethod(null) });
  if (paymentStatus) activeFilters.push({ key: "paymentStatus", label: `Pgto: ${ORDER_PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus}`, onRemove: () => setPayStatus(null) });
  if (customerId) {
    const c = customers.find((x) => x.id === customerId);
    activeFilters.push({ key: "customerId", label: `Cliente: ${c?.name ?? customerId}`, onRemove: () => setCustomerId(null) });
  }
  if (createdByAgent) activeFilters.push({ key: "createdByAgent", label: `Criado por IA: ${boolLabel(createdByAgent)}`, onRemove: () => setByAgent(null) });

  const clearAll = () => {
    setStatus(null);
    setSource(null);
    setChannel(null);
    setFulfillment(null);
    setPayMethod(null);
    setPayStatus(null);
    setCustomerId(null);
    setByAgent(null);
    setParams({ q: null, page: 1 });
  };

  const columns: ColumnDef<OrderListRow, unknown>[] = [
    {
      accessorKey: "orderNumber",
      meta: { label: "Pedido" },
      header: () => <DataTableColumnHeader label="Pedido" sortKey="orderNumber" />,
      cell: ({ row }) => (
        <Link href={`/t/${slug}/orders/${row.original.id}`} className="font-mono font-medium hover:underline">
          {row.original.orderCode}
        </Link>
      ),
    },
    {
      id: "customer",
      meta: { label: "Cliente" },
      header: () => <DataTableColumnHeader label="Cliente" />,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-medium">{row.original.customer.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.customer.phone}</span>
        </span>
      ),
    },
    {
      accessorKey: "source",
      meta: { label: "Origem" },
      header: () => <DataTableColumnHeader label="Origem" sortKey="source" />,
      cell: ({ row }) => ORDER_SOURCE_LABELS[row.original.source] ?? row.original.source,
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: () => <DataTableColumnHeader label="Status" sortKey="status" />,
      cell: ({ row }) => (
        <Badge variant={orderStatusVariant(row.original.status)}>{ORDER_STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>
      ),
    },
    {
      id: "fulfillment",
      meta: { label: "Atendimento" },
      header: () => <DataTableColumnHeader label="Atendimento" />,
      cell: ({ row }) => (row.original.fulfillmentType ? ORDER_FULFILLMENT_LABELS[row.original.fulfillmentType] : <span className="text-muted-foreground">—</span>),
    },
    {
      id: "items",
      meta: { label: "Itens" },
      header: () => <DataTableColumnHeader label="Itens" />,
      cell: ({ row }) => row.original.itemsCount,
    },
    {
      accessorKey: "total",
      meta: { label: "Total" },
      header: () => <DataTableColumnHeader label="Total" sortKey="total" />,
      cell: ({ row }) => <span className="font-medium">{fmtBRL(row.original.total)}</span>,
    },
    {
      accessorKey: "paymentStatus",
      meta: { label: "Pagamento" },
      header: () => <DataTableColumnHeader label="Pagamento" sortKey="paymentStatus" />,
      cell: ({ row }) => (
        <Badge variant={paymentStatusVariant(row.original.paymentStatus)}>{ORDER_PAYMENT_STATUS_LABELS[row.original.paymentStatus] ?? row.original.paymentStatus}</Badge>
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
            <DropdownMenuItem render={<Link href={`/t/${slug}/orders/${row.original.id}`} />}>Detalhes</DropdownMenuItem>
            {canWrite && <DropdownMenuItem onClick={() => openEdit(row.original.id)}>Editar</DropdownMenuItem>}
            {canWrite && row.original.status === "draft" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(row.original)}>
                  Excluir
                </DropdownMenuItem>
              </>
            )}
          </RowActionsMenu>
        </div>
      ),
    },
  ];

  const filterCount =
    (status ? 1 : 0) + (source ? 1 : 0) + (channel ? 1 : 0) + (fulfillmentType ? 1 : 0) + (paymentMethod ? 1 : 0) + (paymentStatus ? 1 : 0) + (customerId ? 1 : 0) + (createdByAgent ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pedidos"
        description="Vendas e solicitações comerciais dos clientes."
        action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo pedido</Button> : undefined}
      />

      <DataTable
        tableId="tenant-orders"
        columns={columns}
        data={rows}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por código, cliente, telefone ou item..." />}
        resultCount={<ResultCount filtered={filtered} total={total} />}
        toolbarEnd={
          <FilterButton activeCount={filterCount} onClear={clearAll}>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Combobox value={status ?? "all"} onValueChange={(v) => setStatus(v === "all" ? null : v)} options={[{ value: "all", label: "Todos" }, ...ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] }))]} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Pagamento</Label>
              <Combobox value={paymentStatus ?? "all"} onValueChange={(v) => setPayStatus(v === "all" ? null : v)} options={[{ value: "all", label: "Todos" }, ...ORDER_PAYMENT_STATUSES.map((s) => ({ value: s, label: ORDER_PAYMENT_STATUS_LABELS[s] }))]} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Origem</Label>
              <Combobox value={source ?? "all"} onValueChange={(v) => setSource(v === "all" ? null : v)} options={[{ value: "all", label: "Todas" }, ...ORDER_SOURCES.map((s) => ({ value: s, label: ORDER_SOURCE_LABELS[s] }))]} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Canal</Label>
              <Combobox value={channel ?? "all"} onValueChange={(v) => setChannel(v === "all" ? null : v)} options={[{ value: "all", label: "Todos" }, ...ORDER_CHANNELS.map((c) => ({ value: c, label: ORDER_CHANNEL_LABELS[c] }))]} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Atendimento</Label>
              <Combobox value={fulfillmentType ?? "all"} onValueChange={(v) => setFulfillment(v === "all" ? null : v)} options={[{ value: "all", label: "Todos" }, ...ORDER_FULFILLMENT_TYPES.map((f) => ({ value: f, label: ORDER_FULFILLMENT_LABELS[f] }))]} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Forma de pagamento</Label>
              <Combobox value={paymentMethod ?? "all"} onValueChange={(v) => setPayMethod(v === "all" ? null : v)} options={[{ value: "all", label: "Todas" }, ...ORDER_PAYMENT_METHODS.map((m) => ({ value: m, label: ORDER_PAYMENT_METHOD_LABELS[m] }))]} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Cliente</Label>
              <Combobox value={customerId ?? "all"} onValueChange={(v) => setCustomerId(v === "all" ? null : v)} options={[{ value: "all", label: "Todos" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} searchPlaceholder="Buscar cliente…" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Criado por IA</Label>
              <Combobox value={createdByAgent ?? "all"} onValueChange={(v) => setByAgent(v === "all" ? null : v)} options={[{ value: "all", label: "Todos" }, { value: "true", label: "Sim" }, { value: "false", label: "Não" }]} />
            </div>
          </FilterButton>
        }
        activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
        emptyState={
          <EmptyState
            title="Nenhum pedido ainda"
            description={canWrite ? "Crie o primeiro pedido manualmente." : "Nenhum pedido disponível."}
            action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo pedido</Button> : undefined}
          />
        }
      />

      <PaginationControls total={filtered} />

      <FormDrawer open={creating} onOpenChange={setCreating} title="Novo pedido" hideFooter contentScrolls={false}>
        <OrderForm
          slug={slug}
          customers={customers}
          catalog={catalog}
          templateFields={templateFields}
          onCancel={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success("Pedido criado.");
          }}
        />
      </FormDrawer>

      <FormDrawer
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Editar pedido"
        hideFooter
        contentScrolls={false}
      >
        {editing && (
          <OrderForm
            slug={slug}
            customers={customers}
            catalog={catalog}
            templateFields={templateFields}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSuccess={() => {
              setEditing(null);
              toast.success("Pedido atualizado.");
            }}
          />
        )}
      </FormDrawer>

      <ConfirmActionDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir pedido"
        description={
          deleting
            ? `O pedido ${deleting.orderCode} (rascunho) será excluído permanentemente. Pedidos com pagamento ou histórico devem ser cancelados, não excluídos.`
            : ""
        }
        destructive
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!deleting) return;
          notifyResult(await deleteOrderAction(slug, deleting.id), "Pedido excluído.");
        }}
      />
    </div>
  );
}
