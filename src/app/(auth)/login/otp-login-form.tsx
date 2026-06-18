"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { requestOtpAction, verifyOtpAction, type ActionResult } from "./actions";

export function OtpLoginForm({
  channel,
  callbackUrl,
}: {
  channel: "email" | "whatsapp";
  callbackUrl?: string;
}) {
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [identifier, setIdentifier] = useState("");
  const [requestError, setRequestError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [verifyState, verifyAction, verifyPending] = useActionState<ActionResult, FormData>(
    verifyOtpAction,
    undefined,
  );

  const isEmail = channel === "email";

  if (stage === "verify") {
    return (
      <form action={verifyAction} className="flex flex-col gap-4">
        <input type="hidden" name="channel" value={channel} />
        <input type="hidden" name="identifier" value={identifier} />
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enviamos um código para {identifier}. Ele expira em 5 minutos.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`code-${channel}`}>Código</Label>
          <Input
            id={`code-${channel}`}
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
          />
        </div>
        {verifyState?.error && <p className="text-sm text-red-600">{verifyState.error}</p>}
        <Button type="submit" disabled={verifyPending}>
          {verifyPending ? "Verificando..." : "Entrar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setStage("request")}>
          Usar outro {isEmail ? "e-mail" : "número"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`identifier-${channel}`}>{isEmail ? "E-mail" : "WhatsApp (com DDI, ex: +5511999999999)"}</Label>
        <Input
          id={`identifier-${channel}`}
          type={isEmail ? "email" : "tel"}
          placeholder={isEmail ? "voce@empresa.com" : "+5511999999999"}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
      </div>
      {requestError && <p className="text-sm text-red-600">{requestError}</p>}
      <Button
        type="button"
        disabled={pending || !identifier}
        onClick={() =>
          startTransition(async () => {
            setRequestError(undefined);
            const result = await requestOtpAction(channel, identifier);
            if (result.error) setRequestError(result.error);
            else setStage("verify");
          })
        }
      >
        {pending ? "Enviando..." : "Enviar código"}
      </Button>
    </div>
  );
}
