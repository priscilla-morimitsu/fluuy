import { z } from "zod";

import { isValidCpfCnpj, onlyDigits } from "@/lib/masks";
import { isValidUf } from "@/lib/address/types";
import { slugify } from "@/lib/validations/product";

export { slugify };

// ── Enums (mirror prisma/schema.prisma) ────────────────────────────────────
export const CUSTOMER_STATUSES = ["active", "inactive", "blocked"] as const;
export const CUSTOMER_PERSON_TYPES = ["individual", "company"] as const;
export const CUSTOMER_SOURCES = [
  "whatsapp",
  "instagram",
  "website",
  "referral",
  "manual",
  "import",
  "other",
] as const;
export const CUSTOMER_ADDRESS_TYPES = [
  "main",
  "delivery",
  "billing",
  "home_service",
  "other",
] as const;
export const CUSTOMER_TAG_STATUSES = ["active", "inactive"] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
export type CustomerSource = (typeof CUSTOMER_SOURCES)[number];
export type CustomerPersonType = (typeof CUSTOMER_PERSON_TYPES)[number];
export type CustomerAddressType = (typeof CUSTOMER_ADDRESS_TYPES)[number];

// ── Display labels (pt-BR) ─────────────────────────────────────────────────
export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  blocked: "Bloqueado",
};

export const CUSTOMER_SOURCE_LABELS: Record<CustomerSource, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  website: "Site",
  referral: "Indicação",
  manual: "Manual",
  import: "Importação",
  other: "Outro",
};

export const CUSTOMER_PERSON_TYPE_LABELS: Record<CustomerPersonType, string> = {
  individual: "Pessoa física",
  company: "Pessoa jurídica",
};

export const CUSTOMER_ADDRESS_TYPE_LABELS: Record<CustomerAddressType, string> = {
  main: "Principal",
  delivery: "Entrega",
  billing: "Cobrança",
  home_service: "Atendimento em domicílio",
  other: "Outro",
};

// ── Enum schemas ───────────────────────────────────────────────────────────
export const customerStatusSchema = z.enum(CUSTOMER_STATUSES, { message: "Status inválido." });
export const customerSourceSchema = z.enum(CUSTOMER_SOURCES, { message: "Origem inválida." });
export const customerPersonTypeSchema = z.enum(CUSTOMER_PERSON_TYPES, {
  message: "Tipo de pessoa inválido.",
});
export const customerAddressTypeSchema = z.enum(CUSTOMER_ADDRESS_TYPES, {
  message: "Tipo de endereço inválido.",
});
export const customerTagStatusSchema = z.enum(CUSTOMER_TAG_STATUSES, {
  message: "Status inválido.",
});

// ── Reusable field helpers ─────────────────────────────────────────────────
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** Optional enum that arrives as "" when unset → null. */
const optEnum = <T extends readonly [string, ...string[]]>(values: T, msg: string) =>
  z
    .enum(values, { message: msg })
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? (v as T[number]) : null));

/** "" or a date string not in the future → keeps the string (parsed later). */
const optPastDate = (msg: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), msg)
    .refine((v) => v === "" || new Date(v) <= new Date(), "A data não pode ser futura.")
    .transform((v) => (v ? v : null));

// ── Customer ───────────────────────────────────────────────────────────────
export const customerCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome.").max(150),
    phone: z
      .string()
      .trim()
      .min(1, "Informe o telefone principal.")
      .refine((v) => onlyDigits(v).length >= 10, "Telefone inválido."),
    whatsapp: z
      .string()
      .trim()
      .optional()
      .transform((v) => v ?? "")
      .refine((v) => v === "" || onlyDigits(v).length >= 10, "WhatsApp inválido.")
      .transform((v) => (v ? v : null)),
    email: z
      .string()
      .trim()
      .optional()
      .transform((v) => v ?? "")
      .refine((v) => v === "" || z.string().email().safeParse(v).success, "E-mail inválido.")
      .transform((v) => (v ? v : null)),
    personType: optEnum(CUSTOMER_PERSON_TYPES, "Tipo de pessoa inválido."),
    document: z
      .string()
      .trim()
      .optional()
      .transform((v) => v ?? "")
      .refine((v) => v === "" || isValidCpfCnpj(v), "CPF/CNPJ inválido.")
      .transform((v) => (v ? v : null)),
    birthDate: optPastDate("Data de nascimento inválida."),
    status: customerStatusSchema,
    source: optEnum(CUSTOMER_SOURCES, "Origem inválida."),
    consentAcceptedAt: optPastDate("Data de consentimento inválida."),
    consentSource: optText(120),
    internalNotes: optText(2000),
  })
  .refine((d) => d.consentAcceptedAt == null || d.consentSource != null, {
    message: "Informe a origem do consentimento.",
    path: ["consentSource"],
  });

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export const customerUpdateSchema = customerCreateSchema;

// ── Address (per-customer) ─────────────────────────────────────────────────
// Permissive: addresses are optional. When a field is present we still normalize
// (zip → 8 digits, UF uppercase) and reject malformed values.
export const customerAddressSchema = z.object({
  type: customerAddressTypeSchema.default("main"),
  name: optText(120),
  zipCode: z
    .string()
    .optional()
    .transform((v) => onlyDigits(v ?? ""))
    .refine((v) => v === "" || v.length === 8, "CEP deve ter 8 dígitos.")
    .transform((v) => (v ? v : null)),
  street: optText(150),
  number: optText(20),
  complement: optText(100),
  neighborhood: optText(120),
  city: optText(120),
  state: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim().toUpperCase())
    .refine((v) => v === "" || isValidUf(v), "UF inválida.")
    .transform((v) => (v ? v : null)),
  country: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : "Brasil")),
  reference: optText(200),
  isDefault: z.boolean().default(false),
});

