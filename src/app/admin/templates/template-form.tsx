"use client";

import { FileText } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";
import { TEMPLATE_ENTITY_TYPES } from "@/lib/validations/template";

import { createTemplateAction, updateTemplateAction, type ActionResult } from "./actions";

const FIELDS_PLACEHOLDER = JSON.stringify(
  [{ key: "species", label: "Espécie", type: "select", required: true, options: ["dog", "cat"] }],
  null,
  2,
);

export type TemplateInitial = {
  id: string;
  nicheId: string;
  entityType: string;
  name: string;
  description: string | null;
  fields: unknown;
};

export default function TemplateForm({
  niches,
  initial,
  onSuccess,
  onCancel,
}: {
  niches: { id: string; name: string }[];
  initial?: TemplateInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateTemplateAction.bind(null, initial!.id) : createTemplateAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const fieldsDefault = initial ? JSON.stringify(initial.fields, null, 2) : "[]";

  // niche/entity are immutable after creation; Combobox is the standard select.
  const [nicheId, setNicheId] = useState(initial?.nicheId ?? "");
  const [entityType, setEntityType] = useState(initial?.entityType ?? "");

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : "Criar template"}
      confirmOnSave={isEdit}
      confirmTitle="Confirmar alterações do template?"
      initialValues={
        initial && {
          name: initial.name,
          description: initial.description ?? "",
          fields: fieldsDefault,
        }
      }
      fieldLabels={{
        name: "Nome do template",
        description: "Descrição",
        fields: "Campos (JSON)",
      }}
    >
      <input type="hidden" name="nicheId" value={nicheId} />
      <input type="hidden" name="entityType" value={entityType} />
      <FormSection title="Definição">
        <Field label="Nicho" htmlFor="nicheId" required={!isEdit} hint={isEdit ? "Imutável após a criação." : undefined}>
          <Combobox
            id="nicheId"
            value={nicheId}
            onValueChange={setNicheId}
            disabled={isEdit}
            options={niches.map((n) => ({ value: n.id, label: n.name }))}
            placeholder="Selecione o nicho"
            searchPlaceholder="Buscar nicho…"
            emptyText="Nenhum nicho."
          />
        </Field>
        <Field label="Entidade" htmlFor="entityType" required={!isEdit} hint={isEdit ? "Imutável após a criação." : undefined}>
          <Combobox
            id="entityType"
            value={entityType}
            onValueChange={setEntityType}
            disabled={isEdit}
            options={TEMPLATE_ENTITY_TYPES.map((e) => ({ value: e, label: e }))}
            placeholder="Selecione a entidade"
            searchPlaceholder="Buscar…"
            emptyText="Nenhuma entidade."
          />
        </Field>
        <Field label="Nome do template" htmlFor="name" required className="col-span-full">
          <AffixInput id="name" name="name" leadIcon={<FileText />} required defaultValue={initial?.name} />
        </Field>
        <Field label="Descrição" htmlFor="description" className="col-span-full">
          <Textarea id="description" name="description" rows={2} className="min-h-[84px]" defaultValue={initial?.description ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Campos do template">
        <Field
          label="Fields (JSON)"
          htmlFor="fields"
          className="col-span-full"
          hint="Editar os campos incrementa a versão do template automaticamente."
        >
          <Textarea
            id="fields"
            name="fields"
            rows={8}
            className="min-h-[84px] font-mono text-sm"
            placeholder={FIELDS_PLACEHOLDER}
            defaultValue={fieldsDefault}
          />
        </Field>
      </FormSection>
    </FormDrawerForm>
  );
}
