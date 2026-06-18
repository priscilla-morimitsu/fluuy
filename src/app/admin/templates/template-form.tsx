"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";
import { TEMPLATE_ENTITY_TYPES } from "@/lib/validations/template";

import { createTemplateAction, updateTemplateAction, type ActionResult } from "./actions";

const FIELDS_PLACEHOLDER = JSON.stringify(
  [{ key: "species", label: "Espécie", type: "select", required: true, options: ["dog", "cat"] }],
  null,
  2,
);

export type TemplateInitial = {
  id: string;
  nicheId: string;
  entityType: string;
  name: string;
  description: string | null;
  fields: unknown;
};

export default function TemplateForm({
  niches,
  initial,
  onSuccess,
}: {
  niches: { id: string; name: string }[];
  initial?: TemplateInitial;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateTemplateAction.bind(null, initial!.id) : createTemplateAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const error = actionError(state);
  const fieldsDefault = initial ? JSON.stringify(initial.fields, null, 2) : "[]";

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nicheId">Nicho</Label>
          {/* niche/entity are immutable after creation — disabled in edit. */}
          <Select name="nicheId" required={!isEdit} defaultValue={initial?.nicheId} disabled={isEdit}>
            <SelectTrigger id="nicheId">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {niches.map((niche) => (
                <SelectItem key={niche.id} value={niche.id}>
                  {niche.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="entityType">Entidade</Label>
          <Select name="entityType" required={!isEdit} defaultValue={initial?.entityType} disabled={isEdit}>
            <SelectTrigger id="entityType">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_ENTITY_TYPES.map((entityType) => (
                <SelectItem key={entityType} value={entityType}>
                  {entityType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome do template</Label>
        <Input id="name" name="name" required defaultValue={initial?.name} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={initial?.description ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fields">Fields (JSON)</Label>
        <Textarea
          id="fields"
          name="fields"
          rows={8}
          className="font-mono text-sm"
          placeholder={FIELDS_PLACEHOLDER}
          defaultValue={fieldsDefault}
        />
        <p className="text-xs text-zinc-500">
          Editar os campos incrementa a versão do template automaticamente.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar template"}
      </Button>
    </form>
  );
}
