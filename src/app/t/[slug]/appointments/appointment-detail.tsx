"use client";

import { ArrowLeft, CalendarClock, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/crud/confirm-action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawer, FormDrawerForm } from "@/components/ui/form-drawer";
import { actionError, actionOk } from "@/lib/admin/action-result";
import {
  ALLOWED_TRANSITIONS,
  APPOINTMENT_REMINDER_CHANNELS,
  type AppointmentStatus,
} from "@/lib/validations/appointment";
import type { TemplateField } from "@/lib/validations/template";

import {
  cancelAppointmentReminderAction,
  createAppointmentReminderAction,
  rescheduleAppointmentAction,
  updateAppointmentStatusAction,
  type AppointmentActionResult,
} from "./actions";
import AppointmentForm, { type AppointmentInitial, type AppointmentOptions } from "./appointment-form";
import type { AppointmentDetail } from "./data";
import {
  APPOINTMENT_STATUS_LABELS,
  MODALITY_LABELS,
  REMINDER_CHANNEL_LABELS,
  RESPONSIBLE_LABELS,
  SOURCE_LABELS,
  appointmentStatusVariant,
} from "./labels";

const dtFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

function notify(res: AppointmentActionResult, ok: string) {
  if (res && "error" in res) toast.error(res.error);
  else if (res && "ok" in res) toast.success(ok);
}

