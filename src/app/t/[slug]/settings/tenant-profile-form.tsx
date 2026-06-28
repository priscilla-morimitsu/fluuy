"use client";

import { useActionState } from "react";

import { TemplateFieldsRenderer } from "@/components/crud/template-fields-renderer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateField, TemplateLayout } from "@/lib/validations/template";

import { updateTenantProfileAction, type ActionResult } from "./actions";

type TenantFixedFields = {
  name: string;
  legalName: string;
  description: string;
  publicPhone: string;
  publicEmail: string;
  notificationPhone: string;
};

export default function TenantProfileForm({
  tenantId,
  tenant,
  customData,
  templateFields,
  templateLayout,
}: {
  tenantId: string;
  tenant: TenantFixedFields;
  customData: Record<string, unknown>;
  templateFields: TemplateField[];
  templateLayout?: TemplateLayout;
}) {
  const boundAction = updateTenantProfileAction.bind(null, tenantId, templateFields);
  const [state, action, pending] = useActionState<ActionResult, FormData>(boundAction, undefined);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      <fieldset className="glass flex flex-col gap-4 rounded-xl p-4">
        <legend className="px-1 text-sm font-medium">Dados fixos</legend>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nome" htmlFor="name" required>
            <Input id="name" name="name" defaultValue={tenant.name} required />
          </FormField>
          <FormField label="Razão social" htmlFor="legalName">
            <Input id="legalName" name="legalName" defaultValue={tenant.legalName} />
          </FormField>
          <FormField label="Telefone público" htmlFor="publicPhone">
            <Input id="publicPhone" name="publicPhone" defaultValue={tenant.publicPhone} />
          </FormField>
          <FormField label="E-mail público" htmlFor="publicEmail">
            <Input id="publicEmail" name="publicEmail" type="email" defaultValue={tenant.publicEmail} />
          </FormField>
          <FormField label="Telefone de notificação" htmlFor="notificationPhone">
            <Input id="notificationPhone" name="notificationPhone" defaultValue={tenant.notificationPhone} />
          </FormField>
        </div>
        <FormField label="Descrição" htmlFor="description">
          <Textarea id="description" name="description" rows={2} defaultValue={tenant.description} />
        </FormField>
      </fieldset>

      {templateFields.length > 0 && (
        <fieldset className="glass flex flex-col gap-4 rounded-xl p-4 @container">
          <legend className="px-1 text-sm font-medium">Campos do nicho</legend>
          <TemplateFieldsRenderer fields={templateFields} layout={templateLayout} values={customData} prefix="custom_" />
        </fieldset>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="brand" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
