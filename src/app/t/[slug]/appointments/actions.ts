"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireUser, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import {
  appointmentCreateSchema,
  appointmentReminderSchema,
  appointmentRescheduleSchema,
  appointmentStatusSchema,
  BLOCKING_STATUSES,
  canTransition,
  FINAL_STATUSES,
  type AppointmentStatus,
} from "@/lib/validations/appointment";
import { validateCustomData, type TemplateField } from "@/lib/validations/template";

import { appointmentTemplateFields, getAppointment, type AppointmentDetail } from "./data";

export type AppointmentActionResult = AdminActionResult;
export type AppointmentDetailResult = { ok: true; appointment: AppointmentDetail } | { error: string };

const WRITE_ROLES = ["tenant_owner", "tenant_manager", "tenant_operator"] as const;
const SENSITIVE_ROLES = ["tenant_owner", "tenant_manager"] as const;
const FEATURE = "appointment_request";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  console.error("[appointments] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

function s(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v !== "" ? v : undefined;
}

function parseForm(formData: FormData) {
  return {
    customerId: s(formData, "customerId"),
    customerEntityId: s(formData, "customerEntityId"),
    serviceId: s(formData, "serviceId"),
    responsibleType: s(formData, "responsibleType"),
    professionalId: s(formData, "professionalId"),
    locationId: s(formData, "locationId"),
    orderId: s(formData, "orderId"),
    orderItemId: s(formData, "orderItemId"),
    modality: s(formData, "modality"),
    status: s(formData, "status"),
    source: s(formData, "source"),
    startAt: s(formData, "startAt"),
    endAt: s(formData, "endAt"),
    timezone: s(formData, "timezone"),
    customerNotes: formData.get("customerNotes") ?? "",
    internalNotes: formData.get("internalNotes") ?? "",
  };
}

function readCustomData(fields: TemplateField[], formData: FormData): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(`custom_${field.key}`);
    if (field.type === "boolean") data[field.key] = raw === "on" || raw === "true";
    else if (field.type === "number") {
      if (raw !== null && raw !== "") data[field.key] = Number(raw);
    } else if (raw !== null && raw !== "") data[field.key] = String(raw);
  }
  return data;
}

async function exists(model: { findFirst: (args: { where: object; select: { id: true } }) => Promise<{ id: string } | null> }, where: object): Promise<boolean> {
  return Boolean(await model.findFirst({ where, select: { id: true } }));
}

