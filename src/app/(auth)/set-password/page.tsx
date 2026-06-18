import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

import SetPasswordForm from "./set-password-form";

export default async function SetPasswordPage() {
  const user = await requireUser();

  const existing = await prisma.authCredential.findUnique({ where: { userId: user.id } });
  if (existing) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <SetPasswordForm />
    </div>
  );
}