export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;

// ── Tags ─────────────────────────────────────────────────────────────────--
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const customerTagCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da tag.").max(60),
  color: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || HEX_COLOR.test(v), "Cor inválida.")
    .transform((v) => (v ? v : null)),
  description: optText(200),
});
export type CustomerTagCreateInput = z.infer<typeof customerTagCreateSchema>;

export const customerTagUpdateSchema = customerTagCreateSchema.extend({
  status: customerTagStatusSchema.default("active"),
});

// ── Filters & sorting ──────────────────────────────────────────────────────
export const customerFiltersSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  personType: z.string().optional(),
  tagId: z.string().optional(),
  hasAddress: z.string().optional(),
  hasConsent: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  updatedFrom: z.string().optional(),
  updatedTo: z.string().optional(),
});

export const CUSTOMER_SORTABLE = [
  "name",
  "status",
  "source",
  "createdAt",
  "updatedAt",
  "consentAcceptedAt",
] as const;

// ── Customer entities (generic, multi-niche) ───────────────────────────────
export const CUSTOMER_ENTITY_STATUSES = ["active", "inactive"] as const;
export type CustomerEntityStatus = (typeof CUSTOMER_ENTITY_STATUSES)[number];

export const customerEntityStatusSchema = z.enum(CUSTOMER_ENTITY_STATUSES, {
  message: "Status inválido.",
});

/** Suggested entity types per niche (the field stays open / custom-allowed). */
export const CUSTOMER_ENTITY_TYPE_SUGGESTIONS: { value: string; label: string }[] = [
  { value: "pet", label: "Pet" },
  { value: "dependent", label: "Dependente" },
  { value: "vehicle", label: "Veículo" },
  { value: "property_interest", label: "Imóvel de interesse" },
  { value: "student", label: "Aluno" },
  { value: "patient_profile", label: "Perfil de paciente" },
  { value: "other", label: "Outro" },
];

export const customerEntityCreateSchema = z.object({
  entityType: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Informe o tipo.")
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, "Tipo inválido (use letras minúsculas e _)."),
  name: z.string().trim().min(2, "Informe o nome.").max(150),
  status: customerEntityStatusSchema.default("active"),
});
export type CustomerEntityCreateInput = z.infer<typeof customerEntityCreateSchema>;

// ── Leads (tenant-scoped CRM lead → Customer) ──────────────────────────────
export const CUSTOMER_LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "discarded"] as const;
export type CustomerLeadStatus = (typeof CUSTOMER_LEAD_STATUSES)[number];

export const CUSTOMER_LEAD_STATUS_LABELS: Record<CustomerLeadStatus, string> = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  converted: "Convertido",
  discarded: "Descartado",
};

export const customerLeadStatusSchema = z.enum(CUSTOMER_LEAD_STATUSES, { message: "Status inválido." });

const optPhone = (msg: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || onlyDigits(v).length >= 10, msg)
    .transform((v) => (v ? v : null));

const optEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => v ?? "")
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "E-mail inválido.")
  .transform((v) => (v ? v : null));

export const customerLeadCreateSchema = z.object({
  name: optText(150),
  phone: optPhone("Telefone inválido."),
  whatsapp: optPhone("WhatsApp inválido."),
  email: optEmail,
  source: optEnum(CUSTOMER_SOURCES, "Origem inválida."),
  status: customerLeadStatusSchema.default("new"),
  message: optText(2000),
});
export type CustomerLeadCreateInput = z.infer<typeof customerLeadCreateSchema>;

/** Inbound WhatsApp identity → lead. Phone is the dedup key, so it's required. */
export const whatsappLeadInputSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Informe o telefone.")
    .refine((v) => onlyDigits(v).length >= 10, "Telefone inválido."),
  name: optText(150),
  whatsapp: optPhone("WhatsApp inválido."),
  email: optEmail,
  source: optEnum(CUSTOMER_SOURCES, "Origem inválida."),
  message: optText(2000),
});
export type WhatsappLeadInput = z.infer<typeof whatsappLeadInputSchema>;

/** Optional overrides applied to the Customer created from a lead. */
export const leadToCustomerConversionSchema = z.object({
  name: optText(150),
  status: customerStatusSchema.default("active"),
});
export type LeadToCustomerConversionInput = z.infer<typeof leadToCustomerConversionSchema>;

// ── Niche label helpers ────────────────────────────────────────────────────
/** Naive pt-BR pluralizer good enough for the niche customer labels. */
export function pluralizePt(label: string): string {
  const word = label.trim();
  if (!word) return word;
  const lower = word.toLowerCase();
  if (lower.endsWith("ão")) return `${word.slice(0, -2)}ões`;
  if (/[aeiou]$/.test(lower)) return `${word}s`;
  if (lower.endsWith("r") || lower.endsWith("z") || lower.endsWith("s")) return `${word}es`;
  if (lower.endsWith("m")) return `${word.slice(0, -1)}ns`;
  if (lower.endsWith("l")) return `${word.slice(0, -1)}is`;
  return `${word}s`;
}
