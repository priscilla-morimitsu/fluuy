"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createNicheAction, type ActionResult } from "./actions";

export default function NicheForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    createNicheAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="key">Key</Label>
          <Input id="key" name="key" placeholder="pet_services" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" placeholder="Petshops" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerLabel">Label do cliente</Label>
          <Input id="customerLabel" name="customerLabel" placeholder="Tutor" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="entityLabel">Label da entidade</Label>
          <Input id="entityLabel" name="entityLabel" placeholder="Pet" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Criando..." : "Criar nicho"}
      </Button>
    </form>
  );
}
