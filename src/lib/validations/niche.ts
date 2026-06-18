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

// `key` is the stable contract used across the system, so it is intentionally
// omitted from edits — only descriptive fields can change after creation.
export const nicheUpdateSchema = nicheSchema.omit({ key: true });

export type NicheUpdateInput = z.infer<typeof nicheUpdateSchema>;
