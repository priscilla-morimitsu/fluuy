"use client";

import { useActionState, useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrengthHint } from "@/components/auth/password-strength-hint";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { setInitialPasswordAction, type ActionResult } from "./actions";

export default function SetPasswordForm() {
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    setInitialPasswordAction,
    undefined,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Defina sua senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <PasswordField
            name="password"
            label="Senha"
            autoComplete="new-password"
            required
            onValueChange={setPassword}
          />
          <PasswordStrengthHint password={password} />
          <PasswordField
            name="confirmPassword"
            label="Confirmar senha"
            autoComplete="new-password"
            required
          />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Definir senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
