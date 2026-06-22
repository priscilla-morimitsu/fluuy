"use client";

import { useActionState, useEffect, useState } from "react";

import { StatusSwitchItem, type StatusOption } from "@/components/forms/status-switch-item";
import { Field } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { ManagedCombobox, type ManagedItem } from "@/components/ui/managed-combobox";
import { DocumentInput, PhoneInput } from "@/components/ui/masked-inputs";
import { MultiSelect } from "@/components/ui/multiselect";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";
import type { TemplateField } from "@/lib/validations/template";

import {
  createCollaboratorAction,
  createCollaboratorDepartmentAction,
  createCollaboratorRoleAction,
  deleteCollaboratorDepartmentAction,
  deleteCollaboratorRoleAction,
  updateCollaboratorAction,
  updateCollaboratorDepartmentAction,
  updateCollaboratorRoleAction,
  type CollaboratorActionResult,
} from "./actions";

// Two-state lifecycle (active/inactive) — switch control, no danger affordance.
const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "active",
    label: "Ativo",
    description: "Ativo — o colaborador aparece e pode ser atribuído.",
    tone: "positive",
    confirm: {
      title: "Ativar colaborador?",
      message: "O colaborador volta a aparecer e pode receber atribuições.",
      confirmLabel: "Ativar",
    },
  },
  {
    value: "inactive",
    label: "Inativo",
    description: "Inativo — o colaborador fica oculto e sem acesso.",
    confirm: {
      title: "Inativar colaborador?",
      message: "O colaborador fica oculto e perde o acesso ao sistema até ser reativado.",
      confirmLabel: "Inativar",
    },
  },
];

export type CollaboratorInitial = {
  id: string;
  name: string;
  roleId: string | null;
  departmentId: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  status: string;
  hasSystemAccess: boolean;
  tenantRole: string | null;
  isServiceProfessional: boolean;
  professionalId: string | null;
  internalNotes: string | null;
  avatarUrl: string | null;
  customData: Record<string, unknown>;
};

function CustomField({ field, value }: { field: TemplateField; value: unknown }) {
  const name = `custom_${field.key}`;
  if (field.type === "boolean") return <BooleanField name={name} defaultChecked={value === true} label={field.label} />;
  return (
    <Field label={field.label} htmlFor={name} required={field.required} className="col-span-full">
      {field.type === "textarea" ? (
        <Textarea id={name} name={name} rows={2} defaultValue={value != null ? String(value) : ""} />
      ) : field.type === "number" ? (
        <Input id={name} name={name} type="number" step="any" defaultValue={value != null ? String(value) : ""} />
      ) : field.type === "select" ? (
        <Combobox id={name} name={name} defaultValue={value != null ? String(value) : ""} options={(field.options ?? []).map((o) => ({ value: o, label: o }))} />
      ) : field.type === "multiselect" ? (
        <MultiSelect id={name} name={name} defaultValue={Array.isArray(value) ? value.map(String) : []} options={(field.options ?? []).map((o) => ({ value: o, label: o }))} />
      ) : (
        <Input id={name} name={name} defaultValue={value != null ? String(value) : ""} />
      )}
    </Field>
  );
}

function BooleanField({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <Field label={label} className="col-span-full">
      <input type="hidden" name={name} value={on ? "on" : ""} />
      <Switch checked={on} onCheckedChange={setOn} />
    </Field>
  );
}

const TENANT_ROLE_OPTIONS = [
  { value: "tenant_owner", label: "Proprietário" },
  { value: "tenant_manager", label: "Gerente" },
  { value: "tenant_operator", label: "Operador" },
  { value: "tenant_viewer", label: "Visualizador" },
];

