"use client";

import { useActionState, useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrengthHint } from "@/components/auth/password-strength-hint";
import { Button } from "@/components/ui/button";

import { changePasswordAction, type ActionResult } from "./actions";

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    changePasswordAction,
    undefined,
  );
  const success = state && "success" in state;

  return (
    <form action={action} className="flex flex-col gap-4">
      <PasswordField name="currentPassword" label="Senha atual" autoComplete="current-password" required />
      <PasswordField
        name="password"
        label="Nova senha"
        autoComplete="new-password"
        required
        onValueChange={setPassword}
      />
      <PasswordStrengthHint password={password} />
      <PasswordField name="confirmPassword" label="Confirmar nova senha" autoComplete="new-password" required />
      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
      {success && <p className="text-sm text-emerald-600">Senha alterada com sucesso.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
