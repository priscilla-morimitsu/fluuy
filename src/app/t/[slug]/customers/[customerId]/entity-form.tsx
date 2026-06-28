"use client";

import { useActionState, useEffect } from "react";

import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { Segmented } from "@/components/ui/segmented";
import { actionError, actionOk } from "@/lib/admin/action-result";
import { CUSTOMER_ENTITY_TYPE_SUGGESTIONS } from "@/lib/validations/customer";
import type { TemplateField } from "@/lib/validations/template";

import { TemplateFieldInputs } from "../template-fields";
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
        <Field label="Status" htmlFor="status" className="col-span-full">
          <Segmented name="status" ariaLabel="Status" defaultValue={initial?.status ?? "active"} options={STATUS_OPTIONS} />
        </Field>
      </FormSection>

      {templateFields.length > 0 && (
        <FormSection title="Campos específicos do nicho">
          <TemplateFieldInputs fields={templateFields} values={initial?.customData} />
        </FormSection>
      )}
    </FormDrawerForm>
  );
}
