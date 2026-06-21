"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { VariantProps } from "class-variance-authority";
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
import type { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Label } from "@/components/ui/label";
import {
  CUSTOMER_PERSON_TYPE_LABELS,
  CUSTOMER_SOURCE_LABELS,
  CUSTOMER_SOURCES,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUSES,
  pluralizePt,
} from "@/lib/validations/customer";
import type { TemplateField } from "@/lib/validations/template";

import {
  deleteCustomerAction,
  getCustomerAction,
  setCustomerStatusAction,
  type CustomerActionResult,
} from "./actions";
import type { CustomerListRow } from "./data";
import CustomerForm, { type CustomerInitial, type CustomerTagOption } from "./customer-form";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "success",
  inactive: "secondary",
  blocked: "destructive",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const maskPhone = (v: string | null) => v ?? "—";

function notifyResult(res: CustomerActionResult, okMsg: string) {
  if (res && "error" in res) toast.error(res.error);
  else if (res && "ok" in res) toast.success(okMsg);
}

export default function CustomersClient({
  slug,
  rows,
  filtered,
  total,
  tags,
  templateFields,
  customerLabel,
  canWrite,
  canDelete,
}: {
  slug: string;
  rows: CustomerListRow[];
  filtered: number;
  total: number;
  tags: CustomerTagOption[];
  templateFields: TemplateField[];
  customerLabel: string | null;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const singular = customerLabel?.trim() || "Cliente";
  const plural = pluralizePt(singular);

  const [params, setParams] = useTableParams();
  const opts = parseAsString.withOptions({ shallow: false });
  const [status, setStatus] = useQueryState("status", opts);
  const [source, setSource] = useQueryState("source", opts);
  const [personType, setPersonType] = useQueryState("personType", opts);
  const [tagId, setTagId] = useQueryState("tagId", opts);
  const [hasAddress, setHasAddress] = useQueryState("hasAddress", opts);
  const [hasConsent, setHasConsent] = useQueryState("hasConsent", opts);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomerInitial | null>(null);
  const [loadingEdit, startLoadEdit] = useTransition();
  const [statusChange, setStatusChange] = useState<{ customer: CustomerListRow; target: string } | null>(null);
  const [deleting, setDeleting] = useState<CustomerListRow | null>(null);

  const boolLabel = (v: string | null) => (v === "true" ? "Sim" : v === "false" ? "Não" : v);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${CUSTOMER_STATUS_LABELS[status as keyof typeof CUSTOMER_STATUS_LABELS] ?? status}`, onRemove: () => setStatus(null) });
  if (source) activeFilters.push({ key: "source", label: `Origem: ${CUSTOMER_SOURCE_LABELS[source as keyof typeof CUSTOMER_SOURCE_LABELS] ?? source}`, onRemove: () => setSource(null) });
  if (personType) activeFilters.push({ key: "personType", label: `Tipo: ${CUSTOMER_PERSON_TYPE_LABELS[personType as keyof typeof CUSTOMER_PERSON_TYPE_LABELS] ?? personType}`, onRemove: () => setPersonType(null) });
  if (tagId) {
    const t = tags.find((x) => x.id === tagId);
    activeFilters.push({ key: "tagId", label: `Tag: ${t?.name ?? tagId}`, onRemove: () => setTagId(null) });
  }
  if (hasAddress) activeFilters.push({ key: "hasAddress", label: `Com endereço: ${boolLabel(hasAddress)}`, onRemove: () => setHasAddress(null) });
  if (hasConsent) activeFilters.push({ key: "hasConsent", label: `Consentimento: ${boolLabel(hasConsent)}`, onRemove: () => setHasConsent(null) });

  const clearAll = () => {
    setStatus(null);
    setSource(null);
    setPersonType(null);
    setTagId(null);
    setHasAddress(null);
    setHasConsent(null);
    setParams({ q: null, page: 1 });
  };

  const openEdit = (id: string) => {
    startLoadEdit(async () => {
      const res = await getCustomerAction(slug, id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setEditing(res.customer);
    });
  };

  const columns: ColumnDef<CustomerListRow, unknown>[] = [
    {
      accessorKey: "name",
      meta: { label: "Nome" },
      header: () => <DataTableColumnHeader label="Nome" sortKey="name" />,
      cell: ({ row }) => (
        <Link href={`/t/${slug}/customers/${row.original.id}`} className="font-medium hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "phone",
      meta: { label: "Telefone" },
      header: () => <DataTableColumnHeader label="Telefone" />,
      cell: ({ row }) => <span className="text-sm">{maskPhone(row.original.phone)}</span>,
    },
    {
      id: "whatsapp",
      meta: { label: "WhatsApp" },
      header: () => <DataTableColumnHeader label="WhatsApp" />,
      cell: ({ row }) => <span className="text-sm">{maskPhone(row.original.whatsapp)}</span>,
    },
    {
      id: "email",
      meta: { label: "E-mail" },
      header: () => <DataTableColumnHeader label="E-mail" />,
      cell: ({ row }) => row.original.email ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: "tags",
      meta: { label: "Tags" },
      header: () => <DataTableColumnHeader label="Tags" />,
      cell: ({ row }) =>
        row.original.tags.length ? (
          <span className="flex flex-wrap gap-1">
            {row.original.tags.map((t) => (
              <Badge key={t.id} variant="secondary">
                {t.name}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "status",
      meta: { label: "Status" },
      header: () => <DataTableColumnHeader label="Status" sortKey="status" />,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
          {CUSTOMER_STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "source",
      meta: { label: "Origem" },
      header: () => <DataTableColumnHeader label="Origem" sortKey="source" />,
      cell: ({ row }) =>
        row.original.source ? (
          CUSTOMER_SOURCE_LABELS[row.original.source]
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "consent",
      meta: { label: "Consentimento" },
      header: () => <DataTableColumnHeader label="Consentimento" />,
      cell: ({ row }) => (
        <Badge variant={row.original.hasConsent ? "success" : "secondary"}>
          {row.original.hasConsent ? "Sim" : "Não"}
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
              <DropdownMenuItem onClick={() => openEdit(row.original.id)}>Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              {CUSTOMER_STATUSES.filter((s) => s !== row.original.status).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusChange({ customer: row.original, target: s })}>
                  Marcar como {CUSTOMER_STATUS_LABELS[s]}
                </DropdownMenuItem>
              ))}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(row.original)}>
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </RowActionsMenu>
          </div>
        ) : null,
    },
  ];

  const filterCount =
    (status ? 1 : 0) +
    (source ? 1 : 0) +
    (personType ? 1 : 0) +
    (tagId ? 1 : 0) +
    (hasAddress ? 1 : 0) +
    (hasConsent ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={plural}
        description="Cadastro e gestão de clientes da empresa."
        action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo {singular.toLowerCase()}</Button> : undefined}
      />

      <DataTable
        tableId="tenant-customers"
        columns={columns}
        data={rows}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome, telefone, e-mail, documento ou tag..." />}
        resultCount={<ResultCount filtered={filtered} total={total} />}
        toolbarEnd={
          <FilterButton activeCount={filterCount} onClear={clearAll}>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Combobox
                value={status ?? "all"}
                onValueChange={(v) => setStatus(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...CUSTOMER_STATUSES.map((s) => ({ value: s, label: CUSTOMER_STATUS_LABELS[s] }))]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Origem</Label>
              <Combobox
                value={source ?? "all"}
                onValueChange={(v) => setSource(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todas" }, ...CUSTOMER_SOURCES.map((s) => ({ value: s, label: CUSTOMER_SOURCE_LABELS[s] }))]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tipo de pessoa</Label>
              <Combobox
                value={personType ?? "all"}
                onValueChange={(v) => setPersonType(v === "all" ? null : v)}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "individual", label: CUSTOMER_PERSON_TYPE_LABELS.individual },
                  { value: "company", label: CUSTOMER_PERSON_TYPE_LABELS.company },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tag</Label>
              <Combobox
                value={tagId ?? "all"}
                onValueChange={(v) => setTagId(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todas" }, ...tags.map((t) => ({ value: t.id, label: t.name }))]}
                searchPlaceholder="Buscar tag…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Com endereço</Label>
              <Combobox
                value={hasAddress ?? "all"}
                onValueChange={(v) => setHasAddress(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, { value: "true", label: "Sim" }, { value: "false", label: "Não" }]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Consentimento</Label>
              <Combobox
                value={hasConsent ?? "all"}
                onValueChange={(v) => setHasConsent(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, { value: "true", label: "Sim" }, { value: "false", label: "Não" }]}
              />
            </div>
          </FilterButton>
        }
        activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
        emptyState={
          <EmptyState
            title={`Nenhum ${singular.toLowerCase()} cadastrado ainda`}
            description={canWrite ? `Cadastre o primeiro ${singular.toLowerCase()} da empresa.` : "Nenhum registro disponível no momento."}
            action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo {singular.toLowerCase()}</Button> : undefined}
          />
        }
      />

      <PaginationControls total={filtered} />

      {canWrite && (
        <>
          <FormDrawer
            open={creating}
            onOpenChange={setCreating}
            title={`Novo ${singular.toLowerCase()}`}
            description="Cadastre um cliente da empresa."
            hideFooter
            contentScrolls={false}
          >
            <CustomerForm
              slug={slug}
              tags={tags}
              templateFields={templateFields}
              customerLabel={singular}
              onCancel={() => setCreating(false)}
              onSuccess={() => {
                setCreating(false);
                toast.success(`${singular} criado.`);
              }}
            />
          </FormDrawer>

          <FormDrawer
            open={editing !== null}
            onOpenChange={(open) => !open && setEditing(null)}
            title={`Editar ${singular.toLowerCase()}`}
            hideFooter
            contentScrolls={false}
          >
            {editing && (
              <CustomerForm
                slug={slug}
                tags={tags}
                templateFields={templateFields}
                customerLabel={singular}
                initial={editing}
                onCancel={() => setEditing(null)}
                onSuccess={() => {
                  setEditing(null);
                  toast.success(`${singular} atualizado.`);
                }}
              />
            )}
          </FormDrawer>

          <ConfirmActionDialog
            open={statusChange !== null}
            onOpenChange={(open) => !open && setStatusChange(null)}
            title="Alterar status do cliente"
            description={
              statusChange
                ? `Marcar "${statusChange.customer.name}" como ${CUSTOMER_STATUS_LABELS[statusChange.target as keyof typeof CUSTOMER_STATUS_LABELS]}.`
                : ""
            }
            confirmLabel="Confirmar"
            onConfirm={async () => {
              if (!statusChange) return;
              notifyResult(
                await setCustomerStatusAction(slug, statusChange.customer.id, statusChange.target),
                "Status atualizado.",
              );
            }}
          />

          {canDelete && (
            <ConfirmActionDialog
              open={deleting !== null}
              onOpenChange={(open) => !open && setDeleting(null)}
              title="Excluir cliente"
              description={
                deleting
                  ? `Esta ação não pode ser desfeita. O cliente "${deleting.name}" será excluído permanentemente. Se houver registros vinculados, inative-o em vez de excluir.`
                  : ""
              }
              destructive
              confirmLabel="Excluir"
              onConfirm={async () => {
                if (!deleting) return;
                notifyResult(await deleteCustomerAction(slug, deleting.id), "Cliente excluído.");
              }}
            />
          )}
        </>
      )}

      <span className="sr-only" aria-live="polite">
        {loadingEdit ? "Carregando cliente…" : ""}
      </span>
    </div>
  );
}
