"use client";

import { useActionState, useEffect, useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { Segmented } from "@/components/ui/segmented";
import { actionError, actionOk } from "@/lib/admin/action-result";
import {
  SERVICE_DELIVERY_MODE_LABELS,
  WEEKDAY_LABELS,
  type ServiceDeliveryMode,
} from "@/lib/validations/service";

import { upsertServiceAvailabilityRuleAction, type ServiceActionResult } from "../actions";

export type AvailabilityRuleInitial = {
  id: string;
  deliveryMode: ServiceDeliveryMode;
  weekday: number;
  startTime: string;
  endTime: string;
  professionalId: string | null;
  locationId: string | null;
  slotDurationMinutes: number | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  status: string;
};

const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: WEEKDAY_LABELS[d] }));

export default function AvailabilityRuleForm({
  slug,
  serviceId,
  serviceDeliveryModes,
  professionals,
  locations,
  initial,
  onSuccess,
  onCancel,
}: {
  slug: string;
  serviceId: string;
  serviceDeliveryModes: ServiceDeliveryMode[];
  professionals: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  initial?: AvailabilityRuleInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = upsertServiceAvailabilityRuleAction.bind(null, slug, serviceId, initial?.id ?? null);
  const [state, formAction, pending] = useActionState<ServiceActionResult, FormData>(action, undefined);
  const [mode, setMode] = useState<ServiceDeliveryMode>(initial?.deliveryMode ?? serviceDeliveryModes[0] ?? "online");

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : "Adicionar regra"}
    >
      <FormSection title="Janela">
        <Field label="Modalidade" htmlFor="deliveryMode" required>
          <Combobox
            id="deliveryMode"
            name="deliveryMode"
            value={mode}
            onValueChange={(v) => setMode(v as ServiceDeliveryMode)}
            options={serviceDeliveryModes.map((m) => ({ value: m, label: SERVICE_DELIVERY_MODE_LABELS[m] }))}
          />
        </Field>
        <Field label="Dia da semana" htmlFor="weekday" required>
          <Combobox
            id="weekday"
            name="weekday"
            defaultValue={String(initial?.weekday ?? 1)}
            options={WEEKDAY_OPTIONS}
          />
        </Field>
        <Field label="Início" htmlFor="startTime" required>
          <AffixInput id="startTime" name="startTime" type="time" required defaultValue={initial?.startTime ?? ""} />
        </Field>
        <Field label="Fim" htmlFor="endTime" required>
          <AffixInput id="endTime" name="endTime" type="time" required defaultValue={initial?.endTime ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Recursos">
        <Field label="Profissional" htmlFor="professionalId" hint="Opcional." className="col-span-full">
          <Combobox
            id="professionalId"
            name="professionalId"
            defaultValue={initial?.professionalId ?? ""}
            options={[
              { value: "", label: "Qualquer profissional" },
              ...professionals.map((p) => ({ value: p.id, label: p.name })),
            ]}
            searchPlaceholder="Buscar profissional…"
          />
        </Field>
        {mode === "at_location" && (
          <Field label="Local" htmlFor="locationId" required className="col-span-full">
            <Combobox
              id="locationId"
              name="locationId"
              defaultValue={initial?.locationId ?? ""}
              options={[
                { value: "", label: "Selecione um local" },
                ...locations.map((l) => ({ value: l.id, label: l.name })),
              ]}
              searchPlaceholder="Buscar local…"
            />
          </Field>
        )}
      </FormSection>

      <FormSection title="Slots e buffers">
        <Field label="Duração do slot" htmlFor="slotDurationMinutes" hint="Opcional.">
          <AffixInput
            id="slotDurationMinutes"
            name="slotDurationMinutes"
            type="number"
            min={1}
            suffix="min"
            defaultValue={initial?.slotDurationMinutes ?? ""}
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <Segmented
            name="status"
            ariaLabel="Status da regra"
            defaultValue={initial?.status ?? "active"}
            options={[
              { value: "active", label: "Ativa" },
              { value: "inactive", label: "Inativa" },
            ]}
          />
        </Field>
        <Field label="Buffer antes" htmlFor="bufferBeforeMinutes">
          <AffixInput
            id="bufferBeforeMinutes"
            name="bufferBeforeMinutes"
            type="number"
            min={0}
            suffix="min"
            defaultValue={initial?.bufferBeforeMinutes ?? 0}
          />
        </Field>
        <Field label="Buffer depois" htmlFor="bufferAfterMinutes">
          <AffixInput
            id="bufferAfterMinutes"
            name="bufferAfterMinutes"
            type="number"
            min={0}
            suffix="min"
            defaultValue={initial?.bufferAfterMinutes ?? 0}
          />
        </Field>
      </FormSection>
    </FormDrawerForm>
  );
}
