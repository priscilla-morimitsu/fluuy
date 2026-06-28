"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { VariantProps } from "class-variance-authority";
import { Check, Clock, PawPrint, Plus, Users, X } from "lucide-react";
import Link from "next/link";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useRef, useState, useTransition } from "react";
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
import { useRouter } from "next/navigation";

import { EmptyState, ErrorState } from "@/components/crud/states";
import { useTableParams } from "@/components/crud/use-table-params";
import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Label } from "@/components/ui/label";
import { OriginBadge } from "@/components/ui/origin-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CUSTOMER_ENTITY_TYPE_SUGGESTIONS,
  CUSTOMER_PERSON_TYPE_LABELS,
  CUSTOMER_SOURCE_LABELS,
  CUSTOMER_SOURCES,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUSES,
  pluralizePt,
} from "@/lib/validations/customer";
import type { TemplateField, TemplateLayout } from "@/lib/validations/template";

import {
  deleteCustomerAction,
  getCustomerAction,
  setCustomerStatusAction,
  type CustomerActionResult,
} from "./actions";
import type { CustomerListRow, CustomerOption, PetListRow } from "./data";
import CustomerForm, { type CustomerInitial, type CustomerTagOption } from "./customer-form";
import { NewPetClientPickerDialog } from "./new-pet-client-picker-dialog";
import { PetSheet, type PetSheetPet } from "./pet-sheet";
import { PetsTable } from "./pets-table";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "success",
  inactive: "secondary",
  blocked: "destructive",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const maskPhone = (v: string | null) => v ?? "—";

const PET_ESPECIE_LABELS: Record<string, string> = { cao: "Cão", gato: "Gato", outro: "Outro" };
const PET_SEXO_LABELS: Record<string, string> = { macho: "Macho", femea: "Fêmea" };
const PET_PORTE_LABELS: Record<string, string> = { pequeno: "Pequeno", medio: "Médio", grande: "Grande" };

