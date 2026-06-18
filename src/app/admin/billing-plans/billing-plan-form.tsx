"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";

import { createBillingPlanAction, updateBillingPlanAction, type ActionResult } from "./actions";

export type BillingPlanInitial = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: string;
  billingPeriod: string;
  featureIds: string[];
};

export default function BillingPlanForm({
  features,
  initial,
  onSuccess,
}: {
  features: { id: string; name: string }[];
  initial?: BillingPlanInitial;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateBillingPlanAction.bind(null, initial!.id) : createBillingPlanAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const error = actionError(state);
  const selected = new Set(initial?.featureIds ?? []);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="key">Key</Label>
          <Input
            id="key"
            name="key"
            placeholder="plano_piloto"
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
          <Label htmlFor="price">Preço (mensalidade)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initial?.price}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="billingPeriod">Periodicidade</Label>
          <Select name="billingPeriod" required defaultValue={initial?.billingPeriod ?? "monthly"}>
            <SelectTrigger id="billingPeriod">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={initial?.description ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Features inclusas</Label>
        <div className="flex flex-wrap gap-4 text-sm">
          {features.map((feature) => (
            <label key={feature.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="featureIds"
                value={feature.id}
                className="size-4"
                defaultChecked={selected.has(feature.id)}
              />
              {feature.name}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar plano"}
      </Button>
    </form>
  );
}
