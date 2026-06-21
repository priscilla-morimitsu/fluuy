"use client";

import { Plus, Tag } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { PhoneInput } from "@/components/ui/masked-inputs";
import { MultiSelect } from "@/components/ui/multiselect";
import { Segmented } from "@/components/ui/segmented";
import { SwitchCard } from "@/components/ui/switch-card";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";
import type { TemplateField } from "@/lib/validations/template";

import {
  createProfessionalAction,
  createProfessionalSpecialtyAction,
  updateProfessionalAction,
  type ProfessionalActionResult,
} from "./actions";

export type IdName = { id: string; name: string };
export type MemberOption = { id: string; name: string; email: string };

export type ProfessionalInitial = {
  id: string;
  userId: string | null;
  name: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: string;
  publicProfile: boolean;
  internalNotes: string | null;
  customData: Record<string, unknown>;
  specialtyIds: string[];
  serviceIds: string[];
  locationIds: string[];
};

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];

export default function ProfessionalForm({
  slug,
  specialties,
  services,
  locations,
  members,
  templateFields,
  initial,
  onSuccess,
  onCancel,
}: {
  slug: string;
  specialties: IdName[];
  services: IdName[];
  locations: IdName[];
  members: MemberOption[];
  templateFields: TemplateField[];
  initial?: ProfessionalInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit
    ? updateProfessionalAction.bind(null, slug, initial!.id)
    : createProfessionalAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<ProfessionalActionResult, FormData>(action, undefined);

  const [userId, setUserId] = useState(initial?.userId ?? "");

  // Specialties: uncontrolled MultiSelect + inline create (remount on add).
  const [specOptions, setSpecOptions] = useState(specialties);
  const [specIds, setSpecIds] = useState<string[]>(initial?.specialtyIds ?? []);
  const [specKey, setSpecKey] = useState(0);
  const [specCreating, startCreateSpec] = useTransition();
  const [specDraft, setSpecDraft] = useState<string | null>(null);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const addSpecialty = (name: string) => {
    if (name.trim().length < 2) return;
    startCreateSpec(async () => {
      const res = await createProfessionalSpecialtyAction(slug, name.trim());
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setSpecOptions((prev) => [...prev, { id: res.specialty.id, name: res.specialty.name }]);
      setSpecIds((prev) => [...prev, res.specialty.id]);
      setSpecKey((k) => k + 1);
      setSpecDraft(null);
      toast.success("Especialidade criada.");
    });
  };

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : "Criar profissional"}
    >
      <input type="hidden" name="userId" value={userId} />

      <FormSection title="Informações principais">
        <Field label="Nome" htmlFor="name" required>
          <AffixInput id="name" name="name" required maxLength={150} defaultValue={initial?.name} />
        </Field>
        <Field label="Cargo / função" htmlFor="title" required>
          <AffixInput id="title" name="title" required maxLength={120} defaultValue={initial?.title ?? ""} />
        </Field>
        <Field label="Bio" htmlFor="bio" className="col-span-full">
          <Textarea id="bio" name="bio" rows={3} maxLength={2000} defaultValue={initial?.bio ?? ""} />
        </Field>
        <Field label="Foto (URL)" htmlFor="avatarUrl" className="col-span-full" hint="Cole o link de uma imagem (sem upload no MVP).">
          <AffixInput
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            placeholder="https://…"
            defaultValue={initial?.avatarUrl ?? ""}
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <Segmented name="status" ariaLabel="Status" defaultValue={initial?.status ?? "active"} options={STATUS_OPTIONS} />
        </Field>
        <SwitchCard
          title="Perfil público"
          hint="Visível para clientes e para a IA quando o profissional está ativo."
          name="publicProfile"
          defaultChecked={initial?.publicProfile ?? true}
        />
      </FormSection>

      <FormSection title="Contato">
        <Field label="Telefone" htmlFor="phone">
          <PhoneInput id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp">
          <PhoneInput id="whatsapp" name="whatsapp" defaultValue={initial?.whatsapp ?? ""} />
        </Field>
        <Field label="E-mail" htmlFor="email" className="col-span-full">
          <AffixInput id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Especialidades">
        <Field label="Especialidades" htmlFor="specialtyIds" className="col-span-full" hint="Opcional.">
          <MultiSelect
            key={`spec-${specKey}`}
            id="specialtyIds"
            name="specialtyIds"
            defaultValue={specIds}
            onValueChange={setSpecIds}
            options={specOptions.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Selecione especialidades…"
            searchPlaceholder="Buscar especialidade…"
            emptyText="Nenhuma especialidade cadastrada."
          />
        </Field>
        <div className="col-span-full">
          {specDraft === null ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSpecDraft("")}>
              <Plus /> Nova especialidade
            </Button>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Nome da especialidade" htmlFor="newSpec" className="min-w-[180px] flex-1">
                <AffixInput
                  id="newSpec"
                  value={specDraft}
                  onChange={(e) => setSpecDraft(e.target.value)}
                  placeholder="Ex.: Ortodontia"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSpecialty(specDraft);
                    }
                  }}
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                disabled={specCreating || specDraft.trim().length < 2}
                onClick={() => addSpecialty(specDraft)}
              >
                Adicionar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSpecDraft(null)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Serviços">
        <Field label="Serviços que executa" htmlFor="serviceIds" className="col-span-full" hint="Vincula via ServiceProfessional.">
          <MultiSelect
            id="serviceIds"
            name="serviceIds"
            defaultValue={initial?.serviceIds ?? []}
            options={services.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Selecione serviços…"
            searchPlaceholder="Buscar serviço…"
            emptyText="Nenhum serviço cadastrado."
          />
        </Field>
      </FormSection>

      <FormSection title="Locais">
        <Field label="Locais de atendimento" htmlFor="locationIds" className="col-span-full" hint="Opcional. Locais físicos do tenant.">
          <MultiSelect
            id="locationIds"
            name="locationIds"
            defaultValue={initial?.locationIds ?? []}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="Selecione locais…"
            searchPlaceholder="Buscar local…"
            emptyText="Nenhum local cadastrado."
          />
        </Field>
      </FormSection>

      <FormSection title="Usuário vinculado">
        <Field label="Usuário do sistema" htmlFor="userId" className="col-span-full" hint="Opcional. Vincula o profissional a um usuário que acessa o sistema.">
          <Combobox
            id="userId"
            value={userId}
            onValueChange={setUserId}
            options={[
              { value: "", label: "Sem usuário vinculado" },
              ...members.map((m) => ({ value: m.id, label: m.name, description: m.email })),
            ]}
            searchPlaceholder="Buscar usuário…"
            emptyText="Nenhum usuário no tenant."
          />
        </Field>
      </FormSection>

      {templateFields.length > 0 && (
        <FormSection title="Campos específicos do nicho">
          {templateFields.map((field) => {
            const name = `custom_${field.key}`;
            const value = initial?.customData?.[field.key];
            if (field.type === "boolean") {
              return (
                <SwitchCard
                  key={field.key}
                  title={field.label}
                  name={name}
                  defaultChecked={Boolean(value)}
                  className="col-span-full"
                />
              );
            }
            if ((field.type === "select" || field.type === "multiselect") && field.options) {
              return (
                <Field key={field.key} label={field.label} htmlFor={name} required={field.required} className="col-span-full">
                  <Combobox
                    id={name}
                    name={name}
                    defaultValue={value != null ? String(value) : ""}
                    options={field.options.map((o) => ({ value: o, label: o }))}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar…"
                    emptyText="Sem opções."
                  />
                </Field>
              );
            }
            if (field.type === "textarea") {
              return (
                <Field key={field.key} label={field.label} htmlFor={name} required={field.required} className="col-span-full">
                  <Textarea id={name} name={name} rows={2} defaultValue={value != null ? String(value) : ""} required={field.required} />
                </Field>
              );
            }
            return (
              <Field key={field.key} label={field.label} htmlFor={name} required={field.required}>
                <AffixInput
                  id={name}
                  name={name}
                  leadIcon={<Tag />}
                  type={field.type === "number" ? "number" : "text"}
                  defaultValue={value != null ? String(value) : ""}
                  required={field.required}
                />
              </Field>
            );
          })}
        </FormSection>
      )}

      <FormSection title="Observações internas">
        <Field label="Notas internas" htmlFor="internalNotes" className="col-span-full" hint="Não exibidas para clientes nem para a IA.">
          <Textarea id="internalNotes" name="internalNotes" rows={2} maxLength={2000} defaultValue={initial?.internalNotes ?? ""} />
        </Field>
      </FormSection>
    </FormDrawerForm>
  );
}
