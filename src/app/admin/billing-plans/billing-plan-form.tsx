"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { createBillingPlanAction, type ActionResult } from "./actions";

export default function BillingPlanForm({ features }: { features: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    createBillingPlanAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="key">Key</Label>
          <Input id="key" name="key" placeholder="plano_piloto" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="price">Preço (mensalidade)</Label>
          <Input id="price" name="price" type="number" step="0.01" min="0" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="billingPeriod">Periodicidade</Label>
          <Select name="billingPeriod" required defaultValue="monthly">
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
        <Textarea id="description" name="description" rows={2} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Features inclusas</Label>
        <div className="flex flex-wrap gap-4 text-sm">
          {features.map((feature) => (
            <label key={feature.id} className="flex items-center gap-2">
              <input type="checkbox" name="featureIds" value={feature.id} className="size-4" />
              {feature.name}
            </label>
          ))}
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Criando..." : "Criar plano"}
      </Button>
    </form>
  );
}
