import { z } from "zod";

import { slugify } from "@/lib/validations/product";

export { slugify };

// ── Enums (mirror prisma/schema.prisma) ────────────────────────────────────
export const OFFER_PLAN_TYPES = ["recurring_plan", "prepaid_package", "combo"] as const;
export const OFFER_PLAN_STATUSES = ["draft", "active", "inactive"] as const;
export const OFFER_PLAN_BILLING_CYCLES = ["monthly", "quarterly", "semiannual", "yearly"] as const;
export const OFFER_PLAN_CATEGORY_STATUSES = ["active", "inactive"] as const;

export type OfferPlanType = (typeof OFFER_PLAN_TYPES)[number];
export type OfferPlanStatus = (typeof OFFER_PLAN_STATUSES)[number];
export type OfferPlanBillingCycle = (typeof OFFER_PLAN_BILLING_CYCLES)[number];

export const OFFER_PLAN_TYPE_LABELS: Record<OfferPlanType, string> = {
  recurring_plan: "Plano recorrente",
  prepaid_package: "Pacote pré-pago",
  combo: "Combo",
};

export const OFFER_PLAN_STATUS_LABELS: Record<OfferPlanStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  inactive: "Inativo",
};

export const OFFER_PLAN_BILLING_CYCLE_LABELS: Record<OfferPlanBillingCycle, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
};

// ── Enum schemas ───────────────────────────────────────────────────────────
export const offerPlanTypeSchema = z.enum(OFFER_PLAN_TYPES, { message: "Informe o tipo." });
export const offerPlanStatusSchema = z.enum(OFFER_PLAN_STATUSES, { message: "Status inválido." });
export const offerPlanBillingCycleSchema = z.enum(OFFER_PLAN_BILLING_CYCLES, {
  message: "Ciclo de cobrança inválido.",
});
export const offerPlanCategoryStatusSchema = z.enum(OFFER_PLAN_CATEGORY_STATUSES);

// ── Field helpers ──────────────────────────────────────────────────────────
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** Required, non-negative money. */
const priceIn = z.preprocess(
  (v) => (v === "" || v == null ? undefined : typeof v === "number" ? v : Number(String(v))),
  z.number({ message: "Informe o preço." }).finite().nonnegative("Informe o preço."),
);

/** Optional, non-negative money → null when empty. */
const optDecimal = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "number" ? v : Number(String(v))),
  z.number().finite().nonnegative().nullable(),
);

/** Optional positive integer → null when empty. */
const optPosInt = (msg: string) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : typeof v === "number" ? v : Number(String(v))),
    z.number().int(msg).positive(msg).nullable(),
  );

// ── Item schemas (parsed per row from the editor) ──────────────────────────
export const offerPlanServiceItemSchema = z.object({
  serviceId: z.string().uuid("Serviço inválido."),
  quantity: z.preprocess(
    (v) => (v === "" || v == null ? 1 : typeof v === "number" ? v : Number(String(v))),
    z.number().int("Quantidade inválida.").min(1, "Quantidade inválida."),
  ),
  usageLimit: optPosInt("Limite de uso inválido."),
  durationOverrideMinutes: optPosInt("Duração inválida."),
  priceOverride: optDecimal,
  included: z.boolean().default(true),
  sortOrder: z.preprocess(
    (v) => (v === "" || v == null ? 0 : typeof v === "number" ? v : Number(String(v))),
    z.number().int().min(0),
  ),
});
export type OfferPlanServiceItemInput = z.infer<typeof offerPlanServiceItemSchema>;

export const offerPlanProductItemSchema = z.object({
  productId: z.string().uuid("Produto inválido."),
  quantity: z.preprocess(
    (v) => (v === "" || v == null ? 1 : typeof v === "number" ? v : Number(String(v))),
    z.number().int("Quantidade inválida.").min(1, "Quantidade inválida."),
  ),
  usageLimit: optPosInt("Limite de uso inválido."),
  priceOverride: optDecimal,
  included: z.boolean().default(true),
  sortOrder: z.preprocess(
    (v) => (v === "" || v == null ? 0 : typeof v === "number" ? v : Number(String(v))),
    z.number().int().min(0),
  ),
});
export type OfferPlanProductItemInput = z.infer<typeof offerPlanProductItemSchema>;

// ── OfferPlan ──────────────────────────────────────────────────────────────
export const offerPlanCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome.").max(150),
    description: optText(2000),
    categoryId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    type: offerPlanTypeSchema,
    price: priceIn,
    promotionalPrice: optDecimal,
    billingCycle: offerPlanBillingCycleSchema
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? (v as OfferPlanBillingCycle) : null)),
    autoRenew: z.boolean(),
    expiresAfterDays: optPosInt("Validade inválida."),
    usageLimit: optPosInt("Limite de uso inválido."),
    allowScheduling: z.boolean(),
    status: offerPlanStatusSchema,
    availableForSale: z.boolean(),
    internalNotes: optText(2000),
  })
  .refine((d) => d.promotionalPrice == null || d.promotionalPrice <= d.price, {
    message: "Preço promocional não pode ser maior que o preço.",
    path: ["promotionalPrice"],
  })
  // recurring_plan requires a billing cycle; the other types must not have one.
  .refine((d) => d.type !== "recurring_plan" || d.billingCycle != null, {
    message: "Informe o ciclo de cobrança.",
    path: ["billingCycle"],
  })
  .refine((d) => d.type === "recurring_plan" || d.billingCycle == null, {
    message: "Apenas planos recorrentes têm ciclo de cobrança.",
    path: ["billingCycle"],
  })
  // autoRenew only applies to recurring plans.
  .refine((d) => d.type === "recurring_plan" || !d.autoRenew, {
    message: "Renovação automática só se aplica a planos recorrentes.",
    path: ["autoRenew"],
  });

export type OfferPlanCreateInput = z.infer<typeof offerPlanCreateSchema>;
export const offerPlanUpdateSchema = offerPlanCreateSchema;

export const offerPlanCategoryCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(120),
  description: optText(500),
});
export type OfferPlanCategoryCreateInput = z.infer<typeof offerPlanCategoryCreateSchema>;

export const offerPlanCategoryUpdateSchema = offerPlanCategoryCreateSchema.extend({
  status: z.enum(OFFER_PLAN_CATEGORY_STATUSES).default("active"),
});

export const OFFER_PLAN_SORTABLE = [
  "name",
  "type",
  "price",
  "promotionalPrice",
  "billingCycle",
  "status",
  "availableForSale",
  "createdAt",
  "updatedAt",
] as const;

export const offerPlanFiltersSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
  availableForSale: z.string().optional(),
  billingCycle: z.string().optional(),
  autoRenew: z.string().optional(),
  allowScheduling: z.string().optional(),
  hasServices: z.string().optional(),
  hasProducts: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
});
