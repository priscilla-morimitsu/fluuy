import { z } from "zod";

export const nicheSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, "Use snake_case (ex: pet_services)"),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  customerLabel: z.string().max(60).optional().or(z.literal("")),
  entityLabel: z.string().max(60).optional().or(z.literal("")),
});

export type NicheInput = z.infer<typeof nicheSchema>;
