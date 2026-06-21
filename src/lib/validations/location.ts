import { z } from "zod";

export const LOCATION_TYPES = ["physical_unit", "room", "office", "store", "clinic", "other"] as const;
export const LOCATION_STATUSES = ["active", "inactive"] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  physical_unit: "Unidade",
  room: "Sala",
  office: "Consultório",
  store: "Loja",
  clinic: "Clínica",
  other: "Outro",
};

export const locationTypeSchema = z.enum(LOCATION_TYPES, { message: "Tipo inválido." });
export const locationStatusSchema = z.enum(LOCATION_STATUSES, { message: "Status inválido." });

export const locationCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do local.").max(150),
  type: locationTypeSchema.default("physical_unit"),
  status: locationStatusSchema.default("active"),
});

export type LocationCreateInput = z.infer<typeof locationCreateSchema>;
