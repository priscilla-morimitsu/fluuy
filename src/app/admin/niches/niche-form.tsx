"use client";

import { Hash, Tag } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";

import { createNicheAction, updateNicheAction, type ActionResult } from "./actions";

export type NicheInitial = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  customerLabel: string | null;
  entityLabel: string | null;
};

export default function NicheForm({
  initial,
  onSuccess,
  onCancel,
}: {
  initial?: NicheInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  // In edit mode the action is bound to the niche id; key is immutable.
  const action = isEdit ? updateNicheAction.bind(null, initial!.id) : createNicheAction;
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
      submitLabel={isEdit ? "Salvar alterações" : "Criar nicho"}
    >
      <FormSection title="Identificação">
        <Field label="Key" htmlFor="key" required={!isEdit} hint={isEdit ? "Imutável após a criação." : "snake_case (ex: pet_services)"}>
          <AffixInput id="key" name="key" leadIcon={<Hash />} placeholder="pet_services" required={!isEdit} disabled={isEdit} defaultValue={initial?.key} />
        </Field>
        <Field label="Nome" htmlFor="name" required>
          <AffixInput id="name" name="name" leadIcon={<Tag />} placeholder="Petshops" required defaultValue={initial?.name} />
        </Field>
        <Field label="Label do cliente" htmlFor="customerLabel" hint="Como o nicho chama o cliente">
          <AffixInput id="customerLabel" name="customerLabel" placeholder="Tutor" defaultValue={initial?.customerLabel ?? ""} />
        </Field>
        <Field label="Label da entidade" htmlFor="entityLabel" hint="Entidade principal do nicho">
          <AffixInput id="entityLabel" name="entityLabel" placeholder="Pet" defaultValue={initial?.entityLabel ?? ""} />
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
