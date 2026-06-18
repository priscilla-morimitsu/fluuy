"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { createLeadAction, type LeadActionResult } from "./lead-actions";

export function LeadForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<LeadActionResult | undefined, FormData>(
    createLeadAction,
    undefined,
  );
  const success = state && "success" in state;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button type="button" variant="link" className="px-0">
            Quero usar o Fluuy
          </Button>
        }
      />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Quero usar o Fluuy</SheetTitle>
          <SheetDescription>
            Deixe seus dados que nossa equipe entra em contato. Isso não cria uma conta — o
            acesso é configurado pela equipe Fluuy após o contato comercial.
          </SheetDescription>
        </SheetHeader>
        {success ? (
          <p className="px-4 text-sm text-emerald-600">
            Recebemos seu interesse! Nossa equipe vai entrar em contato em breve.
          </p>
        ) : (
          <form action={action} className="flex flex-col gap-4 px-4">
            <input type="hidden" name="source" value="login_page" />
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-name">Nome</Label>
              <Input id="lead-name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-company">Empresa</Label>
              <Input id="lead-company" name="companyName" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-email">E-mail</Label>
              <Input id="lead-email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-phone">WhatsApp</Label>
              <Input id="lead-phone" name="phone" placeholder="+5511999999999" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-niche">Segmento/nicho</Label>
              <Input id="lead-niche" name="niche" placeholder="Ex: petshop, clínica, salão..." />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-message">Mensagem (opcional)</Label>
              <Textarea id="lead-message" name="message" rows={3} />
            </div>
            {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
            <SheetFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Enviando..." : "Enviar"}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
