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
import type { TenantRole } from "@/components/nav/nav-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Label } from "@/components/ui/label";
import type { ManagedItem } from "@/components/ui/managed-combobox";
import type { TemplateField } from "@/lib/validations/template";

import {
  deleteCollaboratorAction,
  fetchCollaboratorAction,
  resendCollaboratorInviteAction,
  setCollaboratorStatusAction,
} from "./actions";
import CollaboratorForm, { type CollaboratorInitial } from "./collaborator-form";
import type { CollaboratorListRow } from "./data";

const STATUS_LABELS: Record<string, string> = { active: "Ativo", inactive: "Inativo" };
const STATUS_OPTIONS = ["active", "inactive"] as const;
const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Proprietário",
  tenant_manager: "Gerente",
  tenant_operator: "Operador",
  tenant_viewer: "Visualizador",
};
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export default function CollaboratorsClient({
  slug,
  role,
  rows,
  filtered,
  total,
  roles,
  departments,
  professionals,
  templateFields,
}: {
  slug: string;
  role: TenantRole;
  rows: CollaboratorListRow[];
  filtered: number;
  total: number;
  roles: ManagedItem[];
  departments: ManagedItem[];
  professionals: { id: string; name: string }[];
  templateFields: TemplateField[];
}) {
  const canWrite = role === "tenant_owner" || role === "tenant_manager";
  const canGrantOwner = role === "tenant_owner";

  const [params, setParams] = useTableParams();
  const [status, setStatus] = useQueryState("status", parseAsString.withOptions({ shallow: false }));
  const [roleId, setRoleId] = useQueryState("roleId", parseAsString.withOptions({ shallow: false }));
  const [departmentId, setDepartmentId] = useQueryState("departmentId", parseAsString.withOptions({ shallow: false }));

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CollaboratorInitial | null>(null);
  const [deleting, setDeleting] = useState<CollaboratorListRow | null>(null);
  const [statusToggle, setStatusToggle] = useState<CollaboratorListRow | null>(null);
  const [, startEdit] = useTransition();

  const openEdit = (id: string) =>
    startEdit(async () => {
      const c = await fetchCollaboratorAction(slug, id);
      if (c) setEditing(c);
      else toast.error("Colaborador não encontrado.");
    });

  const activeFilters: ActiveFilter[] = [];
  if (params.q) activeFilters.push({ key: "q", label: `Busca: ${params.q}`, onRemove: () => setParams({ q: null, page: 1 }) });
  if (status) activeFilters.push({ key: "status", label: `Status: ${STATUS_LABELS[status] ?? status}`, onRemove: () => setStatus(null) });
  if (roleId) {
    const r = roles.find((x) => x.id === roleId);
    activeFilters.push({ key: "roleId", label: `Função: ${r?.name ?? roleId}`, onRemove: () => setRoleId(null) });
  }
  if (departmentId) {
    const d = departments.find((x) => x.id === departmentId);
    activeFilters.push({ key: "departmentId", label: `Departamento: ${d?.name ?? departmentId}`, onRemove: () => setDepartmentId(null) });
  }

  const clearAll = () => {
    setStatus(null);
    setRoleId(null);
    setDepartmentId(null);
    setParams({ q: null, page: 1 });
  };
  const activeCount = (status ? 1 : 0) + (roleId ? 1 : 0) + (departmentId ? 1 : 0);

  const columns: ColumnDef<CollaboratorListRow, unknown>[] = [
    {
      id: "avatar",
      meta: { label: "Avatar" },
      header: () => <DataTableColumnHeader label="" />,
      cell: ({ row }) =>
        row.original.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.original.avatarUrl} alt="" className="size-9 rounded-full border border-border object-cover" />
        ) : (
          <span className="grid size-9 place-items-center rounded-full border border-border bg-muted text-muted-foreground">
            <UserRound className="size-4" />
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
      id: "role",
      meta: { label: "Cargo/Função" },
      header: () => <DataTableColumnHeader label="Cargo/Função" />,
      cell: ({ row }) => row.original.role?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: "department",
      meta: { label: "Departamento" },
      header: () => <DataTableColumnHeader label="Departamento" />,
      cell: ({ row }) => row.original.department?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "email",
      meta: { label: "E-mail" },
      header: () => <DataTableColumnHeader label="E-mail" />,
      cell: ({ row }) => row.original.email ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "whatsapp",
      meta: { label: "WhatsApp" },
      header: () => <DataTableColumnHeader label="WhatsApp" />,
      cell: ({ row }) => row.original.whatsapp ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "hasSystemAccess",
      meta: { label: "Acesso" },
      header: () => <DataTableColumnHeader label="Acesso" sortKey="hasSystemAccess" />,
      cell: ({ row }) =>
        row.original.hasSystemAccess ? (
          <Badge variant="success">{row.original.tenantRole ? ROLE_LABELS[row.original.tenantRole] : "Sim"}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "isServiceProfessional",
      meta: { label: "Profissional" },
      header: () => <DataTableColumnHeader label="Profissional" sortKey="isServiceProfessional" />,
      cell: ({ row }) => (row.original.isServiceProfessional ? <Badge variant="brand">Sim</Badge> : <span className="text-muted-foreground">—</span>),
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
        const c = row.original;
        if (!canWrite) return null;
        return (
          <div className="text-right">
            <RowActionsMenu>
              <DropdownMenuItem onClick={() => openEdit(c.id)}>Editar</DropdownMenuItem>
              {c.hasSystemAccess && (
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await resendCollaboratorInviteAction(slug, c.id);
                    if (res && "error" in res) toast.error(res.error);
                    else toast.success("Convite reenviado.");
                  }}
                >
                  Reenviar convite
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setStatusToggle(c)}>{c.status === "active" ? "Inativar" : "Ativar"}</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(c)}>
                Excluir
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
        title="Colaboradores"
        description="Equipe operacional e administrativa da sua empresa."
        action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo colaborador</Button> : undefined}
      />

      <DataTable
        tableId="tenant-collaborators"
        columns={columns}
        data={rows}
        onRowClick={canWrite ? (row) => openEdit(row.id) : undefined}
        hasActiveFilters={activeFilters.length > 0}
        onClearFilters={clearAll}
        toolbarStart={<SearchInput placeholder="Buscar por nome, função, e-mail, telefone..." />}
        resultCount={<ResultCount filtered={filtered} total={total} />}
        toolbarEnd={
          <FilterButton activeCount={activeCount} onClear={clearAll}>
            <div className="flex flex-col gap-2">
              <Label>Função</Label>
              <Combobox
                value={roleId ?? "all"}
                onValueChange={(v) => setRoleId(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todas" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
                searchPlaceholder="Buscar função…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Departamento</Label>
              <Combobox
                value={departmentId ?? "all"}
                onValueChange={(v) => setDepartmentId(v === "all" ? null : v)}
                options={[{ value: "all", label: "Todos" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
                searchPlaceholder="Buscar departamento…"
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
          </FilterButton>
        }
        activeFilters={<ActiveFiltersBar filters={activeFilters} onClearAll={clearAll} />}
        emptyState={
          <EmptyState
            title="Nenhum colaborador cadastrado ainda"
            action={canWrite ? <Button onClick={() => setCreating(true)}><Plus /> Novo colaborador</Button> : undefined}
          />
        }
      />

      <PaginationControls total={filtered} />

      <FormDrawer open={creating} onOpenChange={setCreating} title="Novo colaborador" hideFooter contentScrolls={false}>
        <CollaboratorForm
          slug={slug}
          roles={roles}
          departments={departments}
          professionals={professionals}
          templateFields={templateFields}
          canManageEntities={canWrite}
          canGrantOwner={canGrantOwner}
          onCancel={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success("Colaborador criado.");
          }}
        />
      </FormDrawer>

      <FormDrawer open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title="Editar colaborador" hideFooter contentScrolls={false}>
        {editing && (
          <CollaboratorForm
            slug={slug}
            roles={roles}
            departments={departments}
            professionals={professionals}
            templateFields={templateFields}
            canManageEntities={canWrite}
            canGrantOwner={canGrantOwner}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSuccess={() => {
              setEditing(null);
              toast.success("Colaborador atualizado.");
            }}
          />
        )}
      </FormDrawer>

      <ConfirmActionDialog
        open={statusToggle !== null}
        onOpenChange={(o) => !o && setStatusToggle(null)}
        title={statusToggle?.status === "active" ? "Inativar colaborador" : "Ativar colaborador"}
        description={
          statusToggle?.status === "active"
            ? `"${statusToggle?.name}" será marcado como inativo.`
            : `"${statusToggle?.name}" voltará a ficar ativo.`
        }
        destructive={statusToggle?.status === "active"}
        confirmLabel={statusToggle?.status === "active" ? "Inativar" : "Ativar"}
        onConfirm={async () => {
          if (!statusToggle) return;
          const next = statusToggle.status === "active" ? "inactive" : "active";
          const res = await setCollaboratorStatusAction(slug, statusToggle.id, next);
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Status atualizado.");
        }}
      />

      <ConfirmActionDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir colaborador"
        description={`Excluir "${deleting?.name}"? Esta ação não pode ser desfeita. Se houver vínculos, inative em vez de excluir.`}
        destructive
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteCollaboratorAction(slug, deleting.id);
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Colaborador excluído.");
        }}
      />
    </div>
  );
}
