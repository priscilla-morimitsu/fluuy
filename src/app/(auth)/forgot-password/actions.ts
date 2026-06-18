"use server";

import { writeAuditLog } from "@/lib/auth/audit";
import { generateOpaqueToken, hmacSha256 } from "@/lib/auth/crypto";
import { sendPasswordResetEmail } from "@/lib/auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { passwordResetRequestSchema } from "@/lib/validations/auth";

export type ActionResult = { error: string } | { success: true };

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_REQUESTS_PER_WINDOW = 3;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

// Always returns the same generic success response — never reveals whether
// the e-mail belongs to an active user (security.md: no user enumeration).
export async function requestPasswordResetAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Informe um e-mail válido." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const emailHash = hmacSha256(email);

  const recentCount = await prisma.passwordResetToken.count({
    where: {
      user: { email },
      createdAt: { gte: new Date(Date.now() - REQUEST_WINDOW_MS) },
    },
  });

  if (recentCount < MAX_REQUESTS_PER_WINDOW) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.status === "active") {
      const token = generateOpaqueToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hmacSha256(token),
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      try {
        await sendPasswordResetEmail(email, `${baseUrl}/reset-password?token=${token}`);
      } catch (err) {
        // Same reasoning as requestOtpAction: a provider failure must not
        // surface differently than "user doesn't exist" (no 500, no enumeration).
        console.error("Failed to send password reset email", err);
      }
      await writeAuditLog("password_reset_requested", { userId: user.id, metadata: { emailHash } });
    }
  }

  return { success: true };
}
