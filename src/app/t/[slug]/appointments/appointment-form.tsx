"use client";

import { useActionState, useEffect, useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";
import { APPOINTMENT_MODALITIES, APPOINTMENT_RESPONSIBLE_TYPES } from "@/lib/validations/appointment";
import type { TemplateField } from "@/lib/validations/template";

import { createAppointmentAction, updateAppointmentAction, type AppointmentActionResult } from "./actions";
import { MODALITY_LABELS, RESPONSIBLE_LABELS } from "./labels";

export type AppointmentOptions = {
  customers: { id: string; name: string; phone: string }[];
  services: { id: string; name: string; estimatedDurationMinutes: number | null }[];
  professionals: { id: string; name: string }[];
  locations: { id: string; name: string }[];
};

export type AppointmentInitial = {
  id: string;
  customerId: string;
  serviceId: string;
  responsibleType: string;
  professionalId: string | null;
  locationId: string | null;
  modality: string;
  startAt: Date;
  endAt: Date;
  customerNotes: string | null;
  internalNotes: string | null;
  customData: Record<string, unknown>;
};

const STATUS_CREATE = [
  { value: "requested", label: "Solicitado" },
  { value: "pending_confirmation", label: "Aguardando confirmação" },
  { value: "confirmed", label: "Confirmado" },
];

function toLocalInput(d: Date | null | undefined): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppointmentForm({
  slug,
  options,
  templateFields,
  initial,
  defaultStartAt,
  onSuccess,
  onCancel,
}: {
  slug: string;
  options: AppointmentOptions;
  templateFields: TemplateField[];
  initial?: AppointmentInitial;
  defaultStartAt?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit
    ? updateAppointmentAction.bind(null, slug, initial!.id)
    : createAppointmentAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<AppointmentActionResult, FormData>(action, undefined);

  const [responsibleType, setResponsibleType] = useState(initial?.responsibleType ?? "professional");
  const [modality, setModality] = useState(initial?.modality ?? "at_location");

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : "Criar agendamento"}
    >
      <input type="hidden" name="source" value="manual" />

      <FormSection title="Cliente e serviço">
        <Field label="Cliente" htmlFor="customerId" required className="col-span-full">
          <Combobox
            id="customerId"
            name="customerId"
            defaultValue={initial?.customerId ?? ""}
            options={options.customers.map((c) => ({ value: c.id, label: c.name, description: c.phone }))}
            placeholder="Selecione o cliente…"
            searchPlaceholder="Buscar cliente…"
            emptyText="Nenhum cliente."
          />
        </Field>
        <Field label="Serviço" htmlFor="serviceId" required className="col-span-full">
          <Combobox
            id="serviceId"
            name="serviceId"
            defaultValue={initial?.serviceId ?? ""}
            options={options.services.map((s) => ({
              value: s.id,
              label: s.name,
              description: s.estimatedDurationMinutes ? `${s.estimatedDurationMinutes} min` : undefined,
            }))}
            placeholder="Selecione o serviço…"
            searchPlaceholder="Buscar serviço…"
            emptyText="Nenhum serviço."
          />
        </Field>
      </FormSection>

      <FormSection title="Responsável e modalidade">
        <Field label="Responsável" htmlFor="responsibleType">
          <Combobox
            id="responsibleType"
            name="responsibleType"
            value={responsibleType}
            onValueChange={setResponsibleType}
            options={APPOINTMENT_RESPONSIBLE_TYPES.map((r) => ({ value: r, label: RESPONSIBLE_LABELS[r] }))}
          />
        </Field>
        {responsibleType === "professional" && (
          <Field label="Profissional" htmlFor="professionalId" required>
            <Combobox
              id="professionalId"
              name="professionalId"
              defaultValue={initial?.professionalId ?? ""}
              options={options.professionals.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Selecione…"
              searchPlaceholder="Buscar profissional…"
              emptyText="Nenhum profissional."
            />
          </Field>
        )}
        <Field label="Modalidade" htmlFor="modality">
          <Combobox
            id="modality"
            name="modality"
            value={modality}
            onValueChange={setModality}
            options={APPOINTMENT_MODALITIES.map((m) => ({ value: m, label: MODALITY_LABELS[m] }))}
          />
        </Field>
        {modality === "at_location" && (
          <Field label="Local" htmlFor="locationId" required>
            <Combobox
              id="locationId"
              name="locationId"
              defaultValue={initial?.locationId ?? ""}
              options={options.locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="Selecione…"
              searchPlaceholder="Buscar local…"
              emptyText="Nenhum local."
            />
          </Field>
        )}
      </FormSection>

      <FormSection title="Horário">
        <Field label="Início" htmlFor="startAt" required>
          <AffixInput id="startAt" name="startAt" type="datetime-local" required defaultValue={toLocalInput(initial?.startAt) || defaultStartAt || ""} />
        </Field>
        <Field label="Término" htmlFor="endAt" hint="Calculado pela duração do serviço se vazio.">
          <AffixInput id="endAt" name="endAt" type="datetime-local" defaultValue={toLocalInput(initial?.endAt)} />
        </Field>
        {!isEdit && (
          <Field label="Status inicial" htmlFor="status" className="col-span-full">
            <Combobox id="status" name="status" defaultValue="confirmed" options={STATUS_CREATE} />
          </Field>
        )}
      </FormSection>

      <FormSection title="Observações">
        <Field label="Observações do cliente" htmlFor="customerNotes" className="col-span-full">
          <Textarea id="customerNotes" name="customerNotes" rows={2} maxLength={2000} defaultValue={initial?.customerNotes ?? ""} />
        </Field>
        <Field label="Notas internas" htmlFor="internalNotes" className="col-span-full" hint="Não exibidas para o cliente nem para a IA.">
          <Textarea id="internalNotes" name="internalNotes" rows={2} maxLength={2000} defaultValue={initial?.internalNotes ?? ""} />
        </Field>
      </FormSection>

      {templateFields.length > 0 && (
        <FormSection title="Campos específicos do nicho">
          {templateFields.map((field) => {
            const name = `custom_${field.key}`;
            const value = initial?.customData?.[field.key];
            if (field.type === "boolean") {
              return (
                <label key={field.key} className="col-span-full flex items-center gap-2 text-sm">
                  <input type="checkbox" name={name} defaultChecked={Boolean(value)} className="size-4" />
                  {field.label}
                </label>
              );
            }
            if ((field.type === "select" || field.type === "multiselect") && field.options) {
              return (
                <Field key={field.key} label={field.label} htmlFor={name} required={field.required} className="col-span-full">
                  <Combobox id={name} name={name} defaultValue={value != null ? String(value) : ""} options={field.options.map((o) => ({ value: o, label: o }))} placeholder="Selecione" emptyText="Sem opções." />
                </Field>
              );
            }
            return (
              <Field key={field.key} label={field.label} htmlFor={name} required={field.required}>
                <AffixInput id={name} name={name} type={field.type === "number" ? "number" : "text"} defaultValue={value != null ? String(value) : ""} required={field.required} />
              </Field>
            );
          })}
        </FormSection>
      )}
    </FormDrawerForm>
  );
}
