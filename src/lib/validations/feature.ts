import { z } from "zod";

export const featureSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/, "Use snake_case (ex: product_catalog)"),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  group: z.string().max(60).optional().or(z.literal("")),
});

export type FeatureInput = z.infer<typeof featureSchema>;

// `key` is the contract checked by UI/endpoints, so it is immutable after
// creation — edits only touch the descriptive fields.
export const featureUpdateSchema = featureSchema.omit({ key: true });

export type FeatureUpdateInput = z.infer<typeof featureUpdateSchema>;

export const billingPlanSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/, "Use snake_case (ex: plano_piloto)"),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().nonnegative(),
  billingPeriod: z.enum(["monthly", "yearly"]),
  featureIds: z.array(z.string().uuid()).default([]),
});

export type BillingPlanInput = z.infer<typeof billingPlanSchema>;

// `key` is immutable after creation (stable plan identifier).
export const billingPlanUpdateSchema = billingPlanSchema.omit({ key: true });

export type BillingPlanUpdateInput = z.infer<typeof billingPlanUpdateSchema>;
