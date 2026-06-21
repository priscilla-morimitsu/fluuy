"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/crud/confirm-action-dialog";
import { RowActionsMenu } from "@/components/crud/row-actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FormDrawer } from "@/components/ui/form-drawer";
import { CUSTOMER_ENTITY_TYPE_SUGGESTIONS } from "@/lib/validations/customer";
import type { TemplateField } from "@/lib/validations/template";

import {
  deleteCustomerEntityAction,
  setCustomerEntityStatusAction,
  type CustomerActionResult,
} from "../actions";
import type { CustomerEntityRow } from "../data";
import EntityForm, { type CustomerEntityInitial } from "./entity-form";

const TYPE_LABELS = new Map(CUSTOMER_ENTITY_TYPE_SUGGESTIONS.map((s) => [s.value, s.label]));
const typeLabel = (v: string) => TYPE_LABELS.get(v) ?? v;
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function notifyResult(res: CustomerActionResult, okMsg: string) {
  if (res && "error" in res) toast.error(res.error);
  else if (res && "ok" in res) toast.success(okMsg);
}

function toInitial(e: CustomerEntityRow): CustomerEntityInitial {
  return { id: e.id, entityType: e.entityType, name: e.name, status: e.status, customData: e.customData };
}

export default function EntityManager({
  slug,
  customerId,
  entityLabel,
  entities,
  templateFields,
  canWrite,
  canDelete,
}: {
  slug: string;
  customerId: string;
  entityLabel: string;
  entities: CustomerEntityRow[];
  templateFields: TemplateField[];
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomerEntityInitial | null>(null);
  const [deleting, setDeleting] = useState<CustomerEntityRow | null>(null);

  const label = entityLabel || "Registro";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{label}s relacionados</h3>
          <p className="text-sm text-muted-foreground">
            Pets, veículos, dependentes e outros registros vinculados ao cliente.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus /> Adicionar {label.toLowerCase()}
          </Button>
        )}
      </div>

      {entities.length === 0 ? (
        <div className="glass flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-10 text-center">
          <p className="font-medium">Nenhum {label.toLowerCase()} cadastrado</p>
          <p className="text-sm text-muted-foreground">
            {canWrite ? `Adicione o primeiro ${label.toLowerCase()} deste cliente.` : "Sem registros vinculados."}
          </p>
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-xl border border-(--glass-border)">
          <table className="w-full text-sm">
            <thead className="border-b border-(--glass-border) text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Atualizado em</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {entities.map((e) => (
                <tr key={e.id} className="border-b border-(--glass-border) last:border-0">
                  <td className="px-3 py-2 font-medium">{e.name}</td>
                  <td className="px-3 py-2">{typeLabel(e.entityType)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={e.status === "active" ? "success" : "secondary"}>
                      {e.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-zinc-500">{dateFmt.format(e.updatedAt)}</td>
                  {canWrite && (
                    <td className="px-3 py-2 text-right">
                      <RowActionsMenu>
                        <DropdownMenuItem onClick={() => setEditing(toInitial(e))}>Editar</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () =>
                            notifyResult(
                              await setCustomerEntityStatusAction(
                                slug,
                                customerId,
                                e.id,
                                e.status === "active" ? "inactive" : "active",
                              ),
                              "Status atualizado.",
                            )
                          }
                        >
                          {e.status === "active" ? "Inativar" : "Ativar"}
                        </DropdownMenuItem>
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(e)}>
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </RowActionsMenu>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canWrite && (
        <>
          <FormDrawer
            open={creating}
            onOpenChange={setCreating}
            title={`Adicionar ${label.toLowerCase()}`}
            description="Cadastre um registro relacionado ao cliente."
            hideFooter
            contentScrolls={false}
          >
            <EntityForm
              slug={slug}
              customerId={customerId}
              entityLabel={label}
              templateFields={templateFields}
              onCancel={() => setCreating(false)}
              onSuccess={() => {
                setCreating(false);
                toast.success(`${label} adicionado.`);
              }}
            />
          </FormDrawer>

          <FormDrawer
            open={editing !== null}
            onOpenChange={(open) => !open && setEditing(null)}
            title={`Editar ${label.toLowerCase()}`}
            hideFooter
            contentScrolls={false}
          >
            {editing && (
              <EntityForm
                slug={slug}
                customerId={customerId}
                entityLabel={label}
                templateFields={templateFields}
                initial={editing}
                onCancel={() => setEditing(null)}
                onSuccess={() => {
                  setEditing(null);
                  toast.success(`${label} atualizado.`);
                }}
              />
            )}
          </FormDrawer>

          {canDelete && (
            <ConfirmActionDialog
              open={deleting !== null}
              onOpenChange={(open) => !open && setDeleting(null)}
              title={`Excluir ${label.toLowerCase()}`}
              description={
                deleting
                  ? `Excluir "${deleting.name}"? Esta ação não pode ser desfeita.`
                  : ""
              }
              destructive
              confirmLabel="Excluir"
              onConfirm={async () => {
                if (!deleting) return;
                notifyResult(await deleteCustomerEntityAction(slug, customerId, deleting.id), `${label} excluído.`);
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
