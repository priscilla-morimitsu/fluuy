"use client";

import { CheckCheck, Clock, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/crud/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminActionResult } from "@/lib/admin/action-result";
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationFiltersInput,
} from "@/lib/messaging/conversations";
import {
  ASSIGNEE_TYPE_LABELS,
  CONVERSATION_STATUS_LABELS,
  type AssigneeTypeValue,
  type ConversationStatusValue,
} from "@/lib/validations/conversation";

import {
  markReadAction,
  sendMessageAction,
  setAssigneeAction,
  setConsentAction,
  setStatusAction,
} from "./actions";

const ASSIGNEE_VARIANT: Record<AssigneeTypeValue, "success" | "warning" | "secondary"> = {
  ai: "success",
  human: "warning",
  paused: "secondary",
  unassigned: "secondary",
};

const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

function notify(state: AdminActionResult, okMsg: string) {
  if (!state) return;
  if ("error" in state) toast.error(state.error);
  else if ("ok" in state) toast.success(okMsg);
}

export default function ConversationsClient({
  slug,
  conversations,
  detail,
  selectedId,
  canWrite,
  canManageConsent,
  filters,
}: {
  slug: string;
  conversations: ConversationListItem[];
  detail: ConversationDetail | null;
  selectedId: string | null;
  canWrite: boolean;
  canManageConsent: boolean;
  filters: ConversationFiltersInput;
}) {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Conversas</h2>
        <p className="text-sm text-muted-foreground">Atendimento e histórico das conversas de WhatsApp.</p>
      </div>

      <div className="grid h-[calc(100vh-220px)] min-h-[480px] gap-4 lg:grid-cols-[320px_1fr_300px]">
        <ConversationListPane conversations={conversations} selectedId={selectedId} filters={filters} />
        <ThreadPane slug={slug} detail={detail} canWrite={canWrite} />
        <SidePanel slug={slug} detail={detail} canWrite={canWrite} canManageConsent={canManageConsent} />
      </div>
    </div>
  );
}

function ConversationListPane({
  conversations,
  selectedId,
  filters,
}: {
  conversations: ConversationListItem[];
  selectedId: string | null;
  filters: ConversationFiltersInput;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("c");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <CardHeader className="gap-2 pb-2">
        <Input
          placeholder="Buscar nome ou telefone"
          defaultValue={filters.search ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("search", (e.target as HTMLInputElement).value || null);
          }}
        />
        <div className="flex gap-1.5">
          <FilterChip label="Todas" active={!filters.unread} onClick={() => updateParam("unread", null)} />
          <FilterChip label="Não lidas" active={!!filters.unread} onClick={() => updateParam("unread", "1")} />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
        {conversations.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Nenhuma conversa" description="As conversas aparecem aqui quando você recebe mensagens." />
          </div>
        ) : (
          <ul className="divide-y">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`${pathname}?c=${c.id}`}
                  className={`flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/50 ${
                    selectedId === c.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{c.contactName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.lastMessageAt ? relativeDay(c.lastMessageAt) : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-muted-foreground">{c.lastMessagePreview ?? "—"}</span>
                    {c.unreadCount > 0 && (
                      <Badge variant="success" className="shrink-0">
                        {c.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={ASSIGNEE_VARIANT[c.assigneeType]} className="text-[10px]">
                      {ASSIGNEE_TYPE_LABELS[c.assigneeType]}
                    </Badge>
                    {!c.isCustomer && (
                      <Badge variant="secondary" className="text-[10px]">
                        Lead
                      </Badge>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {label}
    </button>
  );
}

function ThreadPane({ slug, detail, canWrite }: { slug: string; detail: ConversationDetail | null; canWrite: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark read + scroll to bottom when a conversation is opened.
  useEffect(() => {
    if (detail) {
      void markReadAction(slug, detail.id);
      bottomRef.current?.scrollIntoView();
    }
  }, [slug, detail]);

  if (!detail) {
    return (
      <Card className="flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Selecione uma conversa para ver as mensagens.</p>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-base">{detail.contactName}</CardTitle>
        <span className="text-xs text-muted-foreground">{detail.contactNumberMasked ?? "—"}</span>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto py-4">
        {detail.messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem mensagens ainda.</p>
        ) : (
          detail.messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </CardContent>
      {canWrite && <Composer slug={slug} detail={detail} />}
    </Card>
  );
}

function MessageBubble({ message }: { message: ConversationDetail["messages"][number] }) {
  const outbound = message.direction === "outbound";
  const failed = message.internalStatus === "failed";
  return (
    <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
          outbound ? "bg-primary text-primary-foreground" : "bg-muted"
        } ${failed ? "border border-destructive" : ""}`}
      >
        {message.content ? <p className="whitespace-pre-wrap break-words">{message.content}</p> : <em>(sem conteúdo)</em>}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
          {message.sentByAgent && <span>IA</span>}
          <span>{timeFmt.format(message.createdAt)}</span>
          {outbound && <StatusIcon status={message.internalStatus} />}
        </div>
        {failed && message.errorMessage && (
          <p className="mt-1 text-[10px] text-destructive">{message.errorMessage}</p>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "read" || status === "delivered") return <CheckCheck className="size-3" />;
  if (status === "failed") return <TriangleAlert className="size-3" />;
  return <Clock className="size-3" />;
}

function Composer({ slug, detail }: { slug: string; detail: ConversationDetail }) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(
    sendMessageAction.bind(null, slug),
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    notify(state, "Mensagem enviada.");
    if (state && "ok" in state) formRef.current?.reset();
  }, [state]);

  const optedOut = detail.optInStatus === "opted_out";

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2 border-t p-3">
      <input type="hidden" name="conversationId" value={detail.id} />
      <input type="hidden" name="mode" value="text" />
      {optedOut && (
        <p className="text-xs text-destructive">Contato em opt-out — não é possível enviar mensagens.</p>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          name="content"
          placeholder="Digite uma mensagem…"
          rows={2}
          required
          disabled={optedOut || !detail.hasConnectedNumber}
          className="min-h-[44px] resize-none"
        />
        <Button type="submit" size="icon" disabled={pending || optedOut || !detail.hasConnectedNumber}>
          <Send className="size-4" />
        </Button>
      </div>
      {!detail.hasConnectedNumber && (
        <p className="text-xs text-muted-foreground">Conecte um número de WhatsApp para enviar mensagens.</p>
      )}
    </form>
  );
}

