import Link from "next/link";

import { requirePlatformAdmin } from "@/lib/rbac";

export default async function AdminSettingsPage() {
  await requirePlatformAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground">Preferências da plataforma.</p>
      </div>

      <div className="glass flex flex-col gap-2 rounded-xl p-4">
        <h3 className="text-base font-medium">Segurança da conta</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie sua senha e credenciais de acesso.
        </p>
        <Link href="/account/security" className="text-sm font-medium text-foreground underline underline-offset-4">
          Abrir segurança da conta →
        </Link>
      </div>
    </div>
  );
}
