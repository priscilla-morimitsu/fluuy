"use client";

import { Tag } from "lucide-react";
import { useActionState, useEffect } from "react";

import { Combobox } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";
import { CUSTOMER_ENTITY_TYPE_SUGGESTIONS } from "@/lib/validations/customer";
import type { TemplateField } from "@/lib/validations/template";

import {
  createCustomerEntityAction,
  updateCustomerEntityAction,
  type CustomerActionResult,
} from "../actions";

export type CustomerEntityInitial = {
  id: string;
  entityType: string;
  name: string;
  status: string;
  customData: Record<string, unknown>;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];

export default function EntityForm({
  slug,
  customerId,
  entityLabel,
  templateFields,
  initial,
  onSuccess,
  onCancel,
}: {
  slug: string;
  customerId: string;
  entityLabel: string;
  templateFields: TemplateField[];
  initial?: CustomerEntityInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit
    ? updateCustomerEntityAction.bind(null, slug, customerId, initial!.id)
    : createCustomerEntityAction.bind(null, slug, customerId);
  const [state, formAction, pending] = useActionState<CustomerActionResult, FormData>(action, undefined);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : `Adicionar ${entityLabel.toLowerCase()}`}
    >
      <FormSection title="Informações">
        <Field label="Tipo" htmlFor="entityType" required hint="Selecione ou digite um tipo (ex.: pet, vehicle).">
          <Combobox
            id="entityType"
            name="entityType"
            defaultValue={initial?.entityType ?? ""}
            options={CUSTOMER_ENTITY_TYPE_SUGGESTIONS}
            allowCustom
            placeholder="Selecione ou digite…"
            searchPlaceholder="Buscar ou digitar tipo…"
            emptyText="Digite para usar um tipo."
          />
        </Field>
        <Field label="Nome" htmlFor="name" required>
          <AffixInput id="name" name="name" required maxLength={150} defaultValue={initial?.name} />
        </Field>
        <Field label="Status" htmlFor="status" className="col-span-full">
          <Segmented name="status" ariaLabel="Status" defaultValue={initial?.status ?? "active"} options={STATUS_OPTIONS} />
        </Field>
      </FormSection>

      {templateFields.length > 0 && (
        <FormSection title="Campos específicos do nicho">
          {templateFields.map((field) => {
            const name = `custom_${field.key}`;
            const value = initial?.customData?.[field.key];
            if (field.type === "boolean") {
              return (
                <Field key={field.key} label={field.label} htmlFor={name} className="col-span-full">
                  <Combobox
                    id={name}
                    name={name}
                    defaultValue={value === true ? "true" : value === false ? "false" : ""}
                    options={[
                      { value: "true", label: "Sim" },
                      { value: "false", label: "Não" },
                    ]}
                    placeholder="Selecione"
                    emptyText="Sem opções."
                  />
                </Field>
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
    </FormDrawerForm>
  );
}
