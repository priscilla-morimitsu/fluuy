"use client";

import { Building2, IdCard, Mail, SlidersHorizontal } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { FormGrid } from "@/components/ui/form-drawer";
import { FormStepPanel, FormSteps, type FormStep } from "@/components/ui/form-steps";
import { DocumentInput, PhoneInput } from "@/components/ui/masked-inputs";
import { SwitchCard } from "@/components/ui/switch-card";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";

import { createTenantAction, updateTenantAction, type ActionResult } from "./actions";

const FLAGS = [
  { name: "hasProducts", label: "Produtos", hint: "Catálogo de produtos" },
  { name: "hasServices", label: "Serviços", hint: "Catálogo de serviços" },
  { name: "hasPlans", label: "Planos", hint: "Planos/assinaturas" },
  { name: "hasDelivery", label: "Entrega", hint: "Entrega de pedidos" },
  { name: "hasPickup", label: "Retirada", hint: "Retirada no local" },
  { name: "acceptsOnlinePayment", label: "Pagamento online", hint: "Cobrança online" },
] as const;

const STEPS: FormStep[] = [
  { id: "ident", label: "Identificação", icon: IdCard },
  { id: "contato", label: "Contato", icon: Mail },
  { id: "recursos", label: "Recursos", icon: SlidersHorizontal },
];

export type TenantInitial = {
  id: string;
  nicheId: string;
  name: string;
  slug: string;
  legalName: string | null;
  document: string | null;
  description: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  notificationPhone: string | null;
  hasProducts: boolean;
  hasServices: boolean;
  hasPlans: boolean;
  hasDelivery: boolean;
  hasPickup: boolean;
  acceptsOnlinePayment: boolean;
};

export default function TenantForm({
  niches,
  initial,
  onSuccess,
  onCancel,
}: {
  niches: { id: string; name: string }[];
  initial?: TenantInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateTenantAction.bind(null, initial!.id) : createTenantAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  const formRef = useRef<HTMLFormElement>(null);
  const [nicheId, setNicheId] = useState(initial?.nicheId ?? "");
  const [nicheInvalid, setNicheInvalid] = useState(false);
  const [descLen, setDescLen] = useState(initial?.description?.length ?? 0);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const error = actionError(state);

  // First invalid field in DOM order across all steps (drives focus-first-error).
  const validate = (): HTMLElement | null => {
    if (!nicheId) {
      setNicheInvalid(true);
      return document.getElementById("nicheId");
    }
    setNicheInvalid(false);
    const form = formRef.current;
    const name = form?.elements.namedItem("name");
    if (name instanceof HTMLInputElement && !name.value.trim()) return name;
    if (!isEdit) {
      const slug = form?.elements.namedItem("slug");
      if (slug instanceof HTMLInputElement && !slug.value.trim()) return slug;
    }
    return null;
  };

  return (
    <form ref={formRef} action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="nicheId" value={nicheId} />
      {error && (
        <p className="mx-5 mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <FormSteps
        steps={STEPS}
        loading={pending}
        submitLabel={isEdit ? "Salvar alterações" : "Criar tenant"}
        onCancel={onCancel}
        validate={validate}
      >
        <FormStepPanel step="ident" title="Identificação">
          <FormGrid>
            <Field label="Nicho" htmlFor="nicheId" required error={nicheInvalid ? "Selecione o nicho." : undefined}>
              <Combobox
                id="nicheId"
                ariaInvalid={nicheInvalid}
                value={nicheId}
                onValueChange={(v) => {
                  setNicheId(v);
                  setNicheInvalid(false);
                }}
                options={niches.map((n) => ({ value: n.id, label: n.name }))}
                placeholder="Selecione o nicho"
                searchPlaceholder="Buscar nicho…"
                emptyText="Nenhum nicho."
              />
            </Field>

            <Field label="Nome" htmlFor="name" required>
              <AffixInput id="name" name="name" leadIcon={<Building2 />} required defaultValue={initial?.name} placeholder="Petshop da Maria" />
            </Field>

            <Field label="Slug" htmlFor="slug" required={!isEdit} hint={isEdit ? "Não editável após a criação." : "Minúsculas, números e hífens."}>
              <AffixInput
                id="slug"
                name="slug"
                prefix="/t/"
                required={!isEdit}
                disabled={isEdit}
                defaultValue={initial?.slug}
                placeholder="petshop-da-maria"
              />
            </Field>

            <Field label="Razão social" htmlFor="legalName">
              <AffixInput id="legalName" name="legalName" defaultValue={initial?.legalName ?? ""} placeholder="Maria Pereira MEI" />
            </Field>

            <Field label="CNPJ / CPF" htmlFor="document">
              <DocumentInput id="document" name="document" defaultValue={initial?.document ?? ""} />
            </Field>

            <Field label="Descrição" htmlFor="description" className="col-span-full" counter={`${descLen}/2000`}>
              <Textarea
                id="description"
                name="description"
                rows={2}
                maxLength={2000}
                defaultValue={initial?.description ?? ""}
                onChange={(e) => setDescLen(e.target.value.length)}
              />
            </Field>
          </FormGrid>
        </FormStepPanel>

        <FormStepPanel step="contato" title="Contato">
          <FormGrid>
            <Field label="Telefone público" htmlFor="publicPhone">
              <PhoneInput id="publicPhone" name="publicPhone" defaultValue={initial?.publicPhone ?? ""} />
            </Field>

            <Field label="E-mail público" htmlFor="publicEmail">
              <AffixInput id="publicEmail" name="publicEmail" type="email" leadIcon={<Mail />} defaultValue={initial?.publicEmail ?? ""} placeholder="contato@empresa.com" />
            </Field>

            <Field label="Telefone de notificação" htmlFor="notificationPhone" className="col-span-full">
              <PhoneInput id="notificationPhone" name="notificationPhone" defaultValue={initial?.notificationPhone ?? ""} />
            </Field>
          </FormGrid>
        </FormStepPanel>

        <FormStepPanel step="recursos" title="Recursos">
          <div className="grid grid-cols-1 gap-2.5 @[440px]:grid-cols-2">
            {FLAGS.map((flag) => (
              <SwitchCard
                key={flag.name}
                name={flag.name}
                title={flag.label}
                hint={flag.hint}
                defaultChecked={initial ? initial[flag.name] : false}
              />
            ))}
          </div>
        </FormStepPanel>
      </FormSteps>
    </form>
  );
}
