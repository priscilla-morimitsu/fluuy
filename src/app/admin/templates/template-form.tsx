"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TEMPLATE_ENTITY_TYPES } from "@/lib/validations/template";

import { createTemplateAction, type ActionResult } from "./actions";

const FIELDS_PLACEHOLDER = JSON.stringify(
  [{ key: "species", label: "Espécie", type: "select", required: true, options: ["dog", "cat"] }],
  null,
  2,
);

export default function TemplateForm({ niches }: { niches: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    createTemplateAction,
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
          <Label htmlFor="entityType">Entidade</Label>
          <Select name="entityType" required>
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
        <Input id="name" name="name" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fields">Fields (JSON)</Label>
        <Textarea
          id="fields"
          name="fields"
          rows={6}
          className="font-mono text-sm"
          placeholder={FIELDS_PLACEHOLDER}
          defaultValue="[]"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Criando..." : "Criar template"}
      </Button>
    </form>
  );
}
