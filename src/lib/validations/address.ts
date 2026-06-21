import { z } from "zod";

import { isValidUf, normalizeCep } from "@/lib/address/types";

/**
 * Reusable Brazilian address schema (server-side canonical validation).
 * `makeAddressSchema` toggles between an optional block and a fully-required one
 * (and whether the neighborhood is required). CEP is normalized to digits, UF to
 * uppercase, text is trimmed. Masks on the client are UX only.
 */
export function makeAddressSchema(
  opts: { required?: boolean; requireNeighborhood?: boolean } = {}
) {
  const { required = false, requireNeighborhood = true } = opts;

  const cep = z.preprocess(
    (v) => normalizeCep(String(v ?? "")),
    required
      ? z.string().min(1, "Informe o CEP.").length(8, "CEP deve ter 8 dígitos.")
      : z.union([z.literal(""), z.string().length(8, "CEP deve ter 8 dígitos.")])
  );

  const state = z.preprocess(
    (v) => String(v ?? "").trim().toUpperCase(),
    required
      ? z
          .string()
          .min(1, "Selecione o estado.")
          .refine(isValidUf, "UF inválida.")
      : z.string().refine((s) => s === "" || isValidUf(s), "UF inválida.")
  );

  const reqText = (msg: string, max = 150) =>
    z.string().trim().min(1, msg).max(max);
  const optText = (max = 150) =>
    z
      .string()
      .trim()
      .max(max)
      .optional()
      .transform((v) => (v ? v : undefined));

  const coord = (lo: number, hi: number, msg: string) =>
    z.preprocess(
      (v) => (v === "" || v == null ? null : typeof v === "number" ? v : Number(v)),
      z.number().min(lo, msg).max(hi, msg).nullable()
    );

  return z.object({
    cep,
    street: required ? reqText("Informe a rua.") : optText(),
    number: required
      ? z.string().trim().min(1, "Informe o número ou S/N.").max(20)
      : optText(20),
    complement: optText(100),
    neighborhood:
      required && requireNeighborhood ? reqText("Informe o bairro.") : optText(),
    city: required ? reqText("Informe a cidade.") : optText(),
    state,
    country: z
      .string()
      .trim()
      .default("Brasil")
      .transform((v) => v || "Brasil"),
    reference: optText(200),
    latitude: coord(-90, 90, "Latitude inválida.").optional(),
    longitude: coord(-180, 180, "Longitude inválida.").optional(),
    ibge: optText(10),
    ddd: optText(3),
    siafi: optText(6),
  });
}

export const brazilianAddressSchema = makeAddressSchema();
export const requiredBrazilianAddressSchema = makeAddressSchema({ required: true });

export type AddressInput = z.infer<typeof brazilianAddressSchema>;