/** Detect a clashing appointment for the same professional or location. */
async function hasConflict(
  tenantId: string,
  args: { startAt: Date; endAt: Date; responsibleType: string; professionalId?: string | null; locationId?: string | null; excludeId?: string },
): Promise<boolean> {
  const or: Prisma.AppointmentWhereInput[] = [];
  if (args.responsibleType === "professional" && args.professionalId) or.push({ professionalId: args.professionalId });
  if (args.locationId) or.push({ locationId: args.locationId });
  if (or.length === 0) return false;

  const clash = await prisma.appointment.findFirst({
    where: {
      tenantId,
      status: { in: BLOCKING_STATUSES },
      startAt: { lt: args.endAt },
      endAt: { gt: args.startAt },
      OR: or,
      ...(args.excludeId ? { NOT: { id: args.excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(clash);
}

/** Validate every referenced id belongs to the tenant; returns the service duration. */
async function validateRefs(
  tenantId: string,
  d: { customerId: string; serviceId: string; customerEntityId?: string | null; professionalId?: string | null; locationId?: string | null; orderId?: string | null; orderItemId?: string | null },
): Promise<{ error: string } | { durationMinutes: number | null }> {
  const service = await prisma.service.findFirst({ where: { id: d.serviceId, tenantId }, select: { id: true, estimatedDurationMinutes: true } });
  if (!service) return { error: "Serviço inválido." };
  if (!(await exists(prisma.customer, { id: d.customerId, tenantId }))) return { error: "Cliente inválido." };
  if (d.customerEntityId && !(await exists(prisma.customerEntity, { id: d.customerEntityId, tenantId, customerId: d.customerId }))) return { error: "Item do cliente inválido." };
  if (d.professionalId && !(await exists(prisma.professional, { id: d.professionalId, tenantId }))) return { error: "Profissional inválido." };
  if (d.locationId && !(await exists(prisma.location, { id: d.locationId, tenantId }))) return { error: "Local inválido." };
  if (d.orderId && !(await exists(prisma.order, { id: d.orderId, tenantId }))) return { error: "Pedido inválido." };
  if (d.orderItemId && !(await exists(prisma.orderItem, { id: d.orderItemId, tenantId }))) return { error: "Item de pedido inválido." };
  return { durationMinutes: service.estimatedDurationMinutes };
}

function resolveEndAt(startAt: Date, endAt: Date | null | undefined, durationMinutes: number | null): Date {
  if (endAt) return endAt;
  return new Date(startAt.getTime() + (durationMinutes ?? 60) * 60_000);
}

export async function getAppointmentAction(slug: string, id: string): Promise<AppointmentDetailResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const appointment = await getAppointment(tenant.id, id);
    if (!appointment) return { error: "Agendamento não encontrado." };
    return { ok: true, appointment };
  } catch (err) {
    return fail(err);
  }
}

export async function createAppointmentAction(
  slug: string,
  _prev: AppointmentActionResult,
  formData: FormData,
): Promise<AppointmentActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const user = await requireUser();

    const parsed = appointmentCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    const refs = await validateRefs(tenant.id, d);
    if ("error" in refs) return refs;
    const endAt = resolveEndAt(d.startAt, d.endAt, refs.durationMinutes);

    if (await hasConflict(tenant.id, { startAt: d.startAt, endAt, responsibleType: d.responsibleType, professionalId: d.professionalId, locationId: d.locationId })) {
      return { error: "Já existe um agendamento nesse horário para o profissional ou local." };
    }

    const fields = await appointmentTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const status: AppointmentStatus = d.status ?? "requested";

    await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        customerId: d.customerId,
        customerEntityId: d.customerEntityId ?? null,
        serviceId: d.serviceId,
        responsibleType: d.responsibleType,
        professionalId: d.responsibleType === "professional" ? (d.professionalId ?? null) : null,
        locationId: d.modality === "at_location" ? (d.locationId ?? null) : null,
        orderId: d.orderId ?? null,
        orderItemId: d.orderItemId ?? null,
        modality: d.modality,
        status,
        source: d.source ?? "manual",
        startAt: d.startAt,
        endAt,
        timezone: d.timezone ?? "America/Sao_Paulo",
        customerNotes: d.customerNotes,
        internalNotes: d.internalNotes,
        customData: customData as Prisma.InputJsonValue,
        createdByUserId: user.id,
        confirmedAt: status === "confirmed" ? new Date() : null,
        statusHistory: { create: { tenantId: tenant.id, fromStatus: null, toStatus: status, changedByUserId: user.id } },
      },
    });

    revalidatePath(`/t/${slug}/appointments`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateAppointmentAction(
  slug: string,
  appointmentId: string,
  _prev: AppointmentActionResult,
  formData: FormData,
): Promise<AppointmentActionResult> {
  try {
    const { tenant, role } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.appointment.findFirst({ where: { id: appointmentId, tenantId: tenant.id }, select: { id: true, status: true } });
    if (!existing) return { error: "Agendamento não encontrado." };
    if (FINAL_STATUSES.includes(existing.status as AppointmentStatus) && role !== "tenant_owner") {
      return { error: "Agendamentos finalizados não podem ser editados." };
    }

    const parsed = appointmentCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    const refs = await validateRefs(tenant.id, d);
    if ("error" in refs) return refs;
    const endAt = resolveEndAt(d.startAt, d.endAt, refs.durationMinutes);

    if (await hasConflict(tenant.id, { startAt: d.startAt, endAt, responsibleType: d.responsibleType, professionalId: d.professionalId, locationId: d.locationId, excludeId: appointmentId })) {
      return { error: "Já existe um agendamento nesse horário para o profissional ou local." };
    }

    const fields = await appointmentTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    await prisma.appointment.updateMany({
      where: { id: appointmentId, tenantId: tenant.id },
      data: {
        customerId: d.customerId,
        customerEntityId: d.customerEntityId ?? null,
        serviceId: d.serviceId,
        responsibleType: d.responsibleType,
        professionalId: d.responsibleType === "professional" ? (d.professionalId ?? null) : null,
        locationId: d.modality === "at_location" ? (d.locationId ?? null) : null,
        modality: d.modality,
        startAt: d.startAt,
        endAt,
        timezone: d.timezone ?? "America/Sao_Paulo",
        customerNotes: d.customerNotes,
        internalNotes: d.internalNotes,
        customData: customData as Prisma.InputJsonValue,
      },
    });

    revalidatePath(`/t/${slug}/appointments`);
    revalidatePath(`/t/${slug}/appointments/${appointmentId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateAppointmentStatusAction(
  slug: string,
  appointmentId: string,
  toStatus: string,
  reason?: string,
): Promise<AppointmentActionResult> {
  try {
    const parsedStatus = appointmentStatusSchema.safeParse(toStatus);
    if (!parsedStatus.success) return { error: "Status inválido." };
    const target = parsedStatus.data;

    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const user = await requireUser();
    const appt = await prisma.appointment.findFirst({ where: { id: appointmentId, tenantId: tenant.id }, select: { id: true, status: true } });
    if (!appt) return { error: "Agendamento não encontrado." };

    const from = appt.status as AppointmentStatus;
    if (from === target) return { error: "O agendamento já está nesse status." };
    if (!canTransition(from, target)) return { error: "Transição de status não permitida." };

    const now = new Date();
    await prisma.$transaction([
      prisma.appointment.updateMany({
        where: { id: appointmentId, tenantId: tenant.id },
        data: {
          status: target,
          ...(target === "confirmed" ? { confirmedAt: now } : {}),
          ...(target === "cancelled" ? { cancelledAt: now } : {}),
          ...(target === "completed" ? { completedAt: now } : {}),
          ...(target === "no_show" ? { noShowAt: now } : {}),
        },
      }),
      prisma.appointmentStatusHistory.create({
        data: { tenantId: tenant.id, appointmentId, fromStatus: from, toStatus: target, changedByUserId: user.id, reason: reason || null },
      }),
    ]);

    revalidatePath(`/t/${slug}/appointments`);
    revalidatePath(`/t/${slug}/appointments/${appointmentId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function rescheduleAppointmentAction(
  slug: string,
  appointmentId: string,
  _prev: AppointmentActionResult,
  formData: FormData,
): Promise<AppointmentActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const user = await requireUser();

    const parsed = appointmentRescheduleSchema.safeParse({ startAt: s(formData, "startAt"), endAt: s(formData, "endAt"), reason: formData.get("reason") ?? "" });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

    const old = await prisma.appointment.findFirst({ where: { id: appointmentId, tenantId: tenant.id } });
    if (!old) return { error: "Agendamento não encontrado." };
    if (FINAL_STATUSES.includes(old.status as AppointmentStatus)) return { error: "Este agendamento não pode ser reagendado." };

    const service = await prisma.service.findFirst({ where: { id: old.serviceId, tenantId: tenant.id }, select: { estimatedDurationMinutes: true } });
    const endAt = resolveEndAt(parsed.data.startAt, parsed.data.endAt, service?.estimatedDurationMinutes ?? null);

    if (await hasConflict(tenant.id, { startAt: parsed.data.startAt, endAt, responsibleType: old.responsibleType, professionalId: old.professionalId, locationId: old.locationId })) {
      return { error: "Já existe um agendamento nesse horário para o profissional ou local." };
    }

    await prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          tenantId: tenant.id,
          customerId: old.customerId,
          customerEntityId: old.customerEntityId,
          serviceId: old.serviceId,
          responsibleType: old.responsibleType,
          professionalId: old.professionalId,
          locationId: old.locationId,
          orderId: old.orderId,
          orderItemId: old.orderItemId,
          modality: old.modality,
          status: "confirmed",
          source: old.source,
          startAt: parsed.data.startAt,
          endAt,
          timezone: old.timezone,
          ...(old.addressSnapshot != null ? { addressSnapshot: old.addressSnapshot as Prisma.InputJsonValue } : {}),
          customerNotes: old.customerNotes,
          internalNotes: old.internalNotes,
          rescheduledFromId: old.id,
          customData: old.customData as Prisma.InputJsonValue,
          createdByUserId: user.id,
          confirmedAt: new Date(),
          statusHistory: { create: { tenantId: tenant.id, fromStatus: null, toStatus: "confirmed", changedByUserId: user.id, reason: "Reagendado" } },
        },
      });
      await tx.appointment.updateMany({ where: { id: old.id, tenantId: tenant.id }, data: { status: "rescheduled" } });
      await tx.appointmentStatusHistory.create({
        data: { tenantId: tenant.id, appointmentId: old.id, fromStatus: old.status, toStatus: "rescheduled", changedByUserId: user.id, reason: parsed.data.reason || `Reagendado para ${created.id}` },
      });
    });

    revalidatePath(`/t/${slug}/appointments`);
    revalidatePath(`/t/${slug}/appointments/${appointmentId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteAppointmentAction(slug: string, appointmentId: string): Promise<AppointmentActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...SENSITIVE_ROLES], feature: FEATURE });
    const appt = await prisma.appointment.findFirst({ where: { id: appointmentId, tenantId: tenant.id }, select: { id: true, status: true, orderId: true } });
    if (!appt) return { error: "Agendamento não encontrado." };
    if (appt.orderId || (appt.status !== "requested" && appt.status !== "cancelled")) {
      return { error: "Este agendamento possui vínculos e não pode ser excluído. Você pode cancelá-lo." };
    }
    await prisma.appointment.deleteMany({ where: { id: appointmentId, tenantId: tenant.id } });
    revalidatePath(`/t/${slug}/appointments`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Bridge from Orders: create an Appointment for a service OrderItem that has a
 * scheduled start. Idempotent (skips if the item already has one). Defaults to a
 * tenant-responsible, online appointment the user can refine afterwards.
 */
export async function createAppointmentFromOrderItem(slug: string, orderItemId: string): Promise<AppointmentActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const item = await prisma.orderItem.findFirst({
      where: { id: orderItemId, tenantId: tenant.id, itemType: "service" },
      select: { id: true, serviceId: true, scheduledStartAt: true, scheduledEndAt: true, appointmentId: true, order: { select: { customerId: true } } },
    });
    if (!item || !item.serviceId || !item.scheduledStartAt) return { ok: true };
    if (item.appointmentId) return { ok: true };

    const service = await prisma.service.findFirst({ where: { id: item.serviceId, tenantId: tenant.id }, select: { estimatedDurationMinutes: true } });
    const endAt = resolveEndAt(item.scheduledStartAt, item.scheduledEndAt, service?.estimatedDurationMinutes ?? null);

    await prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          tenantId: tenant.id,
          customerId: item.order.customerId,
          serviceId: item.serviceId!,
          responsibleType: "tenant",
          modality: "online",
          status: "confirmed",
          source: "order",
          startAt: item.scheduledStartAt!,
          endAt,
          orderItemId: item.id,
          confirmedAt: new Date(),
          statusHistory: { create: { tenantId: tenant.id, fromStatus: null, toStatus: "confirmed", changedByAgent: false } },
        },
      });
      await tx.orderItem.updateMany({ where: { id: item.id, tenantId: tenant.id }, data: { appointmentId: created.id } });
    });

    revalidatePath(`/t/${slug}/appointments`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createAppointmentReminderAction(
  slug: string,
  appointmentId: string,
  channel: string,
  scheduledFor: string,
): Promise<AppointmentActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const appt = await prisma.appointment.findFirst({ where: { id: appointmentId, tenantId: tenant.id }, select: { id: true } });
    if (!appt) return { error: "Agendamento não encontrado." };
    const parsed = appointmentReminderSchema.safeParse({ channel, scheduledFor });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    await prisma.appointmentReminder.create({
      data: { tenantId: tenant.id, appointmentId, channel: parsed.data.channel, scheduledFor: parsed.data.scheduledFor },
    });
    revalidatePath(`/t/${slug}/appointments/${appointmentId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function cancelAppointmentReminderAction(slug: string, appointmentId: string, reminderId: string): Promise<AppointmentActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.appointmentReminder.updateMany({
      where: { id: reminderId, tenantId: tenant.id, appointmentId },
      data: { status: "cancelled" },
    });
    if (res.count === 0) return { error: "Lembrete não encontrado." };
    revalidatePath(`/t/${slug}/appointments/${appointmentId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
