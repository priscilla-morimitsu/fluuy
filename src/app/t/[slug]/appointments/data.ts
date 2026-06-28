import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  APPOINTMENT_SORTABLE,
  appointmentModalitySchema,
  appointmentResponsibleTypeSchema,
  appointmentSourceSchema,
  appointmentStatusSchema,
} from "@/lib/validations/appointment";
import {
  templateFieldSchema,
  templateLayoutSchema,
  type TemplateField,
  type TemplateLayout,
} from "@/lib/validations/template";

const PAGE_SIZES = [10, 20, 50, 100, 200];
const SORTABLE = new Set<string>(APPOINTMENT_SORTABLE);

export type AppointmentListParams = {
  q?: string;
  status?: string;
  modality?: string;
  responsibleType?: string;
  professionalId?: string;
  locationId?: string;
  serviceId?: string;
  customerId?: string;
  source?: string;
  createdByAgent?: string;
  startFrom?: string;
  startTo?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

export async function appointmentTemplateFields(
  nicheId: string,
): Promise<{ fields: TemplateField[]; layout?: TemplateLayout }> {
  const template = await prisma.template.findFirst({
    where: { nicheId, entityType: "appointment", status: "active" },
    orderBy: { version: "desc" },
    select: { fields: true, config: true },
  });
  const parsed = templateFieldSchema.array().safeParse(template?.fields ?? []);
  const layout = templateLayoutSchema.safeParse((template?.config as { layout?: unknown } | null)?.layout);
  return {
    fields: parsed.success ? parsed.data : [],
    layout: layout.success ? layout.data : undefined,
  };
}

export async function listAppointments(tenantId: string, params: AppointmentListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 50) ? (params.pageSize ?? 50) : 50;

  const where: Prisma.AppointmentWhereInput = { tenantId };
  if (params.q) {
    where.OR = [
      { customer: { name: { contains: params.q, mode: "insensitive" } } },
      { service: { name: { contains: params.q, mode: "insensitive" } } },
    ];
  }
  const status = appointmentStatusSchema.safeParse(params.status);
  if (status.success) where.status = status.data;
  const modality = appointmentModalitySchema.safeParse(params.modality);
  if (modality.success) where.modality = modality.data;
  const responsible = appointmentResponsibleTypeSchema.safeParse(params.responsibleType);
  if (responsible.success) where.responsibleType = responsible.data;
  const source = appointmentSourceSchema.safeParse(params.source);
  if (source.success) where.source = source.data;
  if (params.professionalId) where.professionalId = params.professionalId;
  if (params.locationId) where.locationId = params.locationId;
  if (params.serviceId) where.serviceId = params.serviceId;
  if (params.customerId) where.customerId = params.customerId;
  if (params.createdByAgent === "true") where.createdByAgent = true;
  if (params.createdByAgent === "false") where.createdByAgent = false;

  const startAt: Prisma.DateTimeFilter = {};
  if (params.startFrom) {
    const d = new Date(params.startFrom);
    if (!Number.isNaN(d.getTime())) startAt.gte = d;
  }
  if (params.startTo) {
    const d = new Date(params.startTo);
    if (!Number.isNaN(d.getTime())) startAt.lte = d;
  }
  if (startAt.gte !== undefined || startAt.lte !== undefined) where.startAt = startAt;

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.AppointmentOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { startAt: "asc" };

  const select = {
    id: true,
    startAt: true,
    endAt: true,
    status: true,
    modality: true,
    responsibleType: true,
    professionalId: true,
    locationId: true,
    source: true,
    createdByAgent: true,
    customer: { select: { id: true, name: true, phone: true } },
    service: { select: { id: true, name: true } },
  } satisfies Prisma.AppointmentSelect;

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.appointment.findMany({ where, orderBy, select, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.appointment.count({ where }),
    prisma.appointment.count({ where: { tenantId } }),
  ]);

  return { rows, filtered, total, page, pageSize };
}

export type AppointmentListRow = Awaited<ReturnType<typeof listAppointments>>["rows"][number];

export async function getAppointment(tenantId: string, appointmentId: string) {
  const a = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId }, // tenant-scoped
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      service: { select: { id: true, name: true, estimatedDurationMinutes: true } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      reminders: { orderBy: { scheduledFor: "asc" } },
    },
  });
  if (!a) return null;

  // professional/location are plain columns — resolve names with light lookups.
  const [professional, location] = await Promise.all([
    a.professionalId
      ? prisma.professional.findFirst({ where: { id: a.professionalId, tenantId }, select: { id: true, name: true } })
      : Promise.resolve(null),
    a.locationId
      ? prisma.location.findFirst({ where: { id: a.locationId, tenantId }, select: { id: true, name: true } })
      : Promise.resolve(null),
  ]);

  return {
    id: a.id,
    customerId: a.customerId,
    customer: a.customer,
    customerEntityId: a.customerEntityId,
    serviceId: a.serviceId,
    service: a.service,
    responsibleType: a.responsibleType,
    professionalId: a.professionalId,
    professional,
    locationId: a.locationId,
    location,
    orderId: a.orderId,
    orderItemId: a.orderItemId,
    modality: a.modality,
    status: a.status,
    source: a.source,
    startAt: a.startAt,
    endAt: a.endAt,
    timezone: a.timezone,
    customerNotes: a.customerNotes,
    internalNotes: a.internalNotes,
    rescheduledFromId: a.rescheduledFromId,
    customData: (a.customData as Record<string, unknown>) ?? {},
    createdByAgent: a.createdByAgent,
    confirmedAt: a.confirmedAt,
    cancelledAt: a.cancelledAt,
    completedAt: a.completedAt,
    noShowAt: a.noShowAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    statusHistory: a.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedByAgent: h.changedByAgent,
      reason: h.reason,
      createdAt: h.createdAt,
    })),
    reminders: a.reminders.map((r) => ({
      id: r.id,
      channel: r.channel,
      scheduledFor: r.scheduledFor,
      status: r.status,
      sentAt: r.sentAt,
    })),
  };
}

export type AppointmentDetail = NonNullable<Awaited<ReturnType<typeof getAppointment>>>;

/** Lookup lists for the appointment form (all tenant-scoped). */
export async function listAppointmentOptions(tenantId: string) {
  const [customers, services, professionals, locations] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId, status: "active" }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true, phone: true } }),
    prisma.service.findMany({ where: { tenantId, status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true, estimatedDurationMinutes: true } }),
    prisma.professional.findMany({ where: { tenantId, status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.location.findMany({ where: { tenantId, status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { customers, services, professionals, locations };
}
