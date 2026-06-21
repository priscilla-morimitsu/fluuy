import { z } from "zod";

export const ORDER_SOURCES = ["whatsapp", "manual", "instagram", "website", "api", "other"] as const;
export const ORDER_CHANNELS = ["whatsapp", "panel", "api", "other"] as const;
export const ORDER_STATUSES = [
  "draft",
  "pending_confirmation",
  "confirmed",
  "scheduled",
  "in_progress",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;
export const ORDER_FULFILLMENT_TYPES = ["delivery", "pickup", "at_location", "at_home", "online"] as const;
export const ORDER_DISCOUNT_TYPES = ["fixed", "percentage"] as const;
export const ORDER_PAYMENT_METHODS = [
  "pix",
  "credit_card",
  "debit_card",
  "cash",
  "bank_transfer",
  "payment_link",
  "other",
] as const;
export const ORDER_PAYMENT_STATUSES = ["pending", "paid", "partial", "refunded", "cancelled", "failed"] as const;
export const ORDER_ITEM_TYPES = ["product", "service", "offer_plan", "custom"] as const;
export const ORDER_ADDRESS_TYPES = ["delivery", "pickup", "at_location", "at_home", "billing", "other"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderStatusSchema = z.enum(ORDER_STATUSES, { message: "Status inválido." });
export const orderSourceSchema = z.enum(ORDER_SOURCES, { message: "Origem inválida." });
export const orderChannelSchema = z.enum(ORDER_CHANNELS, { message: "Canal inválido." });
export const orderFulfillmentTypeSchema = z.enum(ORDER_FULFILLMENT_TYPES, { message: "Tipo de atendimento inválido." });
export const orderPaymentMethodSchema = z.enum(ORDER_PAYMENT_METHODS, { message: "Forma de pagamento inválida." });
export const orderPaymentStatusSchema = z.enum(ORDER_PAYMENT_STATUSES, { message: "Status de pagamento inválido." });
export const orderItemTypeSchema = z.enum(ORDER_ITEM_TYPES, { message: "Item inválido." });
export const orderAddressTypeSchema = z.enum(ORDER_ADDRESS_TYPES, { message: "Tipo de endereço inválido." });

/** Allowed status transitions (spec). Any non-final status can also go to cancelled. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending_confirmation", "confirmed", "cancelled"],
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["scheduled", "in_progress", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["ready", "completed", "cancelled"],
  ready: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const FINAL_STATUSES: OrderStatus[] = ["completed", "cancelled"];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const money = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "number" ? v : Number(String(v))),
  z.number().finite().nonnegative().nullable(),
);

const quantity = z.preprocess(
  (v) => (v === "" || v == null ? undefined : typeof v === "number" ? v : Number(String(v))),
  z.number({ message: "Quantidade inválida." }).finite().positive("Quantidade inválida."),
);

const unitPrice = z.preprocess(
  (v) => (v === "" || v == null ? undefined : typeof v === "number" ? v : Number(String(v))),
  z.number({ message: "Preço inválido." }).finite().nonnegative("Preço inválido."),
);

export const orderItemInputSchema = z
  .object({
    itemType: orderItemTypeSchema,
    productId: z.string().uuid().nullish(),
    serviceId: z.string().uuid().nullish(),
    offerPlanId: z.string().uuid().nullish(),
    name: z.string().trim().min(1, "Item inválido.").max(200),
    description: optText(1000),
    quantity,
    unitPrice,
    discountValue: money,
    scheduledStartAt: z.coerce.date().nullish(),
    scheduledEndAt: z.coerce.date().nullish(),
  })
  .superRefine((d, ctx) => {
    if (d.itemType === "product" && !d.productId)
      ctx.addIssue({ code: "custom", message: "Produto obrigatório.", path: ["productId"] });
    if (d.itemType === "service" && !d.serviceId)
      ctx.addIssue({ code: "custom", message: "Serviço obrigatório.", path: ["serviceId"] });
    if (d.itemType === "offer_plan" && !d.offerPlanId)
      ctx.addIssue({ code: "custom", message: "Plano obrigatório.", path: ["offerPlanId"] });
  });

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

export const orderAddressInputSchema = z.object({
  type: orderAddressTypeSchema,
  customerAddressId: z.string().uuid().nullish(),
  name: optText(150),
  zipCode: optText(20),
  street: optText(200),
  number: optText(20),
  complement: optText(120),
  neighborhood: optText(150),
  city: optText(150),
  state: optText(2),
  reference: optText(200),
});

export type OrderAddressInput = z.infer<typeof orderAddressInputSchema>;

export const orderCreateSchema = z
  .object({
    customerId: z.string({ message: "Informe o cliente." }).uuid("Informe o cliente."),
    source: orderSourceSchema,
    channel: orderChannelSchema,
    status: orderStatusSchema.optional(),
    fulfillmentType: orderFulfillmentTypeSchema.nullish(),
    discountType: z.enum(ORDER_DISCOUNT_TYPES).nullish(),
    discountValue: money,
    deliveryFee: money,
    paymentMethod: orderPaymentMethodSchema.nullish(),
    paymentStatus: orderPaymentStatusSchema.optional(),
    amountPaid: money,
    customerNotes: optText(2000),
    internalNotes: optText(2000),
    items: z.array(orderItemInputSchema).min(1, "Adicione pelo menos um item."),
    address: orderAddressInputSchema.nullish(),
  })
  .superRefine((d, ctx) => {
    if (d.discountType === "percentage" && d.discountValue != null && (d.discountValue < 0 || d.discountValue > 100)) {
      ctx.addIssue({ code: "custom", message: "Desconto percentual deve ficar entre 0 e 100.", path: ["discountValue"] });
    }
    if ((d.fulfillmentType === "delivery" || d.fulfillmentType === "at_home") && !d.address) {
      ctx.addIssue({ code: "custom", message: "Endereço obrigatório para esta forma de atendimento.", path: ["address"] });
    }
  });

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export const orderUpdateSchema = orderCreateSchema;

export const ORDER_SORTABLE = [
  "orderNumber",
  "status",
  "paymentStatus",
  "source",
  "channel",
  "total",
  "createdAt",
  "updatedAt",
  "confirmedAt",
  "completedAt",
] as const;

export const orderFiltersSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  channel: z.string().optional(),
  fulfillmentType: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  customerId: z.string().optional(),
  createdByAgent: z.string().optional(),
  minTotal: z.string().optional(),
  maxTotal: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  updatedFrom: z.string().optional(),
  updatedTo: z.string().optional(),
});

/** Server-authoritative totals. Never trust client-computed values. */
export function computeOrderTotals(input: {
  items: { quantity: number; unitPrice: number; discountValue?: number | null }[];
  discountType?: (typeof ORDER_DISCOUNT_TYPES)[number] | null;
  discountValue?: number | null;
  deliveryFee?: number | null;
}): { itemTotals: number[]; subtotal: number; total: number } {
  const round = (n: number) => Math.round(n * 100) / 100;
  const itemTotals = input.items.map((it) => round(Math.max(0, it.quantity * it.unitPrice - (it.discountValue ?? 0))));
  const subtotal = round(itemTotals.reduce((s, t) => s + t, 0));
  const orderDiscount =
    input.discountType === "percentage"
      ? round(subtotal * ((input.discountValue ?? 0) / 100))
      : input.discountType === "fixed"
        ? (input.discountValue ?? 0)
        : 0;
  const total = round(Math.max(0, subtotal - orderDiscount + (input.deliveryFee ?? 0)));
  return { itemTotals, subtotal, total };
}
