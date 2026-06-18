import { z } from "zod";

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * Strong password policy (security.md + the auth spec): 12+ chars, upper,
 * lower, digit, special char, and never equal to the user's own email/phone.
 * `notEqualTo` lets callers pass the email/phone being used for that user so
 * the check can run without a DB round-trip.
 */
export function passwordSchema(notEqualTo: { email?: string; phone?: string } = {}) {
  return z
    .string()
    .min(12, "A senha deve ter pelo menos 12 caracteres.")
    .regex(/[A-Z]/, "A senha deve ter ao menos uma letra maiúscula.")
    .regex(/[a-z]/, "A senha deve ter ao menos uma letra minúscula.")
    .regex(/[0-9]/, "A senha deve ter ao menos um número.")
    .regex(/[^A-Za-z0-9]/, "A senha deve ter ao menos um caractere especial.")
    .refine(
      (value) => !notEqualTo.email || value.toLowerCase() !== notEqualTo.email.toLowerCase(),
      "A senha não pode ser igual ao e-mail.",
    )
    .refine(
      (value) => !notEqualTo.phone || value !== notEqualTo.phone,
      "A senha não pode ser igual ao telefone.",
    );
}

function confirmedPassword<T extends { password: string; confirmPassword: string }>(
  schema: z.ZodType<T>,
) {
  return schema.refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });
}

export const loginPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  callbackUrl: z.string().optional(),
});

export const otpChannelSchema = z.enum(["email", "whatsapp"]);

export const otpRequestSchema = z
  .object({
    channel: otpChannelSchema,
    identifier: z.string().min(3),
  })
  .refine(
    (data) =>
      data.channel === "email"
        ? z.string().email().safeParse(data.identifier).success
        : E164_REGEX.test(data.identifier),
    { message: "Identificador inválido para o canal selecionado.", path: ["identifier"] },
  );

export const otpVerifySchema = z.object({
  channel: otpChannelSchema,
  identifier: z.string().min(3),
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos."),
  callbackUrl: z.string().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = confirmedPassword(
  z.object({
    token: z.string().min(10),
    password: z.string(),
    confirmPassword: z.string(),
  }),
).refine((data) => passwordSchema().safeParse(data.password).success, {
  message: "Senha não atende aos critérios mínimos.",
  path: ["password"],
});

export const changePasswordSchema = confirmedPassword(
  z.object({
    currentPassword: z.string().min(1),
    password: z.string(),
    confirmPassword: z.string(),
  }),
).refine((data) => passwordSchema().safeParse(data.password).success, {
  message: "Senha não atende aos critérios mínimos.",
  path: ["password"],
});

export const initialPasswordSchema = confirmedPassword(
  z.object({
    password: z.string(),
    confirmPassword: z.string(),
  }),
).refine((data) => passwordSchema().safeParse(data.password).success, {
  message: "Senha não atende aos critérios mínimos.",
  path: ["password"],
});

export const leadSchema = z.object({
  name: z.string().min(2).max(150),
  companyName: z.string().max(150).optional().or(z.literal("")),
  email: z.string().email(),
  phone: z.string().max(30).optional().or(z.literal("")),
  niche: z.string().max(60).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  source: z.string().max(60).optional().or(z.literal("")),
});

export const selectTenantSchema = z.object({
  tenantId: z.string().uuid(),
});
