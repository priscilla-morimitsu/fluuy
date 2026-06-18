import { z } from "zod";

export const tenantSchema = z.object({
  nicheId: z.string().uuid(),
  name: z.string().min(2).max(150),
  legalName: z.string().max(150).optional().or(z.literal("")),
  document: z.string().max(30).optional().or(z.literal("")),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  description: z.string().max(2000).optional().or(z.literal("")),
  publicPhone: z.string().max(30).optional().or(z.literal("")),
  publicEmail: z.string().email().optional().or(z.literal("")),
  notificationPhone: z.string().max(30).optional().or(z.literal("")),
  hasProducts: z.boolean().default(false),
  hasServices: z.boolean().default(false),
  hasPlans: z.boolean().default(false),
  hasDelivery: z.boolean().default(false),
  hasPickup: z.boolean().default(false),
  acceptsOnlinePayment: z.boolean().default(false),
});

export type TenantInput = z.infer<typeof tenantSchema>;

// `slug` is part of the tenant's public URL (/t/[slug]) and is treated as a
// stable identifier, so it cannot change after creation.
export const tenantUpdateSchema = tenantSchema.omit({ slug: true });

export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;

export const TENANT_STATUSES = ["active", "trial", "suspended", "blocked"] as const;
export const tenantStatusSchema = z.enum(TENANT_STATUSES);
export type TenantStatusValue = z.infer<typeof tenantStatusSchema>;

export const tenantProfileSchema = z.object({
  name: z.string().min(2).max(150),
  legalName: z.string().max(150).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  publicPhone: z.string().max(30).optional().or(z.literal("")),
  publicEmail: z.string().email().optional().or(z.literal("")),
  notificationPhone: z.string().max(30).optional().or(z.literal("")),
});

export type TenantProfileInput = z.infer<typeof tenantProfileSchema>;
