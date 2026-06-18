"use server";

import { writeAuditLog } from "@/lib/auth/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { changePasswordSchema } from "@/lib/validations/auth";

export type ActionResult = { error: string } | { success: true };

export async function changePasswordAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const credential = await prisma.authCredential.findUnique({ where: { userId: user.id } });
  if (!credential) {
    return { error: "Esta conta ainda não possui senha. Use \"Definir senha\"." };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, credential.passwordHash);
  if (!valid) {
    return { error: "Senha atual incorreta." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.authCredential.update({
    where: { userId: user.id },
    data: { passwordHash, passwordSetAt: new Date(), mustChangePassword: false },
  });
  await writeAuditLog("password_changed", { userId: user.id });

  return { success: true };
}
