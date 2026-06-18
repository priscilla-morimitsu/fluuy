"use client";

import { useActionState, useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrengthHint } from "@/components/auth/password-strength-hint";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { confirmPasswordResetAction, type ActionResult } from "./actions";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    confirmPasswordResetAction,
    undefined,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Definir nova senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <PasswordField
            name="password"
            label="Nova senha"
            autoComplete="new-password"
            required
            onValueChange={setPassword}
          />
          <PasswordStrengthHint password={password} />
          <PasswordField
            name="confirmPassword"
            label="Confirmar nova senha"
            autoComplete="new-password"
            required
          />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
