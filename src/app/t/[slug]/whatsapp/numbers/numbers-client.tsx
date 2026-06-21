"use client";

import Image from "next/image";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AdminActionResult } from "@/lib/admin/action-result";
import type { WhatsappAccountView } from "@/lib/messaging/whatsapp-accounts";

import {
  connectNumberAction,
  disconnectAction,
  reconnectAction,
  refreshStatusAction,
  remotePairingAction,
  setPrimaryAction,
} from "./actions";

const STATUS_LABELS: Record<WhatsappAccountView["status"], string> = {
  open: "Conectado",
  connecting: "Conectando",
  close: "Desconectado",
  disconnected: "Desconectado",
  pending_pairing: "Aguardando pareamento",
  error: "Erro",
};

const STATUS_VARIANT: Record<WhatsappAccountView["status"], "success" | "secondary" | "destructive" | "warning"> = {
  open: "success",
  connecting: "warning",
  close: "secondary",
  disconnected: "secondary",
  pending_pairing: "warning",
  error: "destructive",
};

function useNotifiedAction(
  action: (slug: string, prev: AdminActionResult, fd: FormData) => Promise<AdminActionResult>,
  slug: string,
  okMsg: string,
) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(
    action.bind(null, slug),
    undefined,
  );
  useEffect(() => {
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else if ("ok" in state) toast.success(okMsg);
  }, [state, okMsg]);
  return [formAction, pending] as const;
}

export default function NumbersClient({
  slug,
  accounts,
  canManage,
}: {
  slug: string;
  accounts: WhatsappAccountView[];
  canManage: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Números de WhatsApp</h2>
        <p className="text-sm text-muted-foreground">
          Conecte o número da empresa via QR Code ou gere um link de pareamento remoto para o cliente final.
        </p>
      </div>

      {canManage && (
        <div className="grid gap-4 md:grid-cols-2">
          <ConnectCard slug={slug} />
          <RemotePairingCard slug={slug} />
        </div>
      )}

      <AccountsList slug={slug} accounts={accounts} canManage={canManage} />
    </div>
  );
}

function ConnectCard({ slug }: { slug: string }) {
  const [formAction, pending] = useNotifiedAction(connectNumberAction, slug, "Número em conexão. Escaneie o QR Code.");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar via QR Code</CardTitle>
        <CardDescription>Cria a instância e exibe o QR Code para escanear no WhatsApp.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="connect-name">Nome</Label>
            <Input id="connect-name" name="name" placeholder="WhatsApp principal" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="connect-number">Número (com DDI)</Label>
            <Input id="connect-number" name="number" placeholder="+55 11 99999-9999" required />
          </div>
          <input type="hidden" name="linkMode" value="dual" />
          <Button type="submit" disabled={pending}>
            {pending ? "Conectando…" : "Conectar número"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RemotePairingCard({ slug }: { slug: string }) {
  const [formAction, pending] = useNotifiedAction(remotePairingAction, slug, "Link de pareamento gerado.");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pareamento remoto</CardTitle>
        <CardDescription>Gera um link que o cliente final abre para conectar o próprio número.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-name">Nome</Label>
            <Input id="rp-name" name="name" placeholder="Cliente João" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-number">Número (com DDI)</Label>
            <Input id="rp-number" name="number" placeholder="+55 11 99999-9999" required />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="rp-send" className="text-sm font-normal">
              Enviar link por WhatsApp
            </Label>
            <Switch id="rp-send" name="sendViaWhatsApp" />
          </div>
          <input type="hidden" name="linkMode" value="dual" />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Gerando…" : "Gerar link remoto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AccountsList({
  slug,
  accounts,
  canManage,
}: {
  slug: string;
  accounts: WhatsappAccountView[];
  canManage: boolean;
}) {
  if (accounts.length === 0) {
    return (
      <div className="glass rounded-xl px-6 py-12 text-center text-sm text-muted-foreground">
        Nenhum número conectado ainda.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {accounts.map((acc) => (
        <AccountCard key={acc.id} slug={slug} account={acc} canManage={canManage} />
      ))}
    </div>
  );
}

function AccountCard({
  slug,
  account,
  canManage,
}: {
  slug: string;
  account: WhatsappAccountView;
  canManage: boolean;
}) {
  const [refresh, refreshPending] = useNotifiedAction(refreshStatusAction, slug, "Status atualizado.");
  const [reconnect, reconnectPending] = useNotifiedAction(reconnectAction, slug, "Novo QR Code gerado.");
  const [disconnect, disconnectPending] = useNotifiedAction(disconnectAction, slug, "Número desconectado.");
  const [setPrimary, primaryPending] = useNotifiedAction(setPrimaryAction, slug, "Número principal atualizado.");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              {account.name ?? "Número"}
              {account.isPrimary && <Badge variant="secondary">Principal</Badge>}
            </CardTitle>
            <CardDescription>
              {account.maskedNumber ?? "—"} · Modo {account.linkMode === "dual" ? "Dual" : "Single"}
            </CardDescription>
          </div>
          <Badge variant={STATUS_VARIANT[account.status]}>{STATUS_LABELS[account.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {account.qrcodeBase64 && account.status !== "open" && (
          <div className="flex flex-col items-center gap-2">
            <Image
              src={account.qrcodeBase64}
              alt="QR Code para conectar o WhatsApp"
              width={220}
              height={220}
              unoptimized
              className="rounded-lg border"
            />
            {account.pairingCode && (
              <p className="text-sm text-muted-foreground">
                Código de pareamento: <span className="font-mono font-medium">{account.pairingCode}</span>
              </p>
            )}
          </div>
        )}

        {account.remotePairingUrl && account.status !== "open" && (
          <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
            <span className="text-muted-foreground">Link de pareamento remoto</span>
            <a href={account.remotePairingUrl} target="_blank" rel="noreferrer" className="break-all underline">
              {account.remotePairingUrl}
            </a>
          </div>
        )}

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <SubmitButton action={refresh} accountId={account.id} pending={refreshPending} variant="outline">
              Atualizar status
            </SubmitButton>
            {account.status !== "open" && (
              <SubmitButton action={reconnect} accountId={account.id} pending={reconnectPending} variant="outline">
                Gerar novo QR
              </SubmitButton>
            )}
            {!account.isPrimary && (
              <SubmitButton action={setPrimary} accountId={account.id} pending={primaryPending} variant="outline">
                Definir como principal
              </SubmitButton>
            )}
            <SubmitButton action={disconnect} accountId={account.id} pending={disconnectPending} variant="destructive">
              Desconectar
            </SubmitButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SubmitButton({
  action,
  accountId,
  pending,
  variant,
  children,
}: {
  action: (fd: FormData) => void;
  accountId: string;
  pending: boolean;
  variant: "outline" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="accountId" value={accountId} />
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {children}
      </Button>
    </form>
  );
}
