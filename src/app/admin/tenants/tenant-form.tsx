"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";

import { createTenantAction, updateTenantAction, type ActionResult } from "./actions";

const FLAGS = [
  { name: "hasProducts", label: "Produtos" },
  { name: "hasServices", label: "Serviços" },
  { name: "hasPlans", label: "Planos" },
  { name: "hasDelivery", label: "Entrega" },
  { name: "hasPickup", label: "Retirada" },
  { name: "acceptsOnlinePayment", label: "Pagamento online" },
] as const;

export type TenantInitial = {
  id: string;
  nicheId: string;
  name: string;
  slug: string;
  legalName: string | null;
  document: string | null;
  description: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  notificationPhone: string | null;
  hasProducts: boolean;
  hasServices: boolean;
  hasPlans: boolean;
  hasDelivery: boolean;
  hasPickup: boolean;
  acceptsOnlinePayment: boolean;
};

export default function TenantForm({
  niches,
  initial,
  onSuccess,
}: {
  niches: { id: string; name: string }[];
  initial?: TenantInitial;
  onSuccess?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateTenantAction.bind(null, initial!.id) : createTenantAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, undefined);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const error = actionError(state);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nicheId">Nicho</Label>
          <Select name="nicheId" required defaultValue={initial?.nicheId}>
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
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required defaultValue={initial?.name} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            placeholder="petshop-da-maria"
            required={!isEdit}
            defaultValue={initial?.slug}
            disabled={isEdit}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="legalName">Razão social</Label>
          <Input id="legalName" name="legalName" defaultValue={initial?.legalName ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="document">CNPJ/CPF</Label>
          <Input id="document" name="document" defaultValue={initial?.document ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="publicPhone">Telefone público</Label>
          <Input id="publicPhone" name="publicPhone" defaultValue={initial?.publicPhone ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="publicEmail">E-mail público</Label>
          <Input id="publicEmail" name="publicEmail" type="email" defaultValue={initial?.publicEmail ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notificationPhone">Telefone de notificação</Label>
          <Input
            id="notificationPhone"
            name="notificationPhone"
            defaultValue={initial?.notificationPhone ?? ""}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={initial?.description ?? ""} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {FLAGS.map((flag) => (
          <label key={flag.name} className="flex items-center gap-2">
            <input
              type="checkbox"
              name={flag.name}
              className="size-4"
              defaultChecked={initial ? initial[flag.name] : false}
            />
            {flag.label}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar tenant"}
      </Button>
    </form>
  );
}
