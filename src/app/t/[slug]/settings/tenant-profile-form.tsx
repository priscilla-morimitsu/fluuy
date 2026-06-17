"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateField } from "@/lib/validations/template";

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
}: {
  tenantId: string;
  tenant: TenantFixedFields;
  customData: Record<string, unknown>;
  templateFields: TemplateField[];
}) {
  const boundAction = updateTenantProfileAction.bind(null, tenantId, templateFields);
  const [state, action, pending] = useActionState<ActionResult, FormData>(boundAction, undefined);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Dados fixos</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={tenant.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="legalName">Razão social</Label>
            <Input id="legalName" name="legalName" defaultValue={tenant.legalName} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="publicPhone">Telefone público</Label>
            <Input id="publicPhone" name="publicPhone" defaultValue={tenant.publicPhone} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="publicEmail">E-mail público</Label>
            <Input id="publicEmail" name="publicEmail" type="email" defaultValue={tenant.publicEmail} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notificationPhone">Telefone de notificação</Label>
            <Input
              id="notificationPhone"
              name="notificationPhone"
              defaultValue={tenant.notificationPhone}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" rows={2} defaultValue={tenant.description} />
        </div>
      </fieldset>

      {templateFields.length > 0 && (
        <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Campos do nicho</legend>
          <div className="grid grid-cols-2 gap-4">
            {templateFields.map((field) => {
              const name = `custom_${field.key}`;
              const value = customData[field.key];
              if (field.type === "boolean") {
                return (
                  <label key={field.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name={name} defaultChecked={Boolean(value)} className="size-4" />
                    {field.label}
                  </label>
                );
              }
              if (field.type === "select" && field.options) {
                return (
                  <div key={field.key} className="flex flex-col gap-2">
                    <Label htmlFor={name}>{field.label}</Label>
                    <Select name={name} defaultValue={value ? String(value) : undefined} required={field.required}>
                      <SelectTrigger id={name}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              return (
                <div key={field.key} className="flex flex-col gap-2">
                  <Label htmlFor={name}>{field.label}</Label>
                  <Input
                    id={name}
                    name={name}
                    type={field.type === "number" ? "number" : "text"}
                    defaultValue={value !== undefined && value !== null ? String(value) : ""}
                    required={field.required}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
