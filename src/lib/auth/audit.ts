import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AuthAuditEvent =
  | "login_password_success"
  | "login_password_failure"
  | "login_otp_requested"
  | "login_otp_success"
  | "login_otp_failure"
  | "login_google_success"
  | "login_google_denied"
  | "logout"
  | "password_reset_requested"
  | "password_reset_confirmed"
  | "password_changed"
  | "password_initial_set"
  | "tenant_selected"
  | "rate_limited";

/**
 * Append-only audit trail required by the auth spec. Never include the
 * plaintext password/code/token in `metadata` — only non-sensitive context
 * (e.g. channel, masked identifier, reason).
 */
export async function writeAuditLog(event: AuthAuditEvent, params: {
  userId?: string | null;
  tenantId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.authAuditLog.create({
    data: {
      event,
      userId: params.userId ?? null,
      tenantId: params.tenantId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
