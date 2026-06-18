"use server";

import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/auth/audit";
import { hmacSha256 } from "@/lib/auth/crypto";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { passwordResetConfirmSchema } from "@/lib/validations/auth";

export type ActionResult = { error: string } | undefined;

export async function confirmPasswordResetAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordResetConfirmSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const tokenHash = hmacSha256(parsed.data.token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  // Generic message either way — don't reveal whether the token format was
  // valid vs. expired vs. already used.
  const genericError = { error: "Link inválido ou expirado. Solicite um novo." };

  if (!resetToken || resetToken.consumedAt || resetToken.expiresAt < new Date()) {
    return genericError;
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.authCredential.upsert({
      where: { userId: resetToken.userId },
      update: { passwordHash, passwordSetAt: new Date(), mustChangePassword: false },
      create: { userId: resetToken.userId, passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  await writeAuditLog("password_reset_confirmed", { userId: resetToken.userId });

  redirect("/login?reset=success");
}
