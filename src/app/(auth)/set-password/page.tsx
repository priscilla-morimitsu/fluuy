import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

import SetPasswordForm from "./set-password-form";

export default async function SetPasswordPage() {
  const user = await requireUser();

  const existing = await prisma.authCredential.findUnique({ where: { userId: user.id } });
  if (existing) redirect("/home");

  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg px-4">
      <SetPasswordForm />
    </div>
  );
}
