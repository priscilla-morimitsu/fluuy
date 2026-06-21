import { z } from "zod";

export const APPOINTMENT_RESPONSIBLE_TYPES = ["professional", "tenant"] as const;
export const APPOINTMENT_MODALITIES = ["at_location", "at_home", "online"] as const;
export const APPOINTMENT_STATUSES = [
  "requested",
  "pending_confirmation",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
] as const;
export const APPOINTMENT_SOURCES = ["manual", "whatsapp", "order", "ai", "api", "other"] as const;
export const APPOINTMENT_REMINDER_CHANNELS = ["whatsapp", "email", "sms", "internal"] as const;
export const APPOINTMENT_REMINDER_STATUSES = ["pending", "sent", "failed", "cancelled"] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES, { message: "Status inválido." });
export const appointmentModalitySchema = z.enum(APPOINTMENT_MODALITIES, { message: "Modalidade inválida." });
export const appointmentResponsibleTypeSchema = z.enum(APPOINTMENT_RESPONSIBLE_TYPES, { message: "Responsável inválido." });
export const appointmentSourceSchema = z.enum(APPOINTMENT_SOURCES, { message: "Origem inválida." });
export const appointmentReminderChannelSchema = z.enum(APPOINTMENT_REMINDER_CHANNELS, { message: "Canal inválido." });

/** Statuses that occupy a time slot (used for conflict detection). */
export const BLOCKING_STATUSES: AppointmentStatus[] = ["pending_confirmation", "confirmed", "in_progress"];

export const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ["pending_confirmation", "confirmed", "cancelled"],
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled", "no_show", "rescheduled"],
  in_progress: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
  rescheduled: [],
};

export const FINAL_STATUSES: AppointmentStatus[] = ["completed", "cancelled", "no_show", "rescheduled"];

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const appointmentCreateSchema = z
  .object({
    customerId: z.string({ message: "Informe o cliente." }).uuid("Informe o cliente."),
    customerEntityId: z.string().uuid().nullish(),
    serviceId: z.string({ message: "Informe o serviço." }).uuid("Informe o serviço."),
    responsibleType: appointmentResponsibleTypeSchema,
    professionalId: z.string().uuid().nullish(),
    locationId: z.string().uuid().nullish(),
    orderId: z.string().uuid().nullish(),
    orderItemId: z.string().uuid().nullish(),
    modality: appointmentModalitySchema,
    status: appointmentStatusSchema.optional(),
    source: appointmentSourceSchema.optional(),
    startAt: z.coerce.date({ message: "Informe o início." }),
    endAt: z.coerce.date().nullish(),
    timezone: z.string().trim().min(1).max(64).optional(),
    customerNotes: optText(2000),
    internalNotes: optText(2000),
  })
  .superRefine((d, ctx) => {
    if (d.responsibleType === "professional" && !d.professionalId)
      ctx.addIssue({ code: "custom", message: "Selecione o profissional responsável.", path: ["professionalId"] });
    if (d.responsibleType === "tenant" && d.professionalId)
      ctx.addIssue({ code: "custom", message: "Responsável da equipe não usa profissional específico.", path: ["professionalId"] });
    if (d.modality === "at_location" && !d.locationId)
      ctx.addIssue({ code: "custom", message: "Atendimento no local exige um local.", path: ["locationId"] });
    if (d.modality !== "at_location" && d.locationId)
      ctx.addIssue({ code: "custom", message: "Domicílio e online não usam local físico.", path: ["locationId"] });
    if (d.endAt && d.endAt <= d.startAt)
      ctx.addIssue({ code: "custom", message: "O término deve ser depois do início.", path: ["endAt"] });
  });

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export const appointmentUpdateSchema = appointmentCreateSchema;

export const appointmentRescheduleSchema = z
  .object({
    startAt: z.coerce.date({ message: "Informe o novo início." }),
    endAt: z.coerce.date().nullish(),
    reason: optText(500),
  })
  .superRefine((d, ctx) => {
    if (d.endAt && d.endAt <= d.startAt)
      ctx.addIssue({ code: "custom", message: "O término deve ser depois do início.", path: ["endAt"] });
  });

export const appointmentReminderSchema = z.object({
  channel: appointmentReminderChannelSchema,
  scheduledFor: z.coerce.date({ message: "Informe a data do lembrete." }),
});

export const APPOINTMENT_SORTABLE = ["startAt", "status", "createdAt", "updatedAt"] as const;

export const appointmentFiltersSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  modality: z.string().optional(),
  responsibleType: z.string().optional(),
  professionalId: z.string().optional(),
  locationId: z.string().optional(),
  serviceId: z.string().optional(),
  customerId: z.string().optional(),
  source: z.string().optional(),
  createdByAgent: z.string().optional(),
  startFrom: z.string().optional(),
  startTo: z.string().optional(),
});
