"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, UserRound } from "lucide-react";
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
  deleteProfessionalAction,
  getProfessionalAction,
  setProfessionalPublicProfileAction,
  setProfessionalStatusAction,
  type ProfessionalActionResult,
} from "./actions";
import type { ProfessionalListRow } from "./data";
import ProfessionalForm, {
  type IdName,
  type MemberOption,
  type ProfessionalInitial,
} from "./professional-form";

const STATUS_LABELS: Record<string, string> = { active: "Ativo", inactive: "Inativo" };
const STATUS_OPTIONS = ["active", "inactive"] as const;

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function notifyResult(res: ProfessionalActionResult, okMsg: string) {
  if (res && "error" in res) toast.error(res.error);
  else if (res && "ok" in res) toast.success(okMsg);
}

export default function ProfessionalsClient({
  slug,
  rows,
  filtered,
  total,
  specialties,
  services,
  locations,
  members,
  templateFields,
  canWrite,
}: {
  slug: string;
  rows: ProfessionalListRow[];
  filtered: number;
  total: number;
  specialties: IdName[];
  services: IdName[];
  locations: IdName[];
  members: MemberOption[];
  templateFields: TemplateField[];
  canWrite: boolean;
}) {
  const [params, setParams] = useTableParams();
  const opts = parseAsString.withOptions({ shallow: false });
  const [status, setStatus] = useQueryState("status", opts);
  const [publicProfile, setPublic] = useQueryState("publicProfile", opts);
  const [specialtyId, setSpecialtyId] = useQueryState("specialtyId", opts);
  const [serviceId, setServiceId] = useQueryState("serviceId", opts);
  const [locationId, setLocationId] = useQueryState("locationId", opts);
  const [hasUser, setHasUser] = useQueryState("hasUser", opts);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProfessionalInitial | null>(null);
  const [loadingEdit, startLoadEdit] = useTransition();
  const [statusChange, setStatusChange] = useState<{ professional: ProfessionalListRow; target: string } | null>(null);
  const [deleting, setDeleting] = useState<ProfessionalListRow | null>(null);

  const boolLabel = (v: string | null) => (v === "true" ? "Sim" : v === "false" ? "Não" : v);

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });
  if (publicProfile) activeFilters.push({ key: "publicProfile", label: `Público: ${boolLabel(publicProfile)}`, onRemove: () => setPublic(null) });
  if (specialtyId) {
    const s = specialties.find((x) => x.id === specialtyId);
    activeFilters.push({ key: "specialtyId", label: `Especialidade: ${s?.name ?? specialtyId}`, onRemove: () => setSpecialtyId(null) });
  }
  if (serviceId) {
    const s = services.find((x) => x.id === serviceId);
    activeFilters.push({ key: "serviceId", label: `Serviço: ${s?.name ?? serviceId}`, onRemove: () => setServiceId(null) });
  }
  if (locationId) {
    const l = locations.find((x) => x.id === locationId);
    activeFilters.push({ key: "locationId", label: `Local: ${l?.name ?? locationId}`, onRemove: () => setLocationId(null) });
  }
  if (hasUser) activeFilters.push({ key: "hasUser", label: `Com usuário: ${boolLabel(hasUser)}`, onRemove: () => setHasUser(null) });

  const clearAll = () => {
    setStatus(null);
    setPublic(null);
    setSpecialtyId(null);
    setServiceId(null);
    setLocationId(null);
    setHasUser(null);
    setParams({ q: null, page: 1 });
  };

  const openEdit = (id: string) => {
    startLoadEdit(async () => {
      const res = await getProfessionalAction(slug, id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setEditing(res.professional);
    });
  };

  const columns: ColumnDef<ProfessionalListRow, unknown>[] = [
    {
      accessorKey: "name",
      meta: { label: "Nome" },
      header: () => <DataTableColumnHeader label="Nome" sortKey="name" />,
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          {row.original.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.original.avatarUrl} alt="" className="size-8 rounded-full border border-border object-cover" />
          ) : (
            <span className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground">
              <UserRound className="size-4" />
            </span>
          )}
          <span className="font-medium">{row.original.name}</span>
        </span>
      ),
    },
    {
      accessorKey: "title",
      meta: { label: "Cargo / função" },
      header: () => <DataTableColumnHeader label="Cargo / função" sortKey="title" />,
      cell: ({ row }) => row.original.title ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: "specialties",
      meta: { label: "Especialidades" },
      header: () => <DataTableColumnHeader label="Especialidades" />,
      cell: ({ row }) =>
        row.original.specialties.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {row.original.specialties.map((s) => (
              <Badge key={s.id} variant="secondary">
                {s.name}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "services",
      meta: { label: "Serviços" },
      header: () => <DataTableColumnHeader label="Serviços" />,
      cell: ({ row }) => row.original.servicesCount,
    },
    {
      id: "locations",
      meta: { label: "Locais" },
      header: () => <DataTableColumnHeader label="Locais" />,
      cell: ({ row }) => row.original.locationsCount,
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
      accessorKey: "publicProfile",
      meta: { label: "Perfil público" },
      header: () => <DataTableColumnHeader label="Perfil público" sortKey="publicProfile" />,
      cell: ({ row }) => (
        <Badge variant={row.original.publicProfile ? "success" : "secondary"}>
          {row.original.publicProfile ? "Sim" : "Não"}
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
              <DropdownMenuItem
                onClick={async () =>
                  notifyResult(
                    await setProfessionalPublicProfileAction(slug, row.original.id, !row.original.publicProfile),
                    "Perfil atualizado.",
                  )
                }
              >
                {row.original.publicProfile ? "Tornar privado" : "Tornar público"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.filter((s) => s !== row.original.status).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusChange({ professional: row.original, target: s })}>
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
    (publicProfile ? 1 : 0) +
    (specialtyId ? 1 : 0) +
    (serviceId ? 1 : 0) +
    (locationId ? 1 : 0) +
    (hasUser ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Profissionais"
        description="Pessoas que executam os serviços. Usadas nos vínculos de serviço e na disponibilidade."
        action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo profissional</Button> : undefined}
      />

      <DataTable
        tableId="tenant-professionals"
        columns={columns}
        data={rows}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome, cargo, especialidade, e-mail ou telefone..." />}
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
              <Label>Perfil público</Label>
              <Combobox
                value={publicProfile ?? "all"}
                onValueChange={(v) => setPublic(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, { value: "true", label: "Sim" }, { value: "false", label: "Não" }]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Especialidade</Label>
              <Combobox
                value={specialtyId ?? "all"}
                onValueChange={(v) => setSpecialtyId(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todas" }, ...specialties.map((s) => ({ value: s.id, label: s.name }))]}
                searchPlaceholder="Buscar especialidade…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Serviço</Label>
              <Combobox
                value={serviceId ?? "all"}
                onValueChange={(v) => setServiceId(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...services.map((s) => ({ value: s.id, label: s.name }))]}
                searchPlaceholder="Buscar serviço…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Local</Label>
              <Combobox
                value={locationId ?? "all"}
                onValueChange={(v) => setLocationId(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
                searchPlaceholder="Buscar local…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Usuário vinculado</Label>
              <Combobox
                value={hasUser ?? "all"}
                onValueChange={(v) => setHasUser(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, { value: "true", label: "Com usuário" }, { value: "false", label: "Sem usuário" }]}
              />
            </div>
          </FilterButton>
        }
        activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
        emptyState={
          <EmptyState
            title="Nenhum profissional cadastrado ainda"
            description={canWrite ? "Crie o primeiro profissional da equipe." : "Nenhum profissional disponível."}
            action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo profissional</Button> : undefined}
          />
        }
      />

      <PaginationControls total={filtered} />

      {canWrite && (
        <>
          <FormDrawer
            open={creating}
            onOpenChange={setCreating}
            title="Novo profissional"
            description="Cadastre uma pessoa que executa os serviços."
            hideFooter
            contentScrolls={false}
          >
            <ProfessionalForm
              slug={slug}
              specialties={specialties}
              services={services}
              locations={locations}
              members={members}
              templateFields={templateFields}
              onCancel={() => setCreating(false)}
              onSuccess={() => {
                setCreating(false);
                toast.success("Profissional criado.");
              }}
            />
          </FormDrawer>

          <FormDrawer
            open={editing !== null}
            onOpenChange={(open) => !open && setEditing(null)}
            title="Editar profissional"
            hideFooter
            contentScrolls={false}
          >
            {editing && (
              <ProfessionalForm
                slug={slug}
                specialties={specialties}
                services={services}
                locations={locations}
                members={members}
                templateFields={templateFields}
                initial={editing}
                onCancel={() => setEditing(null)}
                onSuccess={() => {
                  setEditing(null);
                  toast.success("Profissional atualizado.");
                }}
              />
            )}
          </FormDrawer>

          <ConfirmActionDialog
            open={statusChange !== null}
            onOpenChange={(open) => !open && setStatusChange(null)}
            title="Alterar status do profissional"
            description={
              statusChange
                ? `Marcar "${statusChange.professional.name}" como ${STATUS_LABELS[statusChange.target]}.`
                : ""
            }
            confirmLabel="Confirmar"
            onConfirm={async () => {
              if (!statusChange) return;
              notifyResult(
                await setProfessionalStatusAction(slug, statusChange.professional.id, statusChange.target),
                "Status atualizado.",
              );
            }}
          />

          <ConfirmActionDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            title="Excluir profissional"
            description={
              deleting
                ? `Esta ação não pode ser desfeita. O profissional "${deleting.name}" será excluído. Se houver serviços ou regras de disponibilidade vinculados, inative-o em vez de excluir.`
                : ""
            }
            destructive
            confirmLabel="Excluir"
            onConfirm={async () => {
              if (!deleting) return;
              notifyResult(await deleteProfessionalAction(slug, deleting.id), "Profissional excluído.");
            }}
          />
        </>
      )}

      <span className="sr-only" aria-live="polite">
        {loadingEdit ? "Carregando profissional…" : ""}
      </span>
    </div>
  );
}