export default function CollaboratorForm({
  slug,
  roles,
  departments,
  professionals,
  templateFields,
  canManageEntities,
  canGrantOwner,
  initial,
  onSuccess,
  onCancel,
}: {
  slug: string;
  roles: ManagedItem[];
  departments: ManagedItem[];
  professionals: { id: string; name: string }[];
  templateFields: TemplateField[];
  canManageEntities: boolean;
  canGrantOwner: boolean;
  initial?: CollaboratorInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit
    ? updateCollaboratorAction.bind(null, slug, initial!.id)
    : createCollaboratorAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<CollaboratorActionResult, FormData>(action, undefined);
  const [notesLen, setNotesLen] = useState(initial?.internalNotes?.length ?? 0);
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [hasAccess, setHasAccess] = useState(initial?.hasSystemAccess ?? false);
  const [isProfessional, setIsProfessional] = useState(initial?.isServiceProfessional ?? false);
  const roleOptions = canGrantOwner ? TENANT_ROLE_OPTIONS : TENANT_ROLE_OPTIONS.filter((o) => o.value !== "tenant_owner");

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : "Criar colaborador"}
      confirmOnSave={isEdit}
      confirmTitle="Confirmar alterações do colaborador?"
      initialValues={
        initial && {
          name: initial.name,
          status: initial.status,
          phone: initial.phone ?? "",
          whatsapp: initial.whatsapp ?? "",
          email: initial.email ?? "",
          document: initial.document ?? "",
          internalNotes: initial.internalNotes ?? "",
        }
      }
      fieldLabels={{
        name: "Nome",
        status: "Status",
        phone: "Telefone",
        whatsapp: "WhatsApp",
        email: "E-mail",
        document: "CPF",
        internalNotes: "Notas internas",
      }}
    >
      <FormSection title="Informações principais">
        <div className="col-span-full">
          <StatusSwitchItem
            title="Status do colaborador"
            name="status"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
          />
        </div>
        <Field label="Nome" htmlFor="name" required className="col-span-full">
          <Input id="name" name="name" required maxLength={150} defaultValue={initial?.name} placeholder="Ex.: Maria Silva" />
        </Field>
        <Field label="Cargo / função" htmlFor="roleId">
          <ManagedCombobox
            id="roleId"
            name="roleId"
            items={roles}
            defaultValue={initial?.roleId}
            canManage={canManageEntities}
            placeholder="Selecione o cargo…"
            searchPlaceholder="Buscar função"
            onCreate={createCollaboratorRoleAction.bind(null, slug)}
            onUpdate={updateCollaboratorRoleAction.bind(null, slug)}
            onDelete={deleteCollaboratorRoleAction.bind(null, slug)}
          />
        </Field>
        <Field label="Departamento / área" htmlFor="departmentId">
          <ManagedCombobox
            id="departmentId"
            name="departmentId"
            items={departments}
            defaultValue={initial?.departmentId}
            canManage={canManageEntities}
            placeholder="Selecione o departamento…"
            searchPlaceholder="Buscar departamento"
            onCreate={createCollaboratorDepartmentAction.bind(null, slug)}
            onUpdate={updateCollaboratorDepartmentAction.bind(null, slug)}
            onDelete={deleteCollaboratorDepartmentAction.bind(null, slug)}
          />
        </Field>
      </FormSection>

      <FormSection title="Contato">
        <Field label="Telefone" htmlFor="phone">
          <PhoneInput id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp">
          <PhoneInput id="whatsapp" name="whatsapp" defaultValue={initial?.whatsapp ?? ""} />
        </Field>
        <Field label="E-mail" htmlFor="email" className="col-span-full">
          <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} placeholder="email@empresa.com" />
        </Field>
      </FormSection>

      <FormSection title="Documento">
        <Field label="CPF" htmlFor="document" hint="Interno — não exposto ao cliente/IA">
          <DocumentInput id="document" name="document" defaultValue={initial?.document ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Acesso ao sistema">
        <Field label="Conceder acesso ao sistema" hint="Cria/vincula um usuário; o convite é enviado por e-mail (acesso por código no login)." className="col-span-full">
          <input type="hidden" name="hasSystemAccess" value={hasAccess ? "on" : ""} />
          <Switch checked={hasAccess} onCheckedChange={setHasAccess} />
        </Field>
        {hasAccess && (
          <Field label="Papel no sistema" htmlFor="tenantRole" required className="col-span-full" hint="O e-mail acima é obrigatório para o acesso.">
            <Combobox id="tenantRole" name="tenantRole" defaultValue={initial?.tenantRole ?? ""} placeholder="Selecione o papel…" options={roleOptions} />
          </Field>
        )}
      </FormSection>

      <FormSection title="Profissional de serviço">
        <Field label="Também executa serviços (profissional)" hint="Vincula a um profissional existente ou cria um a partir destes dados." className="col-span-full">
          <input type="hidden" name="isServiceProfessional" value={isProfessional ? "on" : ""} />
          <Switch checked={isProfessional} onCheckedChange={setIsProfessional} />
        </Field>
        {isProfessional && (
          <Field label="Profissional vinculado" htmlFor="professionalId" className="col-span-full" hint="Deixe em branco para criar um novo profissional com o nome/contato acima.">
            <Combobox
              id="professionalId"
              name="professionalId"
              defaultValue={initial?.professionalId ?? ""}
              placeholder="Criar novo a partir dos dados…"
              searchPlaceholder="Buscar profissional…"
              emptyText="Nenhum profissional."
              options={professionals.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
        )}
      </FormSection>

      <FormSection title="Foto / avatar">
        <div className="col-span-full">
          <ImageUpload name="avatar" size="P" defaultUrl={initial?.avatarUrl ?? undefined} removeFieldName="removeAvatar" />
        </div>
      </FormSection>

      {templateFields.length > 0 && (
        <FormSection title="Campos específicos do nicho">
          {templateFields.map((field) => (
            <CustomField key={field.key} field={field} value={initial?.customData?.[field.key]} />
          ))}
        </FormSection>
      )}

      <FormSection title="Observações internas">
        <Field label="Notas internas" htmlFor="internalNotes" hint="Não exposto ao cliente nem à IA" className="col-span-full" counter={`${notesLen}/2000`}>
          <Textarea id="internalNotes" name="internalNotes" rows={2} maxLength={2000} defaultValue={initial?.internalNotes ?? ""} onChange={(e) => setNotesLen(e.target.value.length)} />
        </Field>
      </FormSection>
    </FormDrawerForm>
  );
}
