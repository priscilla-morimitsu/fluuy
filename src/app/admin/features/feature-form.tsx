"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createFeatureAction, type ActionResult } from "./actions";

export default function FeatureForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    createFeatureAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="key">Key</Label>
          <Input id="key" name="key" placeholder="product_catalog" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="group">Grupo</Label>
          <Input id="group" name="group" placeholder="catalog" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Criando..." : "Criar feature"}
      </Button>
    </form>
  );
}
