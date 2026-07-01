"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { CODE_TTL_MINUTES, issueOtp } from "@/lib/auth/otp";
import { sendOtpWhatsapp } from "@/lib/auth/providers/pilot-status";
import { sendOtpEmail } from "@/lib/auth/providers/resend";
import { RateLimitedError } from "@/lib/auth/rate-limit";
import {
  loginPasswordSchema,
  otpRequestSchema,
  otpVerifySchema,
} from "@/lib/validations/auth";

export type ActionResult = { error: string } | undefined;

export async function loginWithPasswordAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginPasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Informe um e-mail e senha válidos." };
  }

  try {
    await signIn("password", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: parsed.data.callbackUrl || "/home",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw err;
  }
}

export type OtpRequestResult = { error?: string; sent?: boolean };

// Always returns a generic "sent" response regardless of whether the
// identifier matches an active user — never reveal existence (security.md).
export async function requestOtpAction(
  channel: "email" | "whatsapp",
  identifier: string,
): Promise<OtpRequestResult> {
  const parsed = otpRequestSchema.safeParse({ channel, identifier });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Identificador inválido." };
  }

  let issued: { code: string; userId: string } | null = null;
  try {
    issued = await issueOtp({ channel, identifier: parsed.data.identifier });
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return { error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." };
    }
    throw err;
  }

  if (issued) {
    // A provider outage (or a missing API key) must not turn into a 500 that
    // only happens for identifiers that exist — that would itself leak
    // existence. Log server-side, still return the same generic response.
    try {
      if (channel === "email") {
        await sendOtpEmail(parsed.data.identifier, issued.code);
      } else {
        await sendOtpWhatsapp(parsed.data.identifier, issued.code, CODE_TTL_MINUTES);
      }
    } catch (err) {
      console.error(`Failed to send ${channel} OTP`, err);
    }
  }

  return { sent: true };
}

export async function verifyOtpAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = otpVerifySchema.safeParse({
    channel: formData.get("channel"),
    identifier: formData.get("identifier"),
    code: formData.get("code"),
    callbackUrl: formData.get("callbackUrl") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Código inválido." };
  }

  try {
    await signIn(parsed.data.channel === "email" ? "email-otp" : "whatsapp-otp", {
      identifier: parsed.data.identifier,
      code: parsed.data.code,
      redirectTo: parsed.data.callbackUrl || "/home",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Código inválido ou expirado." };
    }
    throw err;
  }
}

export async function signInWithGoogleAction(callbackUrl?: string): Promise<void> {
  await signIn("google", { redirectTo: callbackUrl || "/home" });
}
