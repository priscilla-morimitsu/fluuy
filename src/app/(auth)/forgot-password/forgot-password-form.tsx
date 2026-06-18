"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { requestPasswordResetAction, type ActionResult } from "./actions";

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    requestPasswordResetAction,
    undefined,
  );
  const success = state && "success" in state;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Esqueci minha senha</CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Se houver uma conta ativa com esse e-mail, enviamos instruções para redefinir a
            senha.
          </p>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando..." : "Enviar instruções"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
