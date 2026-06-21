"use client";

import { useActionState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { loginWithPasswordAction, signInWithGoogleAction, type ActionResult } from "./actions";
import { LeadForm } from "./lead-form";
import { OtpLoginForm } from "./otp-login-form";

export default function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    loginWithPasswordAction,
    undefined,
  );

  return (
    <GlassCard className="w-full max-w-sm">
      <GlassCardHeader>
        <GlassCardTitle>Entrar no Fluuy</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="flex flex-col gap-4">
        <Tabs defaultValue="password">
          <TabsList className="w-full">
            <TabsTrigger value="password">Senha</TabsTrigger>
            <TabsTrigger value="email">Código e-mail</TabsTrigger>
            <TabsTrigger value="whatsapp">Código WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <form action={action} className="flex flex-col gap-4 pt-4">
              <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <PasswordField name="password" label="Senha" autoComplete="current-password" required />
              <div className="text-right text-sm">
                <a href="/forgot-password" className="text-zinc-600 underline dark:text-zinc-400">
                  Esqueci minha senha
                </a>
              </div>
              {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
              <Button type="submit" variant="brand" disabled={pending}>
                {pending ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="email" className="pt-4">
            <OtpLoginForm channel="email" callbackUrl={callbackUrl} />
          </TabsContent>

          <TabsContent value="whatsapp" className="pt-4">
            <OtpLoginForm channel="whatsapp" callbackUrl={callbackUrl} />
          </TabsContent>
        </Tabs>

        <form action={() => signInWithGoogleAction(callbackUrl)}>
          <Button type="submit" variant="outline" className="w-full">
            Entrar com Google
          </Button>
        </form>

        <div className="text-center text-sm">
          <LeadForm />
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
