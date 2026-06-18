import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

import ChangePasswordForm from "./change-password-form";

export default async function AccountSecurityPage() {
  const user = await requireUser();
  const credential = await prisma.authCredential.findUnique({ where: { userId: user.id } });

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-4 text-xl font-semibold">Segurança da conta</h1>
        {credential ? (
          <ChangePasswordForm />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Esta conta ainda não possui senha.{" "}
            <a href="/set-password" className="underline">
              Definir senha
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