// Consent display vocabulary (LGPD). Current data is binary (consentAcceptedAt
// present or not) → "accepted" / "pending"; "declined" is reserved for an
// explicit opt-out once it's tracked.
type ConsentKey = "accepted" | "pending" | "declined";
const CONSENT: Record<ConsentKey, { label: string; variant: BadgeVariant; Icon: typeof Check; tip: string }> = {
  accepted: { label: "Aceito", variant: "success", Icon: Check, tip: "Consentimento LGPD registrado." },
  pending: { label: "Aguardando", variant: "warning", Icon: Clock, tip: "Aguardando o consentimento do cliente." },
  declined: { label: "Não aceito", variant: "destructive", Icon: X, tip: "Cliente não aceitou o consentimento." },
};

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
  templateLayout,
  customerLabel,
  entityLabel,
  entityType,
  entityTemplateFields,
  entityTypes,
  showPets,
  canWrite,
  canDelete,
  listView,
  petRows,
  petFiltered,
  petTotal,
  customerOptions,
  loadError = false,
}: {
  slug: string;
  rows: CustomerListRow[];
  filtered: number;
  total: number;
  tags: CustomerTagOption[];
  templateFields: TemplateField[];
  templateLayout?: TemplateLayout;
  customerLabel: string | null;
  entityLabel: string;
  entityType: string;
  entityTemplateFields: TemplateField[];
  entityTypes: string[];
  showPets: boolean;
  canWrite: boolean;
  canDelete: boolean;
  listView: "clients" | "pets";
  petRows: PetListRow[];
  petFiltered: number;
  petTotal: number;
  customerOptions: CustomerOption[];
  loadError?: boolean;
}) {
  const singular = customerLabel?.trim() || "Cliente";
  const plural = pluralizePt(singular);
  const petSingularLower = (entityLabel?.trim() || "Pet").toLowerCase();

  const router = useRouter();

  const [params, setParams] = useTableParams();

  // All filter params + listView + q/page live in one nuqs group so that
  // switching the view (and clearing filters) fires a single atomic navigation
  // instead of one server fetch per setter (which would race on slow networks).
  const [query, setQuery] = useQueryStates(
    {
      listView: parseAsString,
      status: parseAsString,
      source: parseAsString,
      personType: parseAsString,
      tagId: parseAsString,
      district: parseAsString,
      hasPets: parseAsString,
      hasAddress: parseAsString,
      hasConsent: parseAsString,
      // Pets-view filters (URL params, server-side).
      especie: parseAsString,
      sexo: parseAsString,
      porte: parseAsString,
      q: parseAsString,
      page: parseAsInteger,
    },
    { history: "push", shallow: false },
  );

  const { status, source, personType, tagId, district, hasPets, hasAddress, hasConsent, especie, sexo, porte } = query;
  const setStatus = (v: string | null) => setQuery({ status: v });
  const setSource = (v: string | null) => setQuery({ source: v });
  const setPersonType = (v: string | null) => setQuery({ personType: v });
  const setTagId = (v: string | null) => setQuery({ tagId: v });
  const setDistrict = (v: string | null) => setQuery({ district: v });
  const setHasPets = (v: string | null) => setQuery({ hasPets: v });
  const setHasAddress = (v: string | null) => setQuery({ hasAddress: v });
  const setHasConsent = (v: string | null) => setQuery({ hasConsent: v });
  const setEspecie = (v: string | null) => setQuery({ especie: v });
  const setSexo = (v: string | null) => setQuery({ sexo: v });
  const setPorte = (v: string | null) => setQuery({ porte: v });

  const isPets = listView === "pets";

  // Switching view resets the query/page and clears the other view's filters in
  // a single atomic update so stale filters don't silently apply after the
  // toggle — and only one navigation fires.
  const switchView = (next: "clients" | "pets") => {
    if (next === listView) return;
    const cleared =
      next === "pets"
        ? { status: null, source: null, personType: null, tagId: null, district: null, hasPets: null, hasAddress: null, hasConsent: null }
        : { especie: null, sexo: null, porte: null };
    setQuery({ ...cleared, listView: next === "pets" ? "pets" : null, q: null, page: 1 });
  };

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomerInitial | null>(null);
  const [loadingEdit, startLoadEdit] = useTransition();
  const [statusChange, setStatusChange] = useState<{ customer: CustomerListRow; target: string } | null>(null);
  const [deleting, setDeleting] = useState<CustomerListRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkInactivating, setBulkInactivating] = useState(false);
  const [, startBulk] = useTransition();

  // Pets view: the client picker dialog and the shared PetSheet (create/edit).
  const [pickingClient, setPickingClient] = useState(false);
  const [petSheet, setPetSheet] = useState<{ client: { id: string; name: string }; pet?: PetSheetPet } | null>(null);

  // Distinct neighborhoods of the currently listed customers feed the district filter.
  const districtOptions = Array.from(
    new Set(rows.map((r) => r.district).filter((d): d is string => Boolean(d))),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const toggleRow = (id: string, on: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const pageIds = rows.map((r) => r.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id));
  const allSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;

  const toggleAll = (on: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  const boolLabel = (v: string | null) => (v === "true" ? "Sim" : v === "false" ? "Não" : v);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (isPets) {
    if (especie) activeFilters.push({ key: "especie", label: `Espécie: ${PET_ESPECIE_LABELS[especie] ?? especie}`, onRemove: () => setEspecie(null) });
    if (sexo) activeFilters.push({ key: "sexo", label: `Sexo: ${PET_SEXO_LABELS[sexo] ?? sexo}`, onRemove: () => setSexo(null) });
    if (porte) activeFilters.push({ key: "porte", label: `Porte: ${PET_PORTE_LABELS[porte] ?? porte}`, onRemove: () => setPorte(null) });
  } else {
  if (status) activeFilters.push({ key: "status", label: `Status: ${CUSTOMER_STATUS_LABELS[status as keyof typeof CUSTOMER_STATUS_LABELS] ?? status}`, onRemove: () => setStatus(null) });
  if (source) activeFilters.push({ key: "source", label: `Origem: ${CUSTOMER_SOURCE_LABELS[source as keyof typeof CUSTOMER_SOURCE_LABELS] ?? source}`, onRemove: () => setSource(null) });
  if (personType) activeFilters.push({ key: "personType", label: `Tipo: ${CUSTOMER_PERSON_TYPE_LABELS[personType as keyof typeof CUSTOMER_PERSON_TYPE_LABELS] ?? personType}`, onRemove: () => setPersonType(null) });
  if (tagId) {
    const t = tags.find((x) => x.id === tagId);
    activeFilters.push({ key: "tagId", label: `Tag: ${t?.name ?? tagId}`, onRemove: () => setTagId(null) });
  }
  if (district) activeFilters.push({ key: "district", label: `Bairro: ${district}`, onRemove: () => setDistrict(null) });
  if (hasPets) activeFilters.push({ key: "hasPets", label: `Pets: ${hasPets === "true" ? "Com pets" : "Sem pets"}`, onRemove: () => setHasPets(null) });
  if (hasAddress) activeFilters.push({ key: "hasAddress", label: `Com endereço: ${boolLabel(hasAddress)}`, onRemove: () => setHasAddress(null) });
  if (hasConsent) activeFilters.push({ key: "hasConsent", label: `Consentimento: ${boolLabel(hasConsent)}`, onRemove: () => setHasConsent(null) });
  }

  const clearAll = () => {
    const cleared = isPets
      ? { especie: null, sexo: null, porte: null }
      : { status: null, source: null, personType: null, tagId: null, district: null, hasPets: null, hasAddress: null, hasConsent: null };
    setQuery({ ...cleared, q: null, page: 1 });
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

  // The "pets" entity type drives the dedicated Pets column. Other entity types
  // (if any) still get a generic per-type column after Pets.
  const petType = entityTypes.find((t) => t === "pet") ?? (entityTypes.length === 1 ? entityTypes[0] : undefined);
  const otherEntityCols = entityTypes
    .filter((t) => t !== petType)
    .map<ColumnDef<CustomerListRow, unknown>>((t) => {
      const colLabel = pluralizePt(CUSTOMER_ENTITY_TYPE_SUGGESTIONS.find((s) => s.value === t)?.label ?? t);
      return {
        id: `entity_${t}`,
        meta: { label: colLabel, defaultHidden: true },
        header: () => <DataTableColumnHeader label={colLabel} />,
        cell: ({ row }) => {
          const names = row.original.entitiesByType[t] ?? [];
          return names.length ? (
            <span className="flex flex-wrap gap-1">
              {names.map((n, i) => (
                <Badge key={`${t}-${i}`} variant="secondary">
                  {n}
                </Badge>
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      };
    });

  const petsLabel = pluralizePt(
    CUSTOMER_ENTITY_TYPE_SUGGESTIONS.find((s) => s.value === (petType ?? "pet"))?.label ?? "Pet",
  );

  // Spec order: select · status · name · pets · phone · district · tags · created · source · actions
  const columns: ColumnDef<CustomerListRow, unknown>[] = [
    {
      id: "select",
      enableHiding: false,
      header: () => (
        <Checkbox
          aria-label="Selecionar todos"
          checked={allSelected}
          indeterminate={someSelected}
          onCheckedChange={(v) => toggleAll(Boolean(v))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Selecionar ${row.original.name}`}
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={(v) => toggleRow(row.original.id, Boolean(v))}
        />
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
      accessorKey: "name",
      meta: { label: singular },
      header: () => <DataTableColumnHeader label={singular} sortKey="name" />,
      cell: ({ row }) => (
        <Link href={`/t/${slug}/customers/${row.original.id}`} className="font-medium hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "pets",
      meta: { label: petsLabel },
      header: () => <DataTableColumnHeader label={petsLabel} />,
      cell: ({ row }) => {
        const names = petType ? row.original.entitiesByType[petType] ?? [] : [];
        const n = names.length;
        // 0 → PetSheet create for this client; 1 → open the client's edit drawer
        // on its Pets context; N → edit drawer (the multi-pet list lives there).
        const onPets = () => {
          if (!canWrite) return;
          if (n === 0) setPetSheet({ client: { id: row.original.id, name: row.original.name } });
          else openEdit(row.original.id);
        };
        return (
          <button
            type="button"
            data-no-row-click
            onClick={onPets}
            className={
              n === 0
                ? "inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
                : "inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            }
          >
            <PawPrint className="size-4" />
            {n === 0 ? "Adicionar" : n === 1 ? names[0] : `${n} ${petsLabel.toLowerCase()}`}
          </button>
        );
      },
    },
    ...otherEntityCols,
    {
      id: "phone",
      meta: { label: "Telefone" },
      header: () => <DataTableColumnHeader label="Telefone" />,
      cell: ({ row }) => <span className="font-mono text-sm">{maskPhone(row.original.phone)}</span>,
    },
    {
      id: "district",
      meta: { label: "Bairro" },
      header: () => <DataTableColumnHeader label="Bairro" />,
      cell: ({ row }) =>
        row.original.district ? (
          <Badge variant="secondary">{row.original.district}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "tags",
      meta: { label: "Tags" },
      header: () => <DataTableColumnHeader label="Tags" />,
      cell: ({ row }) => {
        const all = row.original.tags;
        if (!all.length) return <span className="text-muted-foreground">—</span>;
        const shown = all.slice(0, 2);
        const extra = all.length - shown.length;
        return (
          <span className="flex flex-wrap gap-1">
            {shown.map((t) => (
              <Badge key={t.id} variant="secondary">
                {t.name}
              </Badge>
            ))}
            {extra > 0 && <Badge variant="secondary">+{extra}</Badge>}
          </span>
        );
      },
    },
    {
      accessorKey: "source",
      meta: { label: "Cadastro por" },
      header: () => <DataTableColumnHeader label="Cadastro por" />,
      cell: ({ row }) => <OriginBadge origin={row.original.source} />,
    },
    {
      accessorKey: "createdAt",
      meta: { label: "Cadastro em" },
      header: () => <DataTableColumnHeader label="Cadastro em" sortKey="createdAt" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{dateFmt.format(row.original.createdAt)}</span>,
    },
    {
      id: "whatsapp",
      meta: { label: "WhatsApp", defaultHidden: true },
      header: () => <DataTableColumnHeader label="WhatsApp" />,
      cell: ({ row }) => <span className="text-sm">{maskPhone(row.original.whatsapp)}</span>,
    },
    {
      id: "email",
      meta: { label: "E-mail", defaultHidden: true },
      header: () => <DataTableColumnHeader label="E-mail" />,
      cell: ({ row }) => row.original.email ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: "consent",
      meta: { label: "Consentimento", defaultHidden: true },
      header: () => <DataTableColumnHeader label="Consentimento" />,
      cell: ({ row }) => {
        const c = CONSENT[row.original.hasConsent ? "accepted" : "pending"];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge variant={c.variant}>
                    <c.Icon />
                    {c.label}
                  </Badge>
                }
              />
              <TooltipContent>{c.tip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      meta: { label: "Atualizado em", defaultHidden: true },
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

  const filterCount = isPets
    ? (especie ? 1 : 0) + (sexo ? 1 : 0) + (porte ? 1 : 0)
    : (status ? 1 : 0) +
      (source ? 1 : 0) +
      (personType ? 1 : 0) +
      (tagId ? 1 : 0) +
      (district ? 1 : 0) +
      (hasPets ? 1 : 0) +
      (hasAddress ? 1 : 0) +
      (hasConsent ? 1 : 0);

  // Open the PetSheet in edit mode for a pet-table row (build client from tutor).
  const openPetEdit = (row: PetListRow) =>
    setPetSheet({
      client: { id: row.customerId, name: row.customerName },
      pet: { id: row.id, status: row.status, customData: row.customData },
    });

  const petSearchPlaceholder = "Buscar por nome, raça ou tutor...";

  // Roving tabindex: the tablist is a single tab stop and arrow keys move
  // between the two tabs, switching the active view and moving focus with it.
  const tablistRef = useRef<HTMLDivElement>(null);
  const TAB_ORDER: ("clients" | "pets")[] = ["clients", "pets"];

  const focusTab = (value: "clients" | "pets") => {
    const el = tablistRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${value}"]`);
    el?.focus();
  };

  const onTablistKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const current = TAB_ORDER.indexOf(listView);
    let nextIndex: number | null = null;
    if (e.key === "ArrowLeft") nextIndex = (current - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    else if (e.key === "ArrowRight") nextIndex = (current + 1) % TAB_ORDER.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = TAB_ORDER.length - 1;
    if (nextIndex === null) return;
    e.preventDefault();
    const next = TAB_ORDER[nextIndex];
    switchView(next);
    focusTab(next);
  };

  const segmentBtn = (value: "clients" | "pets", label: string, Icon: typeof Users) => {
    const active = listView === value;
    return (
      <button
        type="button"
        role="tab"
        data-tab={value}
        aria-selected={active}
        tabIndex={active ? 0 : -1}
        onClick={() => switchView(value)}
        className={
          active
            ? "inline-flex items-center gap-1.5 rounded-xl border border-[var(--lime-400)] bg-(--lime-50) px-3 py-1.5 text-sm font-semibold text-foreground"
            : "inline-flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-1.5 text-sm font-light text-muted-foreground hover:text-foreground"
        }
      >
        <Icon className="size-4" />
        {label}
      </button>
    );
  };

  const petFilters = (
    <FilterButton activeCount={filterCount} onClear={clearAll}>
      <div className="flex flex-col gap-2">
        <Label>Espécie</Label>
        <Combobox
          value={especie ?? "all"}
          onValueChange={(v) => setEspecie(v === "all" ? null : v)}
          options={[
            { value: "all", label: "Todas" },
            { value: "cao", label: "Cão" },
            { value: "gato", label: "Gato" },
            { value: "outro", label: "Outro" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Sexo</Label>
        <Combobox
          value={sexo ?? "all"}
          onValueChange={(v) => setSexo(v === "all" ? null : v)}
          options={[
            { value: "all", label: "Todos" },
            { value: "macho", label: "Macho" },
            { value: "femea", label: "Fêmea" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Porte</Label>
        <Combobox
          value={porte ?? "all"}
          onValueChange={(v) => setPorte(v === "all" ? null : v)}
          options={[
            { value: "all", label: "Todos" },
            { value: "pequeno", label: "Pequeno" },
            { value: "medio", label: "Médio" },
            { value: "grande", label: "Grande" },
          ]}
        />
      </div>
    </FilterButton>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <PageHeader
          title={isPets ? petsLabel : plural}
          description={
            isPets
              ? `Todos os ${petsLabel.toLowerCase()} cadastrados, vinculados aos seus tutores.`
              : showPets
                ? `Gerencie os ${plural.toLowerCase()} do seu negócio, seus contatos e os ${petsLabel.toLowerCase()} vinculados a cada um.`
                : `Gerencie os ${plural.toLowerCase()} do seu negócio e seus contatos.`
          }
          action={
            canWrite ? (
              isPets ? (
                <Button onClick={() => setPickingClient(true)}>
                  <Plus /> Novo {petSingularLower}
                </Button>
              ) : (
                <Button onClick={() => setCreating(true)}>
                  <Plus /> Novo {singular.toLowerCase()}
                </Button>
              )
            ) : undefined
          }
        />
        {showPets && (
          <div ref={tablistRef} role="tablist" aria-label="Alternar visão" onKeyDown={onTablistKeyDown} className="flex w-fit items-center gap-1 rounded-2xl border border-border bg-card/40 p-1">
            {segmentBtn("clients", plural, Users)}
            {segmentBtn("pets", petsLabel, PawPrint)}
          </div>
        )}
      </div>

      {loadError ? (
        <ErrorState onRetry={() => router.refresh()} />
      ) : isPets ? (
        <>
          <PetsTable
            rows={petRows}
            onRowClick={openPetEdit}
            hasActiveFilters={activeFilters.length > 0}
            onClearFilters={clearAll}
            toolbarStart={<SearchInput placeholder={petSearchPlaceholder} />}
            resultCount={<ResultCount filtered={petFiltered} total={petTotal} noun={petSingularLower} nounPlural={petsLabel.toLowerCase()} />}
            toolbarEnd={petFilters}
            activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
            emptyState={
              activeFilters.length > 0 ? (
                <EmptyState
                  title={`Nenhum ${petSingularLower} encontrado`}
                  description="Nenhum pet corresponde aos filtros. Ajuste a busca ou cadastre um novo pet."
                  action={
                    <Button variant="outline" onClick={clearAll}>
                      Limpar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title={`Nenhum ${petSingularLower} cadastrado`}
                  description="Cadastre pets vinculados aos seus clientes."
                  action={canWrite ? <Button onClick={() => setPickingClient(true)}><Plus /> Novo {petSingularLower}</Button> : undefined}
                />
              )
            }
          />
          <PaginationControls total={petFiltered} />
        </>
      ) : (
        renderClientsView()
      )}

      {/* Pet creation client picker + shared PetSheet (both views). */}
      {canWrite && showPets && (
        <NewPetClientPickerDialog
          open={pickingClient}
          onOpenChange={setPickingClient}
          customers={customerOptions}
          onCreateClient={() => {
            setPickingClient(false);
            setCreating(true);
          }}
          onContinue={(customerId) => {
            const c = customerOptions.find((x) => x.id === customerId);
            if (!c) return;
            setPickingClient(false);
            setPetSheet({ client: { id: c.id, name: c.name } });
          }}
        />
      )}
      {canWrite && showPets && petSheet && (
        <PetSheet
          slug={slug}
          client={petSheet.client}
          entityType={entityType}
          entityLabel={entityLabel}
          templateFields={entityTemplateFields}
          pet={petSheet.pet}
          onClose={() => setPetSheet(null)}
        />
      )}
    </div>
  );

  function renderClientsView() {
    return (
    <>
      {canWrite && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkInactivating(true)}>
              Inativar selecionados
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      <DataTable
        tableId="tenant-customers"
        columns={columns}
        data={rows}
        onRowClick={canWrite ? (row) => openEdit(row.id) : undefined}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome, telefone, e-mail, documento ou tag..." />}
        resultCount={<ResultCount filtered={filtered} total={total} noun={singular.toLowerCase()} nounPlural={plural.toLowerCase()} />}
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
              <Label>Bairro</Label>
              <Combobox
                value={district ?? "all"}
                onValueChange={(v) => setDistrict(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...districtOptions.map((d) => ({ value: d, label: d }))]}
                searchPlaceholder="Buscar bairro…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Pets</Label>
              <Combobox
                value={hasPets ?? "all"}
                onValueChange={(v) => setHasPets(v === "all" ? null : v)}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "true", label: "Com pets" },
                  { value: "false", label: "Sem pets" },
                ]}
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
            allowFullscreen
            contentScrolls={false}
          >
            <CustomerForm
              slug={slug}
              tags={tags}
              templateFields={templateFields}
              templateLayout={templateLayout}
              customerLabel={singular}
              entityLabel={entityLabel}
              entityType={entityType}
              entityTemplateFields={entityTemplateFields}
              showPets={showPets}
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
            allowFullscreen
            contentScrolls={false}
          >
            {editing && (
              <CustomerForm
                slug={slug}
                tags={tags}
                templateFields={templateFields}
                templateLayout={templateLayout}
                customerLabel={singular}
                entityLabel={entityLabel}
                entityType={entityType}
                entityTemplateFields={entityTemplateFields}
                showPets={showPets}
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

          <ConfirmActionDialog
            open={bulkInactivating}
            onOpenChange={setBulkInactivating}
            title="Inativar selecionados"
            description={`${selectedIds.size} ${selectedIds.size > 1 ? "clientes serão marcados" : "cliente será marcado"} como inativo. Atendimentos e automações relacionados podem ser afetados.`}
            confirmLabel="Inativar"
            onConfirm={() =>
              new Promise<void>((resolve) => {
                startBulk(async () => {
                  const ids = Array.from(selectedIds);
                  const results = await Promise.all(ids.map((id) => setCustomerStatusAction(slug, id, "inactive")));
                  const failed = results.filter((r) => r && "error" in r).length;
                  if (failed === 0) toast.success(`${ids.length} cliente${ids.length > 1 ? "s" : ""} inativado${ids.length > 1 ? "s" : ""}.`);
                  else toast.error(`${failed} de ${ids.length} não puderam ser inativados.`);
                  clearSelection();
                  resolve();
                });
              })
            }
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
    </>
    );
  }
}
