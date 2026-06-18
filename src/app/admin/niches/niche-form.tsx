"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}: {
  initial?: NicheInitial;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(initial);
  // In edit mode the action is bound to the niche id; key is immutable.
  const action = isEdit ? updateNicheAction.bind(null, initial!.id) : createNicheAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const error = actionError(state);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="key">Key</Label>
          <Input
            id="key"
            name="key"
            placeholder="pet_services"
            required={!isEdit}
            defaultValue={initial?.key}
            disabled={isEdit}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" placeholder="Petshops" required defaultValue={initial?.name} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerLabel">Label do cliente</Label>
          <Input
            id="customerLabel"
            name="customerLabel"
            placeholder="Tutor"
            defaultValue={initial?.customerLabel ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="entityLabel">Label da entidade</Label>
          <Input
            id="entityLabel"
            name="entityLabel"
            placeholder="Pet"
            defaultValue={initial?.entityLabel ?? ""}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={initial?.description ?? ""} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar nicho"}
      </Button>
    </form>
  );
}
