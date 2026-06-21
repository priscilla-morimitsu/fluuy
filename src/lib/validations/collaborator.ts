import { z } from "zod";

import { isValidCpf, onlyDigits } from "@/lib/masks";

import { slugify } from "./product";

export { slugify };

export const COLLABORATOR_STATUSES = ["active", "inactive"] as const;
export const COLLABORATOR_ENTITY_STATUSES = ["active", "inactive"] as const;
export const TENANT_ROLES = ["tenant_owner", "tenant_manager", "tenant_operator", "tenant_viewer"] as const;

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const collaboratorStatusSchema = z.enum(COLLABORATOR_STATUSES, { message: "Status inválido." });

export const collaboratorCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do colaborador.").max(150),
  roleId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  departmentId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  phone: optText(40),
  whatsapp: optText(40),
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v.toLowerCase() : null)),
  document: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? onlyDigits(v) : null))
    .refine((v) => v === null || (v.length === 11 && isValidCpf(v)), { message: "CPF inválido." }),
  status: collaboratorStatusSchema,
  hasSystemAccess: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  tenantRole: z
    .enum(TENANT_ROLES)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  isServiceProfessional: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  professionalId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  internalNotes: optText(2000),
})
  .refine((d) => !d.hasSystemAccess || Boolean(d.email), {
    message: "Informe o e-mail para conceder acesso ao sistema.",
    path: ["email"],
  })
  .refine((d) => !d.hasSystemAccess || Boolean(d.tenantRole), {
    message: "Informe o papel do colaborador no sistema.",
    path: ["tenantRole"],
  });

export type CollaboratorCreateInput = z.infer<typeof collaboratorCreateSchema>;
export const collaboratorUpdateSchema = collaboratorCreateSchema;

export const collaboratorEntityCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120),
  description: optText(500),
});
export type CollaboratorEntityCreateInput = z.infer<typeof collaboratorEntityCreateSchema>;

export const COLLABORATOR_SORTABLE = [
  "name",
  "status",
  "hasSystemAccess",
  "tenantRole",
  "isServiceProfessional",
  "createdAt",
  "updatedAt",
] as const;

export const collaboratorFiltersSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  roleId: z.string().optional(),
  departmentId: z.string().optional(),
});
