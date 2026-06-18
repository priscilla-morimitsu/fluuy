"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";

import { createFeatureAction, updateFeatureAction, type ActionResult } from "./actions";

export type FeatureInitial = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  group: string | null;
};

export default function FeatureForm({
  initial,
  onSuccess,
}: {
  initial?: FeatureInitial;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateFeatureAction.bind(null, initial!.id) : createFeatureAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const error = actionError(state);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="key">Key</Label>
          <Input
            id="key"
            name="key"
            placeholder="product_catalog"
            required={!isEdit}
            defaultValue={initial?.key}
            disabled={isEdit}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required defaultValue={initial?.name} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="group">Grupo</Label>
          <Input id="group" name="group" placeholder="catalog" defaultValue={initial?.group ?? ""} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={initial?.description ?? ""} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar feature"}
      </Button>
    </form>
  );
}