function SidePanel({
  slug,
  detail,
  canWrite,
  canManageConsent,
}: {
  slug: string;
  detail: ConversationDetail | null;
  canWrite: boolean;
  canManageConsent: boolean;
}) {
  if (!detail) {
    return (
      <Card className="hidden lg:flex lg:items-center lg:justify-center">
        <p className="text-sm text-muted-foreground">Detalhes do contato</p>
      </Card>
    );
  }

  return (
    <Card className="hidden min-h-0 flex-col overflow-y-auto lg:flex">
      <CardHeader>
        <CardTitle className="text-base">{detail.contactName}</CardTitle>
        <span className="text-xs text-muted-foreground">{detail.contactNumberMasked ?? "—"}</span>
        <div className="flex flex-wrap gap-1 pt-1">
          <Badge variant={ASSIGNEE_VARIANT[detail.assigneeType]}>{ASSIGNEE_TYPE_LABELS[detail.assigneeType]}</Badge>
          <Badge variant="secondary">{CONVERSATION_STATUS_LABELS[detail.status]}</Badge>
          {detail.contact.kind === "lead" && <Badge variant="secondary">Lead</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {canWrite && (
          <PanelSection title="Atendimento">
            <div className="flex flex-wrap gap-1.5">
              {(["ai", "human", "paused"] as AssigneeTypeValue[]).map((a) => (
                <AssigneeButton key={a} slug={slug} conversationId={detail.id} assignee={a} current={detail.assigneeType} />
              ))}
            </div>
          </PanelSection>
        )}

        {canWrite && (
          <PanelSection title="Status">
            <div className="flex flex-wrap gap-1.5">
              {(["open", "pending", "resolved", "archived"] as ConversationStatusValue[]).map((s) => (
                <StatusButton key={s} slug={slug} conversationId={detail.id} status={s} current={detail.status} />
              ))}
            </div>
          </PanelSection>
        )}

        {canManageConsent && (
          <PanelSection title="Consentimento (opt-in)">
            <div className="flex flex-wrap gap-1.5">
              <ConsentButton slug={slug} conversationId={detail.id} value="opted_in" label="Opt-in" />
              <ConsentButton slug={slug} conversationId={detail.id} value="opted_out" label="Opt-out" />
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              Status atual: {detail.optInStatus === "opted_out" ? "opt-out" : detail.optInStatus === "opted_in" ? "opt-in" : "—"}
            </p>
          </PanelSection>
        )}

        {detail.contact.kind === "customer" && (
          <PanelSection title="Cliente">
            <Link href={`/t/${slug}/customers/${detail.contact.id}`} className="underline">
              Ver ficha do cliente
            </Link>
          </PanelSection>
        )}
      </CardContent>
    </Card>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs uppercase text-muted-foreground">{title}</Label>
      {children}
    </div>
  );
}

function AssigneeButton({
  slug,
  conversationId,
  assignee,
  current,
}: {
  slug: string;
  conversationId: string;
  assignee: AssigneeTypeValue;
  current: AssigneeTypeValue;
}) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(
    setAssigneeAction.bind(null, slug),
    undefined,
  );
  useEffect(() => notify(state, "Atendimento atualizado."), [state]);
  return (
    <form action={formAction}>
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="assigneeType" value={assignee} />
      <Button type="submit" size="sm" variant={current === assignee ? "default" : "outline"} disabled={pending}>
        {ASSIGNEE_TYPE_LABELS[assignee]}
      </Button>
    </form>
  );
}

function StatusButton({
  slug,
  conversationId,
  status,
  current,
}: {
  slug: string;
  conversationId: string;
  status: ConversationStatusValue;
  current: ConversationStatusValue;
}) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(
    setStatusAction.bind(null, slug),
    undefined,
  );
  useEffect(() => notify(state, "Status atualizado."), [state]);
  return (
    <form action={formAction}>
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={current === status ? "default" : "outline"} disabled={pending}>
        {CONVERSATION_STATUS_LABELS[status]}
      </Button>
    </form>
  );
}

function ConsentButton({
  slug,
  conversationId,
  value,
  label,
}: {
  slug: string;
  conversationId: string;
  value: "opted_in" | "opted_out";
  label: string;
}) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(
    setConsentAction.bind(null, slug),
    undefined,
  );
  useEffect(() => notify(state, "Consentimento atualizado."), [state]);
  return (
    <form action={formAction}>
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="optInStatus" value={value} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {label}
      </Button>
    </form>
  );
}

function relativeDay(date: Date): string {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay ? timeFmt.format(date) : dayFmt.format(date);
}
