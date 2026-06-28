"use client";

import { UserPlus } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormDrawer, FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { actionError, actionOk } from "@/lib/admin/action-result";
import { pluralizePt } from "@/lib/validations/customer";
import type { TemplateField } from "@/lib/validations/template";

import {
  createCustomerEntityAction,
  updateCustomerEntityAction,
  type CustomerActionResult,
} from "./actions";
import { TemplateFieldInputs } from "./template-fields";

export type PetSheetClient = { id: string; name: string };
export type PetSheetPet = {
  id: string;
  status: string;
  customData: Record<string, unknown>;
};

// Template-driven grouping: pet fields whose key starts with these prefixes are
// pulled into their own collapsible/secondary sections; everything else is the
// main "Dados do pet" group. We never hardcode the pet fields themselves.
const TUTOR2_PREFIX = "tutor2_";
const EMERGENCY_PREFIX = "contato_emergencia_";

function splitFields(fields: TemplateField[]): {
  main: TemplateField[];
  tutor2: TemplateField[];
  emergency: TemplateField[];
} {
  const main: TemplateField[] = [];
  const tutor2: TemplateField[] = [];
  const emergency: TemplateField[] = [];
  for (const field of fields) {
    if (field.key.startsWith(TUTOR2_PREFIX)) tutor2.push(field);
    else if (field.key.startsWith(EMERGENCY_PREFIX)) emergency.push(field);
    else main.push(field);
  }
  return { main, tutor2, emergency };
}

/** Build the changed-fields diff baseline (FormData name → string) from a pet. */
function baselineValues(fields: TemplateField[], pet?: PetSheetPet): Record<string, string> {
  const base: Record<string, string> = {};
  for (const field of fields) {
    const v = pet?.customData?.[field.key];
    base[`custom_${field.key}`] = v == null ? "" : String(v);
  }
  base.status = pet?.status ?? "active";
  return base;
}

/**
 * Fluuy — PetSheet.
 *
 * Reusable single-pet editor (one `CustomerEntity`) rendered in a right-side
 * FormDrawer. Template-driven: the pet's `custom_data` fields come from the
 * niche template and are grouped by key prefix into "Dados do pet",
 * "Tutor adicional" and "Contato de emergência". Submitting calls the existing
 * create/update entity Server Action; on edit, a confirmation dialog lists the
 * changed fields before saving.
 */
export function PetSheet({
  slug,
  client,
  entityType,
  entityLabel,
  templateFields,
  pet,
  onClose,
  onSaved,
}: {
  slug: string;
  client: PetSheetClient;
  /** Resolved entity type for the niche (e.g. "pet"). Posted as `entityType`. */
  entityType: string;
  /** Human label for the entity (e.g. "Pet"), used in copy. */
  entityLabel: string;
  templateFields: TemplateField[];
  /** Present → edit mode; absent → create mode. */
  pet?: PetSheetPet;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const isEdit = Boolean(pet);

  const groups = useMemo(() => splitFields(templateFields), [templateFields]);

  const action = isEdit
    ? updateCustomerEntityAction.bind(null, slug, client.id, pet!.id)
    : createCustomerEntityAction.bind(null, slug, client.id);
  const [state, formAction, pending] = useActionState<CustomerActionResult, FormData>(action, undefined);

  useEffect(() => {
    if (actionOk(state)) {
      toast.success(isEdit ? `${entityLabel} atualizado.` : `${entityLabel} adicionado.`);
      onSaved?.();
      onClose();
    }
  }, [state, isEdit, entityLabel, onSaved, onClose]);

  const fieldLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const field of templateFields) labels[`custom_${field.key}`] = field.label;
    return labels;
  }, [templateFields]);

  // The optional second tutor is hidden behind an "Adicionar tutor" button until
  // requested — but stays open from the start when the pet already has one.
  const hasTutor = groups.tutor2.some((f) => {
    const v = pet?.customData?.[f.key];
    return v != null && String(v).trim() !== "";
  });
  const [showTutor, setShowTutor] = useState(hasTutor);

  return (
    <FormDrawer
      open
      onOpenChange={(open) => !open && onClose()}
      title={isEdit ? `Editar ${entityLabel.toLowerCase()}` : `Novo ${entityLabel.toLowerCase()}`}
      hideFooter
      allowFullscreen
      solid
      hideHeaderText
      contentScrolls={false}
    >
      {/* Breadcrumb header — the sheet's only visible header (FormDrawer's default
          title is suppressed via hideHeaderText). */}
      <div className="border-b border-(--glass-border) px-5 pt-1 pb-3">
        <p className="text-xs text-muted-foreground">
          Cliente › <span className="font-medium text-foreground">{client.name}</span> › {pluralizePt(entityLabel)}
        </p>
        <h2 className="text-2xl font-bold tracking-tight">
          {isEdit ? `Editar ${entityLabel.toLowerCase()}` : `Novo ${entityLabel.toLowerCase()}`}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isEdit
            ? `Editar dados do ${entityLabel.toLowerCase()} vinculado ao cliente.`
            : `Cadastre um ${entityLabel.toLowerCase()} vinculado ao cliente.`}
        </p>
      </div>

      <FormDrawerForm
        action={formAction}
        pending={pending}
        error={actionError(state)}
        onCancel={onClose}
        submitLabel={isEdit ? "Salvar" : `Adicionar ${entityLabel.toLowerCase()}`}
        confirmOnSave={isEdit}
        confirmTitle="Salvar alterações do pet?"
        initialValues={baselineValues(templateFields, pet)}
        fieldLabels={fieldLabels}
      >
        {/* entityType is resolved server-side context, not user input, but the
            create/update actions read it from FormData — emit it hidden. */}
        <input type="hidden" name="entityType" value={entityType} readOnly />
        <input type="hidden" name="status" value={pet?.status ?? "active"} readOnly />

        {/* Main pet fields — no section heading, matching the spec. */}
        <FormSection>
          <TemplateFieldInputs fields={groups.main} values={pet?.customData} />
        </FormSection>

        {/* Optional second tutor — a button that reveals the fields on demand. */}
        {groups.tutor2.length > 0 &&
          (showTutor ? (
            <FormSection title="Tutor adicional">
              <TemplateFieldInputs fields={groups.tutor2} values={pet?.customData} />
            </FormSection>
          ) : (
            <div>
              <Button type="button" tone="neutral" appearance="outline" size="sm" className="rounded-lg" onClick={() => setShowTutor(true)}>
                <UserPlus /> Adicionar tutor
              </Button>
            </div>
          ))}

        {groups.emergency.length > 0 && (
          <FormSection title="Contato de emergência">
            <TemplateFieldInputs fields={groups.emergency} values={pet?.customData} />
          </FormSection>
        )}
      </FormDrawerForm>
    </FormDrawer>
  );
}
