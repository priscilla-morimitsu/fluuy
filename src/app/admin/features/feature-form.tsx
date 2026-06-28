"use client";

import { FolderTree, Hash, Puzzle } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";

import { createFeatureAction, updateFeatureAction, type ActionResult } from "./actions";

export type FeatureInitial = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  group: string | null;
};

export default function FeatureForm({
  initial,
  onSuccess,
  onCancel,
}: {
  initial?: FeatureInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateFeatureAction.bind(null, initial!.id) : createFeatureAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);
  const [descLen, setDescLen] = useState(initial?.description?.length ?? 0);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : "Criar feature"}
      confirmOnSave={isEdit}
      confirmTitle="Confirmar alterações da feature?"
      initialValues={
        initial && {
          name: initial.name,
          group: initial.group ?? "",
          description: initial.description ?? "",
        }
      }
      fieldLabels={{
        name: "Nome",
        group: "Grupo",
        description: "Descrição",
      }}
    >
      <FormSection title="Identificação">
        <Field label="Key" htmlFor="key" required={!isEdit} hint={isEdit ? "Imutável após a criação." : "snake_case"}>
          <AffixInput id="key" name="key" leadIcon={<Hash />} placeholder="product_catalog" required={!isEdit} disabled={isEdit} defaultValue={initial?.key} />
        </Field>
        <Field label="Nome" htmlFor="name" required>
          <AffixInput id="name" name="name" leadIcon={<Puzzle />} required defaultValue={initial?.name} />
        </Field>
        <Field label="Grupo" htmlFor="group" hint="Agrupa features relacionadas">
          <AffixInput id="group" name="group" leadIcon={<FolderTree />} placeholder="catalog" defaultValue={initial?.group ?? ""} />
        </Field>
        <Field label="Descrição" htmlFor="description" className="col-span-full" counter={`${descLen}/2000`}>
          <Textarea
            id="description"
            name="description"
            rows={2}
            maxLength={2000}
            className="min-h-[84px]"
            defaultValue={initial?.description ?? ""}
            onChange={(e) => setDescLen(e.target.value.length)}
          />
        </Field>
      </FormSection>
    </FormDrawerForm>
  );
}
