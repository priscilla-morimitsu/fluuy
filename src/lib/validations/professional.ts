import { z } from "zod";

export const PROFESSIONAL_STATUSES = ["active", "inactive"] as const;
export const PROFESSIONAL_SPECIALTY_STATUSES = ["active", "inactive"] as const;
export const PROFESSIONAL_LOCATION_STATUSES = ["active", "inactive"] as const;

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** Optional phone-like field: normalized presence check, custom message. */
const phoneField = (message: string) =>
  z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v == null || v.replace(/\D/g, "").length >= 8, { message });

const emailField = z
  .string()
  .trim()
  .max(150)
  .email("E-mail inválido.")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

const avatarField = z
  .string()
  .trim()
  .max(2048)
  .url("URL da foto inválida.")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

export const professionalStatusSchema = z.enum(PROFESSIONAL_STATUSES, { message: "Status inválido." });

export const professionalCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do profissional.").max(150),
  title: z.string().trim().min(2, "Informe o cargo ou função.").max(120),
  bio: optText(2000),
  avatarUrl: avatarField,
  phone: phoneField("Telefone inválido."),
  whatsapp: phoneField("WhatsApp inválido."),
  email: emailField,
  status: professionalStatusSchema,
  publicProfile: z.boolean(),
  internalNotes: optText(2000),
});

export type ProfessionalCreateInput = z.infer<typeof professionalCreateSchema>;
export const professionalUpdateSchema = professionalCreateSchema;

/** Name-only schema for the lightweight inline create (from the service form). */
export const professionalQuickCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do profissional.").max(150),
});

export const professionalSpecialtyCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da especialidade.").max(120),
  description: optText(500),
});
export type ProfessionalSpecialtyCreateInput = z.infer<typeof professionalSpecialtyCreateSchema>;

export const professionalSpecialtyUpdateSchema = professionalSpecialtyCreateSchema.extend({
  status: z.enum(PROFESSIONAL_SPECIALTY_STATUSES).default("active"),
});

export const PROFESSIONAL_SORTABLE = [
  "name",
  "title",
  "status",
  "publicProfile",
  "createdAt",
  "updatedAt",
] as const;

export const professionalFiltersSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  publicProfile: z.string().optional(),
  specialtyId: z.string().optional(),
  serviceId: z.string().optional(),
  locationId: z.string().optional(),
  hasUser: z.string().optional(),
  updatedFrom: z.string().optional(),
  updatedTo: z.string().optional(),
});
