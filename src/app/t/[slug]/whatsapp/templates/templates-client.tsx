"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/crud/confirm-action-dialog";
import { EmptyState } from "@/components/crud/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChipsInput } from "@/components/ui/chips-input";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminActionResult } from "@/lib/admin/action-result";
import type { TemplateMappingView } from "@/lib/messaging/templates";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_MAPPING_STATUS_LABELS,
  TEMPLATE_MAPPING_STATUSES,
  type TemplateCategoryValue,
  type TemplateMappingStatusValue,
} from "@/lib/validations/whatsapp";

import { createTemplateAction, deleteTemplateAction, updateTemplateAction } from "./actions";

export default function TemplatesClient({
  slug,
  templates,
  canManage,
}: {
  slug: string;
  templates: TemplateMappingView[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<TemplateMappingView | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<TemplateMappingView | null>(null);

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Templates de WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Vincule os templates aprovados na Pilot Status para uso no envio de mensagens.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Novo template
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="Nenhum template"
          description="Cadastre o ID de um template aprovado para começar a enviar mensagens."
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>ID do provedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Variáveis</TableHead>
                {canManage && <TableHead className="w-24 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.name}
                    {t.isDefault && (
                      <Badge variant="secondary" className="ml-2">
                        Padrão
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.providerTemplateId}</TableCell>
                  <TableCell>{TEMPLATE_CATEGORY_LABELS[t.category]}</TableCell>
                  <TableCell>{TEMPLATE_MAPPING_STATUS_LABELS[t.status]}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.variables.length ? t.variables.join(", ") : "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(t)} aria-label="Editar">
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(t)} aria-label="Excluir">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {canManage && (creating || editing) && (
        <TemplateDrawer
          slug={slug}
          template={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {canManage && deleting && (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          title="Excluir template"
          description={`Remover o vínculo do template "${deleting.name}"? Isso não exclui o template na Pilot Status.`}
          confirmLabel="Excluir"
          destructive
          onConfirm={async () => {
            const res = await deleteTemplateAction(slug, deleting.id);
            if (res && "error" in res) toast.error(res.error);
            else toast.success("Template removido.");
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function TemplateDrawer({
  slug,
  template,
  onClose,
}: {
  slug: string;
  template: TemplateMappingView | null;
  onClose: () => void;
}) {
  const action = template
    ? updateTemplateAction.bind(null, slug, template.id)
    : createTemplateAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(action, undefined);

  useEffect(() => {
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else if ("ok" in state) {
      toast.success(template ? "Template atualizado." : "Template criado.");
      onClose();
    }
  }, [state, template, onClose]);

  return (
    <FormDrawer
      open
      onOpenChange={(o) => !o && onClose()}
      title={template ? "Editar template" : "Novo template"}
      formId="template-form"
      loading={pending}
    >
      <form id="template-form" action={formAction} className="flex flex-col gap-4 p-5">
        <Field label="Nome" htmlFor="t-name">
          <Input id="t-name" name="name" defaultValue={template?.name} required />
        </Field>
        <Field label="ID do template (Pilot Status)" htmlFor="t-id">
          <Input id="t-id" name="providerTemplateId" defaultValue={template?.providerTemplateId} required />
        </Field>
        <Field label="Categoria" htmlFor="t-category">
          <select
            id="t-category"
            name="category"
            defaultValue={template?.category ?? "unknown"}
            className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
          >
            {TEMPLATE_CATEGORIES.map((c: TemplateCategoryValue) => (
              <option key={c} value={c}>
                {TEMPLATE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="t-status">
          <select
            id="t-status"
            name="status"
            defaultValue={template?.status ?? "unknown"}
            className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
          >
            {TEMPLATE_MAPPING_STATUSES.map((s: TemplateMappingStatusValue) => (
              <option key={s} value={s}>
                {TEMPLATE_MAPPING_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Idioma (opcional)" htmlFor="t-lang">
          <Input id="t-lang" name="language" defaultValue={template?.language ?? ""} placeholder="pt_BR" />
        </Field>
        <Field label="Variáveis do template" htmlFor="t-vars">
          <ChipsInput id="t-vars" name="variables" defaultValue={template?.variables ?? []} placeholder="ex.: name" />
        </Field>
        <div className="flex items-center justify-between">
          <Label htmlFor="t-default" className="font-normal">
            Template padrão para texto livre
          </Label>
          <Switch id="t-default" name="isDefault" defaultChecked={template?.isDefault} />
        </div>
      </form>
    </FormDrawer>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
