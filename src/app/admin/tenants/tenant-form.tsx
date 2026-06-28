"use client";

import { Building2, IdCard, Mail, SlidersHorizontal } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

// pt-BR labels for the scalar fields surfaced in the "confirm changes" dialog.
const FIELD_LABELS: Record<string, string> = {
  nicheId: "Nicho",
  name: "Nome",
  legalName: "Razão social",
  document: "CNPJ / CPF",
  description: "Descrição",
  publicPhone: "Telefone público",
  publicEmail: "E-mail público",
  notificationPhone: "Telefone de notificação",
  hasProducts: "Produtos",
  hasServices: "Serviços",
  hasPlans: "Planos",
  hasDelivery: "Entrega",
  hasPickup: "Retirada",
  acceptsOnlinePayment: "Pagamento online",
};

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

  // Edit confirmation: lists changed fields before the save proceeds.
  const [changedFields, setChangedFields] = useState<string[] | null>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const error = actionError(state);

  // Original scalar/flag values, used to diff on save (edit mode only).
  const originalValues = (): Record<string, string> =>
    initial
      ? {
          nicheId: initial.nicheId,
          name: initial.name,
          legalName: initial.legalName ?? "",
          document: initial.document ?? "",
          description: initial.description ?? "",
          publicPhone: initial.publicPhone ?? "",
          publicEmail: initial.publicEmail ?? "",
          notificationPhone: initial.notificationPhone ?? "",
          hasProducts: String(initial.hasProducts),
          hasServices: String(initial.hasServices),
          hasPlans: String(initial.hasPlans),
          hasDelivery: String(initial.hasDelivery),
          hasPickup: String(initial.hasPickup),
          acceptsOnlinePayment: String(initial.acceptsOnlinePayment),
        }
      : {};

  const diffFields = (form: HTMLFormElement): string[] => {
    const data = new FormData(form);
    const original = originalValues();
    const flagNames = new Set(FLAGS.map((f) => f.name as string));
    return Object.keys(original).filter((key) => {
      const current = flagNames.has(key)
        ? String(data.get(key) === "on" || data.get(key) === "true")
        : key === "nicheId"
          ? nicheId
          : String(data.get(key) ?? "");
      return current !== original[key];
    });
  };

  // Edit mode: intercept submit to confirm changes first. The actual submit is
  // re-triggered after the user confirms (confirmedRef guards re-entry).
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isEdit || confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    e.preventDefault();
    setChangedFields(diffFields(e.currentTarget));
  };

  const confirmSave = () => {
    confirmedRef.current = true;
    setChangedFields(null);
    formRef.current?.requestSubmit();
  };

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
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
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

      <AlertDialog open={changedFields !== null} onOpenChange={(open) => !open && setChangedFields(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alterações do tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              {changedFields && changedFields.length > 0
                ? `Os seguintes campos serão alterados: ${changedFields
                    .map((f) => FIELD_LABELS[f] ?? f)
                    .join(", ")}.`
                : "Nenhum campo foi alterado. Deseja salvar mesmo assim?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmSave();
              }}
            >
              Salvar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
