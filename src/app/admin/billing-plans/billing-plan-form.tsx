"use client";

import { Hash, Tag } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { CurrencyInput } from "@/components/ui/masked-inputs";
import { MultiSelect } from "@/components/ui/multiselect";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";

import { createBillingPlanAction, updateBillingPlanAction, type ActionResult } from "./actions";

export type BillingPlanInitial = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: string;
  billingPeriod: string;
  featureIds: string[];
};

export default function BillingPlanForm({
  features,
  initial,
  onSuccess,
  onCancel,
}: {
  features: { id: string; name: string }[];
  initial?: BillingPlanInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateBillingPlanAction.bind(null, initial!.id) : createBillingPlanAction;
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
      submitLabel={isEdit ? "Salvar alterações" : "Criar plano"}
    >
      <FormSection title="Plano">
        <Field label="Key" htmlFor="key" required={!isEdit} hint={isEdit ? "Imutável após a criação." : "snake_case"}>
          <AffixInput id="key" name="key" leadIcon={<Hash />} placeholder="plano_piloto" required={!isEdit} disabled={isEdit} defaultValue={initial?.key} />
        </Field>
        <Field label="Nome" htmlFor="name" required>
          <AffixInput id="name" name="name" leadIcon={<Tag />} required defaultValue={initial?.name} />
        </Field>
        <Field label="Preço (mensalidade)" htmlFor="price" required>
          <CurrencyInput id="price" name="price" suffix="/mês" required defaultValue={initial?.price ?? ""} />
        </Field>
        <Field label="Periodicidade" htmlFor="billingPeriod">
          <Segmented
            name="billingPeriod"
            ariaLabel="Periodicidade"
            defaultValue={initial?.billingPeriod ?? "monthly"}
            options={[
              { value: "monthly", label: "Mensal" },
              { value: "yearly", label: "Anual" },
            ]}
          />
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

      <FormSection title="Features inclusas">
        <Field label="Features" htmlFor="featureIds" className="col-span-full" hint="Selecione as features do plano">
          <MultiSelect
            id="featureIds"
            name="featureIds"
            defaultValue={initial?.featureIds ?? []}
            options={features.map((f) => ({ value: f.id, label: f.name }))}
            placeholder="Selecione as features…"
            searchPlaceholder="Buscar feature…"
            emptyText="Nenhuma feature."
          />
        </Field>
      </FormSection>
    </FormDrawerForm>
  );
}
