"use server";

import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/auth/audit";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { initialPasswordSchema } from "@/lib/validations/auth";

export type ActionResult = { error: string } | undefined;

/**
 * For a user who authenticated via OTP and has no auth_credentials row yet
 * (invited users get their first access via e-mail/WhatsApp code, not a
 * password). Requires an active session — not a public/token-based flow.
 */
export async function setInitialPasswordAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const existing = await prisma.authCredential.findUnique({ where: { userId: user.id } });
  if (existing) {
    return { error: "Esta conta já possui senha definida." };
  }

  const parsed = initialPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.authCredential.create({ data: { userId: user.id, passwordHash } });
  await writeAuditLog("password_initial_set", { userId: user.id });

  redirect("/");
}
