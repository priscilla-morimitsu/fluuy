"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { createTenantAction, type ActionResult } from "./actions";

const FLAGS: { name: string; label: string }[] = [
  { name: "hasProducts", label: "Produtos" },
  { name: "hasServices", label: "Serviços" },
  { name: "hasPlans", label: "Planos" },
  { name: "hasDelivery", label: "Entrega" },
  { name: "hasPickup", label: "Retirada" },
  { name: "acceptsOnlinePayment", label: "Pagamento online" },
];

export default function TenantForm({ niches }: { niches: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    createTenantAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nicheId">Nicho</Label>
          <Select name="nicheId" required>
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
          <Input id="name" name="name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" placeholder="petshop-da-maria" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="legalName">Razão social</Label>
          <Input id="legalName" name="legalName" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="document">CNPJ/CPF</Label>
          <Input id="document" name="document" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="publicPhone">Telefone público</Label>
          <Input id="publicPhone" name="publicPhone" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="publicEmail">E-mail público</Label>
          <Input id="publicEmail" name="publicEmail" type="email" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notificationPhone">Telefone de notificação</Label>
          <Input id="notificationPhone" name="notificationPhone" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {FLAGS.map((flag) => (
          <label key={flag.name} className="flex items-center gap-2">
            <input type="checkbox" name={flag.name} className="size-4" />
            {flag.label}
          </label>
        ))}
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Criando..." : "Criar tenant"}
      </Button>
    </form>
  );
}
