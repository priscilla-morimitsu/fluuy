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
import {
  SERVICE_DELIVERY_MODE_LABELS,
  WEEKDAY_LABELS,
  type ServiceDeliveryMode,
} from "@/lib/validations/service";

import {
  deleteServiceAvailabilityRuleAction,
  setServiceAvailabilityRuleStatusAction,
  type ServiceActionResult,
} from "../actions";
import type { AvailabilityRuleRow } from "../data";
import AvailabilityRuleForm, { type AvailabilityRuleInitial } from "./availability-rule-form";

function notifyResult(res: ServiceActionResult, okMsg: string) {
  if (res && "error" in res) toast.error(res.error);
  else if (res && "ok" in res) toast.success(okMsg);
}

function toInitial(r: AvailabilityRuleRow): AvailabilityRuleInitial {
  return {
    id: r.id,
    deliveryMode: r.deliveryMode,
    weekday: r.weekday,
    startTime: r.startTime,
    endTime: r.endTime,
    professionalId: r.professionalId,
    locationId: r.locationId,
    slotDurationMinutes: r.slotDurationMinutes,
    bufferBeforeMinutes: r.bufferBeforeMinutes,
    bufferAfterMinutes: r.bufferAfterMinutes,
    status: r.status,
  };
}

export default function AvailabilityManager({
  slug,
  serviceId,
  serviceDeliveryModes,
  rules,
  professionals,
  locations,
  canWrite,
}: {
  slug: string;
  serviceId: string;
  serviceDeliveryModes: ServiceDeliveryMode[];
  rules: AvailabilityRuleRow[];
  professionals: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AvailabilityRuleInitial | null>(null);
  const [deleting, setDeleting] = useState<AvailabilityRuleRow | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Disponibilidade</h3>
          <p className="text-sm text-muted-foreground">
            Janelas de atendimento por modalidade, dia e horário.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)} disabled={serviceDeliveryModes.length === 0}>
            <Plus /> Nova regra
          </Button>
        )}
      </div>

      {rules.length === 0 ? (
        <div className="glass flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-10 text-center">
          <p className="font-medium">Nenhuma regra de disponibilidade</p>
          <p className="text-sm text-muted-foreground">
            {canWrite ? "Adicione janelas para habilitar agendamentos." : "Sem janelas configuradas."}
          </p>
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-xl border border-(--glass-border)">
          <table className="w-full text-sm">
            <thead className="border-b border-(--glass-border) text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Dia</th>
                <th className="px-3 py-2 font-medium">Horário</th>
                <th className="px-3 py-2 font-medium">Modalidade</th>
                <th className="px-3 py-2 font-medium">Profissional</th>
                <th className="px-3 py-2 font-medium">Local</th>
                <th className="px-3 py-2 font-medium">Slot</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-(--glass-border) last:border-0">
                  <td className="px-3 py-2 font-medium">{WEEKDAY_LABELS[r.weekday]}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {r.startTime}–{r.endTime}
                  </td>
                  <td className="px-3 py-2">{SERVICE_DELIVERY_MODE_LABELS[r.deliveryMode]}</td>
                  <td className="px-3 py-2">
                    {r.professional?.name ?? <span className="text-muted-foreground">Qualquer</span>}
                  </td>
                  <td className="px-3 py-2">
                    {r.location?.name ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {r.slotDurationMinutes ? `${r.slotDurationMinutes} min` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={r.status === "active" ? "success" : "secondary"}>
                      {r.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </td>
                  {canWrite && (
                    <td className="px-3 py-2 text-right">
                      <RowActionsMenu>
                        <DropdownMenuItem onClick={() => setEditing(toInitial(r))}>Editar</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () =>
                            notifyResult(
                              await setServiceAvailabilityRuleStatusAction(
                                slug,
                                serviceId,
                                r.id,
                                r.status === "active" ? "inactive" : "active",
                              ),
                              "Status atualizado.",
                            )
                          }
                        >
                          {r.status === "active" ? "Inativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(r)}>
                          Excluir
                        </DropdownMenuItem>
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
            title="Nova regra de disponibilidade"
            description="Defina uma janela de atendimento."
            hideFooter
            contentScrolls={false}
          >
            <AvailabilityRuleForm
              slug={slug}
              serviceId={serviceId}
              serviceDeliveryModes={serviceDeliveryModes}
              professionals={professionals}
              locations={locations}
              onCancel={() => setCreating(false)}
              onSuccess={() => {
                setCreating(false);
                toast.success("Regra adicionada.");
              }}
            />
          </FormDrawer>

          <FormDrawer
            open={editing !== null}
            onOpenChange={(open) => !open && setEditing(null)}
            title="Editar regra"
            hideFooter
            contentScrolls={false}
          >
            {editing && (
              <AvailabilityRuleForm
                slug={slug}
                serviceId={serviceId}
                serviceDeliveryModes={serviceDeliveryModes}
                professionals={professionals}
                locations={locations}
                initial={editing}
                onCancel={() => setEditing(null)}
                onSuccess={() => {
                  setEditing(null);
                  toast.success("Regra atualizada.");
                }}
              />
            )}
          </FormDrawer>

          <ConfirmActionDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            title="Excluir regra"
            description={
              deleting
                ? `Excluir a janela de ${WEEKDAY_LABELS[deleting.weekday]} (${deleting.startTime}–${deleting.endTime})? Esta ação não pode ser desfeita.`
                : ""
            }
            destructive
            confirmLabel="Excluir"
            onConfirm={async () => {
              if (!deleting) return;
              notifyResult(await deleteServiceAvailabilityRuleAction(slug, serviceId, deleting.id), "Regra excluída.");
            }}
          />
        </>
      )}
    </section>
  );
}