function toLocalInput(d: Date | null | undefined): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppointmentDetail({
  slug,
  appointment,
  options,
  templateFields,
  canWrite,
  canDelete,
}: {
  slug: string;
  appointment: AppointmentDetail;
  options: AppointmentOptions;
  templateFields: TemplateField[];
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reminderChannel, setReminderChannel] = useState("whatsapp");
  const [reminderWhen, setReminderWhen] = useState("");

  const transitions = ALLOWED_TRANSITIONS[appointment.status as AppointmentStatus] ?? [];
  const nonCancel = transitions.filter((t) => t !== "cancelled");

  const changeStatus = (target: string) =>
    startTransition(async () => notify(await updateAppointmentStatusAction(slug, appointment.id, target), "Status atualizado."));

  const addReminder = () =>
    startTransition(async () => {
      const res = await createAppointmentReminderAction(slug, appointment.id, reminderChannel, reminderWhen);
      notify(res, "Lembrete agendado.");
      if (res && "ok" in res) setReminderWhen("");
    });

  const initial: AppointmentInitial = {
    id: appointment.id,
    customerId: appointment.customerId,
    serviceId: appointment.serviceId,
    responsibleType: appointment.responsibleType,
    professionalId: appointment.professionalId,
    locationId: appointment.locationId,
    modality: appointment.modality,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    customerNotes: appointment.customerNotes,
    internalNotes: appointment.internalNotes,
    customData: appointment.customData,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href={`/t/${slug}/appointments`} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Agenda
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">{appointment.customer.name}</h2>
          <Badge variant={appointmentStatusVariant(appointment.status)}>{APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}</Badge>
          <Badge variant="secondary">{MODALITY_LABELS[appointment.modality]}</Badge>
          {appointment.createdByAgent && <Badge variant="secondary">IA</Badge>}
          {canWrite && (
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRescheduling(true)}>
                <CalendarClock /> Reagendar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil /> Editar
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {appointment.service.name} · {dtFmt.format(appointment.startAt)} → {dtFmt.format(appointment.endAt)} · {RESPONSIBLE_LABELS[appointment.responsibleType]}
          {appointment.professional ? ` (${appointment.professional.name})` : ""}
          {appointment.location ? ` · ${appointment.location.name}` : ""} · Origem: {SOURCE_LABELS[appointment.source] ?? appointment.source}
        </p>
      </div>

      {canWrite && (nonCancel.length > 0 || transitions.includes("cancelled")) && (
        <div className="glass flex flex-wrap items-center gap-2 rounded-xl border border-(--glass-border) p-3">
          <span className="mr-2 text-sm font-medium">Mudar status:</span>
          {nonCancel.map((t) => (
            <Button key={t} size="sm" variant="secondary" disabled={pending} onClick={() => changeStatus(t)}>
              {APPOINTMENT_STATUS_LABELS[t]}
            </Button>
          ))}
          {transitions.includes("cancelled") && (
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => setCancelOpen(true)}>
              Cancelar
            </Button>
          )}
        </div>
      )}

      {(appointment.customerNotes || appointment.internalNotes) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {appointment.customerNotes && (
            <div className="glass rounded-xl border border-(--glass-border) p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">Observações do cliente</p>
              <p className="mt-1 text-sm">{appointment.customerNotes}</p>
            </div>
          )}
          {appointment.internalNotes && (
            <div className="glass rounded-xl border border-(--glass-border) p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">Notas internas</p>
              <p className="mt-1 text-sm">{appointment.internalNotes}</p>
            </div>
          )}
        </div>
      )}

      {canWrite && (
        <section className="glass flex flex-col gap-3 rounded-xl border border-(--glass-border) p-4">
          <h3 className="text-sm font-semibold">Lembretes</h3>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Canal" className="w-44">
              <Combobox value={reminderChannel} onValueChange={setReminderChannel} options={APPOINTMENT_REMINDER_CHANNELS.map((c) => ({ value: c, label: REMINDER_CHANNEL_LABELS[c] }))} />
            </Field>
            <Field label="Quando" className="w-56">
              <AffixInput type="datetime-local" value={reminderWhen} onChange={(e) => setReminderWhen(e.target.value)} />
            </Field>
            <Button type="button" disabled={pending || !reminderWhen} onClick={addReminder}>
              <Plus /> Agendar lembrete
            </Button>
          </div>
          {appointment.reminders.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {appointment.reminders.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-muted-foreground">
                  <span>{REMINDER_CHANNEL_LABELS[r.channel] ?? r.channel} · {dtFmt.format(r.scheduledFor)} · {r.status}</span>
                  {r.status === "pending" && (
                    <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(async () => notify(await cancelAppointmentReminderAction(slug, appointment.id, r.id), "Lembrete cancelado."))}>
                      Cancelar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">Lembretes são preparados; o envio automático ainda não está ativo.</p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Histórico de status</h3>
        <ol className="flex flex-col gap-1 text-sm text-muted-foreground">
          {appointment.statusHistory.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-2">
              <span className="tabular-nums">{dtFmt.format(h.createdAt)}</span>
              <span>
                {h.fromStatus ? `${APPOINTMENT_STATUS_LABELS[h.fromStatus]} → ` : ""}
                <span className="font-medium text-foreground">{APPOINTMENT_STATUS_LABELS[h.toStatus] ?? h.toStatus}</span>
              </span>
              {h.changedByAgent && <Badge variant="secondary">IA</Badge>}
              {h.reason && <span>· {h.reason}</span>}
            </li>
          ))}
        </ol>
      </section>

      {canWrite && (
        <>
          <FormDrawer open={editing} onOpenChange={setEditing} title="Editar agendamento" hideFooter contentScrolls={false}>
            <AppointmentForm
              slug={slug}
              options={options}
              templateFields={templateFields}
              initial={initial}
              onCancel={() => setEditing(false)}
              onSuccess={() => {
                setEditing(false);
                toast.success("Agendamento atualizado.");
              }}
            />
          </FormDrawer>

          <FormDrawer open={rescheduling} onOpenChange={setRescheduling} title="Reagendar" description="Cria um novo horário e marca o atual como reagendado." hideFooter contentScrolls={false}>
            <RescheduleForm
              slug={slug}
              appointmentId={appointment.id}
              defaultStart={toLocalInput(appointment.startAt)}
              onCancel={() => setRescheduling(false)}
              onSuccess={() => {
                setRescheduling(false);
                toast.success("Agendamento reagendado.");
              }}
            />
          </FormDrawer>
        </>
      )}

      <ConfirmActionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar agendamento"
        description="O agendamento será cancelado e o horário liberado. Esta ação registra o histórico."
        destructive
        confirmLabel="Cancelar agendamento"
        onConfirm={async () => notify(await updateAppointmentStatusAction(slug, appointment.id, "cancelled"), "Agendamento cancelado.")}
      />

      {canDelete && appointment.status === "requested" && !appointment.orderId && (
        <p className="text-xs text-muted-foreground">Dica: agendamentos apenas solicitados e sem pedido podem ser excluídos pela listagem.</p>
      )}
    </div>
  );
}

function RescheduleForm({
  slug,
  appointmentId,
  defaultStart,
  onSuccess,
  onCancel,
}: {
  slug: string;
  appointmentId: string;
  defaultStart: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState<AppointmentActionResult, FormData>(
    rescheduleAppointmentAction.bind(null, slug, appointmentId),
    undefined,
  );
  useEffect(() => {
    if (actionOk(state)) onSuccess();
  }, [state, onSuccess]);

  return (
    <FormDrawerForm action={action} pending={pending} error={actionError(state)} onCancel={onCancel} submitLabel="Reagendar">
      <Field label="Novo início" htmlFor="startAt" required>
        <AffixInput id="startAt" name="startAt" type="datetime-local" required defaultValue={defaultStart} />
      </Field>
      <Field label="Novo término" htmlFor="endAt" hint="Calculado pela duração se vazio.">
        <AffixInput id="endAt" name="endAt" type="datetime-local" />
      </Field>
      <Field label="Motivo" htmlFor="reason" className="col-span-full">
        <AffixInput id="reason" name="reason" placeholder="Opcional" />
      </Field>
    </FormDrawerForm>
  );
}
