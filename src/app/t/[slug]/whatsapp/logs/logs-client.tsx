"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Fragment, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/crud/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminActionResult } from "@/lib/admin/action-result";
import type { WebhookLogFilters, WebhookLogView } from "@/lib/messaging/webhook-logs";
import { WEBHOOK_PROCESSING_STATUSES } from "@/lib/validations/whatsapp";

import { purgeLogsAction, setRetentionAction } from "./actions";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  processed: "success",
  received: "warning",
  duplicate: "secondary",
  ignored: "secondary",
  failed: "destructive",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function LogsClient({
  slug,
  logs,
  eventTypes,
  retentionDays,
  filters,
}: {
  slug: string;
  logs: WebhookLogView[];
  eventTypes: string[];
  retentionDays: number;
  filters: WebhookLogFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<string | null>(null);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Logs de webhooks</h2>
        <p className="text-sm text-muted-foreground">
          Eventos recebidos da Pilot Status. Os telefones são mascarados conforme a política de privacidade.
        </p>
      </div>

      <RetentionCard slug={slug} retentionDays={retentionDays} />

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por messageId / correlationId"
          defaultValue={filters.search ?? ""}
          className="max-w-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("search", (e.target as HTMLInputElement).value || null);
          }}
        />
        <select
          value={filters.eventType ?? ""}
          onChange={(e) => setParam("event", e.target.value || null)}
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
        >
          <option value="">Todos os eventos</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={filters.processingStatus ?? ""}
          onChange={(e) => setParam("status", e.target.value || null)}
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
        >
          <option value="">Todos os status</option>
          {WEBHOOK_PROCESSING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {logs.length === 0 ? (
        <EmptyState title="Nenhum log" description="Os eventos recebidos da Pilot Status aparecem aqui." />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recebido</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>messageId</TableHead>
                <TableHead className="w-20 text-right">Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <TableRow>
                    <TableCell className="whitespace-nowrap text-xs">{dateFmt.format(log.receivedAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{log.eventType}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[log.processingStatus] ?? "secondary"}>
                        {log.processingStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate font-mono text-xs">{log.messageId ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        {expanded === log.id ? "Ocultar" : "Ver"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded === log.id && (
                    <TableRow key={`${log.id}-payload`}>
                      <TableCell colSpan={5}>
                        {log.errorMessage && <p className="mb-2 text-xs text-destructive">{log.errorMessage}</p>}
                        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                          {JSON.stringify(log.maskedPayload, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function RetentionCard({ slug, retentionDays }: { slug: string; retentionDays: number }) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(
    setRetentionAction.bind(null, slug),
    undefined,
  );
  useEffect(() => {
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else if ("ok" in state) toast.success("Retenção atualizada.");
  }, [state]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Retenção de dados</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="retention">Dias de retenção dos logs</Label>
            <Input
              id="retention"
              name="retentionDays"
              type="number"
              min={0}
              max={3650}
              defaultValue={retentionDays}
              className="w-32"
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            Salvar
          </Button>
          <PurgeButton slug={slug} />
        </form>
        <p className="pt-2 text-xs text-muted-foreground">
          Logs anteriores ao período são removidos pela limpeza. Use 0 para desativar a limpeza automática.
        </p>
      </CardContent>
    </Card>
  );
}

function PurgeButton({ slug }: { slug: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const res = await purgeLogsAction(slug);
        if (res && "error" in res) toast.error(res.error);
        else toast.success("Limpeza executada.");
        setPending(false);
      }}
    >
      Limpar agora
    </Button>
  );
}
