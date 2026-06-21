import { z } from "zod";

/** Digits-only phone with optional leading +, 10–15 digits (E.164 range). */
const phoneField = z
  .string()
  .trim()
  .min(1, "Informe o número.")
  .transform((v) => v.replace(/[^\d+]/g, ""))
  .refine((v) => /^\+?\d{10,15}$/.test(v), "Número de WhatsApp inválido.");

export const LINK_MODES = ["single", "dual"] as const;
export type LinkMode = (typeof LINK_MODES)[number];

export const createWhatsappNumberSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(80, "Nome muito longo."),
  number: phoneField,
  linkMode: z.enum(LINK_MODES).default("dual"),
});
export type CreateWhatsappNumberInput = z.infer<typeof createWhatsappNumberSchema>;

export const remotePairingSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(80, "Nome muito longo."),
  number: phoneField,
  linkMode: z.enum(LINK_MODES).default("dual"),
  sendViaWhatsApp: z.boolean().default(false),
});
export type RemotePairingInputForm = z.infer<typeof remotePairingSchema>;

export const whatsappAccountIdSchema = z.object({
  accountId: z.string().uuid("Conta inválida."),
});

// ── Templates (MessageTemplateMapping) ───────────────────────────────────────
export const TEMPLATE_CATEGORIES = ["otp", "utility", "marketing", "unknown"] as const;
export type TemplateCategoryValue = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_MAPPING_STATUSES = ["draft", "approved", "rejected", "pending", "unknown"] as const;
export type TemplateMappingStatusValue = (typeof TEMPLATE_MAPPING_STATUSES)[number];

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategoryValue, string> = {
  otp: "OTP",
  utility: "Utilidade",
  marketing: "Marketing",
  unknown: "Indefinida",
};

export const TEMPLATE_MAPPING_STATUS_LABELS: Record<TemplateMappingStatusValue, string> = {
  draft: "Rascunho",
  approved: "Aprovado",
  rejected: "Rejeitado",
  pending: "Pendente",
  unknown: "Indefinido",
};

export const templateMappingSchema = z.object({
  providerTemplateId: z.string().trim().min(1, "Informe o ID do template.").max(160),
  name: z.string().trim().min(1, "Informe um nome.").max(120),
  category: z.enum(TEMPLATE_CATEGORIES).default("unknown"),
  language: z.string().trim().max(12).optional(),
  variables: z.array(z.string().trim().min(1)).default([]),
  status: z.enum(TEMPLATE_MAPPING_STATUSES).default("unknown"),
  isDefault: z.boolean().default(false),
});
export type TemplateMappingInput = z.infer<typeof templateMappingSchema>;

export const retentionDaysSchema = z.object({
  retentionDays: z.coerce.number().int().min(0, "Inválido.").max(3650, "Máximo de 3650 dias."),
});

// ── Logs filters ─────────────────────────────────────────────────────────────
export const WEBHOOK_PROCESSING_STATUSES = ["received", "processed", "failed", "ignored", "duplicate"] as const;

export const webhookLogFiltersSchema = z.object({
  eventType: z.string().trim().max(60).optional(),
  processingStatus: z.enum(WEBHOOK_PROCESSING_STATUSES).optional(),
  search: z.string().trim().max(160).optional(),
});
