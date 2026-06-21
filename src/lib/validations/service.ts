import { z } from "zod";

import { slugify } from "@/lib/validations/product";

export { slugify };

export const SERVICE_STATUSES = ["draft", "active", "inactive"] as const;
export const SERVICE_DELIVERY_MODES = ["at_location", "at_home", "online"] as const;
export const SERVICE_CATEGORY_STATUSES = ["active", "inactive"] as const;

export type ServiceDeliveryMode = (typeof SERVICE_DELIVERY_MODES)[number];

export const SERVICE_DELIVERY_MODE_LABELS: Record<ServiceDeliveryMode, string> = {
  at_location: "Em local físico",
  at_home: "Em domicílio",
  online: "Online / remoto",
};

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** "1.234,56" / "1234.56" / number → Decimal-safe number, or null when empty. */
const decimalIn = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "number" ? v : Number(String(v))),
  z.number().finite().nonnegative().nullable()
);

/** Positive integer (minutes) or null when empty. */
const minutesIn = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "number" ? v : Number(String(v))),
  z.number().int("Duração inválida.").positive("Duração inválida.").nullable()
);

export const serviceStatusSchema = z.enum(SERVICE_STATUSES, { message: "Status inválido." });
export const serviceDeliveryModeSchema = z.enum(SERVICE_DELIVERY_MODES, {
  message: "Modalidade inválida.",
});

export const serviceCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do serviço.").max(150),
    description: optText(2000),
    categoryId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    basePrice: z.preprocess(
      (v) => (v === "" || v == null ? undefined : typeof v === "number" ? v : Number(String(v))),
      z.number({ message: "Informe o preço base." }).finite().nonnegative("Informe o preço base.")
    ),
    promotionalPrice: decimalIn,
    estimatedDurationMinutes: minutesIn,
    status: serviceStatusSchema,
    availableForBooking: z.boolean(),
    requiresScheduling: z.boolean(),
    deliveryModes: z
      .array(serviceDeliveryModeSchema)
      .min(1, "Selecione ao menos uma modalidade de atendimento."),
    onlineInstructions: optText(2000),
    homeServiceNotes: optText(2000),
    internalNotes: optText(2000),
  })
  .refine((d) => d.promotionalPrice == null || d.promotionalPrice <= d.basePrice, {
    message: "Preço promocional não pode ser maior que o preço base.",
    path: ["promotionalPrice"],
  })
  .refine((d) => !d.requiresScheduling || d.estimatedDurationMinutes != null, {
    message: "Informe a duração estimada para serviços que exigem agendamento.",
    path: ["estimatedDurationMinutes"],
  });

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export const serviceUpdateSchema = serviceCreateSchema;

export const serviceCategoryCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(120),
  description: optText(500),
});
export type ServiceCategoryCreateInput = z.infer<typeof serviceCategoryCreateSchema>;

export const serviceCategoryUpdateSchema = serviceCategoryCreateSchema.extend({
  status: z.enum(SERVICE_CATEGORY_STATUSES).default("active"),
});

export const SERVICE_SORTABLE = [
  "name",
  "basePrice",
  "promotionalPrice",
  "estimatedDurationMinutes",
  "status",
  "availableForBooking",
  "createdAt",
  "updatedAt",
] as const;

export const SERVICE_AVAILABILITY_RULE_STATUSES = ["active", "inactive"] as const;

/** 0 = Sunday … 6 = Saturday (JS getDay convention). */
export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const optInt = (min: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : typeof v === "number" ? v : Number(String(v))),
    z.number().int().min(min).nullable(),
  );

export const serviceAvailabilityRuleStatusSchema = z.enum(SERVICE_AVAILABILITY_RULE_STATUSES, {
  message: "Status inválido.",
});

export const serviceAvailabilityRuleSchema = z
  .object({
    deliveryMode: serviceDeliveryModeSchema,
    professionalId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    locationId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    weekday: z.preprocess(
      (v) => (v === "" || v == null ? undefined : typeof v === "number" ? v : Number(String(v))),
      z.number({ message: "Selecione o dia." }).int().min(0).max(6),
    ),
    startTime: z.string().regex(HHMM, "Horário inicial inválido (HH:mm)."),
    endTime: z.string().regex(HHMM, "Horário final inválido (HH:mm)."),
    slotDurationMinutes: optInt(1),
    bufferBeforeMinutes: z.preprocess(
      (v) => (v === "" || v == null ? 0 : typeof v === "number" ? v : Number(String(v))),
      z.number().int().min(0),
    ),
    bufferAfterMinutes: z.preprocess(
      (v) => (v === "" || v == null ? 0 : typeof v === "number" ? v : Number(String(v))),
      z.number().int().min(0),
    ),
    status: serviceAvailabilityRuleStatusSchema.default("active"),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "O horário final deve ser maior que o inicial.",
    path: ["endTime"],
  })
  .refine((d) => d.deliveryMode !== "at_location" || d.locationId != null, {
    message: "Atendimento presencial exige um local.",
    path: ["locationId"],
  })
  .refine((d) => d.deliveryMode === "at_location" || d.locationId == null, {
    message: "Domicílio e online não usam local físico.",
    path: ["locationId"],
  });

export type ServiceAvailabilityRuleInput = z.infer<typeof serviceAvailabilityRuleSchema>;

export const serviceFiltersSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
  availableForBooking: z.string().optional(),
  requiresScheduling: z.string().optional(),
  deliveryMode: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
});
