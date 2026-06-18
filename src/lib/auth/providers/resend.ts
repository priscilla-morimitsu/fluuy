import "server-only";

import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");
  client ??= new Resend(apiKey);
  return client;
}

function fromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL is not set.");
  return from;
}

/**
 * Isolated Resend adapter — the only module in the app that imports the
 * Resend SDK or touches RESEND_API_KEY. Callers never see the SDK response
 * body (which could echo the code/link back); they only get success/failure.
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await getClient().emails.send({
    from: fromAddress(),
    to,
    subject: "Seu código de acesso Fluuy",
    text: `Seu código de acesso é ${code}. Ele expira em 5 minutos. Se você não solicitou este código, ignore este e-mail.`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await getClient().emails.send({
    from: fromAddress(),
    to,
    subject: "Redefinição de senha — Fluuy",
    text: `Recebemos uma solicitação para redefinir sua senha. Acesse o link abaixo para continuar (válido por 30 minutos):\n\n${resetUrl}\n\nSe você não solicitou isso, ignore este e-mail.`,
  });
}
