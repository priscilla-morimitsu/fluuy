"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

// The landing CTA collects only a name and a single contact field (e-mail OR
// phone), mirroring the prototype. We detect which one it is server-side and
// persist into the existing `Lead` model surfaced in /admin/leads.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accept common BR phone shapes: digits, spaces, +, (), - and 10–15 digits.
const PHONE_RE = /^\+?[\d\s().-]{8,20}$/;

const leadSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  contato: z.string().trim().min(3, "Informe um contato.").max(160),
});

export type LeadFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; firstName: string };

export async function submitLeadAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const parsed = leadSchema.safeParse({
    nome: formData.get("nome"),
    contato: formData.get("contato"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Preencha seu nome e um e-mail ou telefone." };
  }

  const { nome, contato } = parsed.data;
  const digits = contato.replace(/\D/g, "");
  const isEmail = EMAIL_RE.test(contato);
  const isPhone = !isEmail && PHONE_RE.test(contato) && digits.length >= 8;

  if (!isEmail && !isPhone) {
    return { status: "error", message: "Preencha seu nome e um e-mail ou telefone." };
  }

  try {
    await prisma.lead.create({
      data: {
        name: nome,
        // The Lead model requires an email; when the visitor gave a phone we
        // store a placeholder e-mail and keep the real contact in `phone`.
        email: isEmail ? contato : `sem-email+${digits}@lead.fluuy`,
        phone: isPhone ? contato : null,
        source: "landing",
      },
    });
  } catch {
    // Never leak internal/DB details to the visitor.
    return { status: "error", message: "Não foi possível enviar agora. Tente novamente." };
  }

  return { status: "success", firstName: nome.split(" ")[0] };
}
