import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { auth, signOut } from "@/lib/auth";
import { resolveTenantsForUser } from "@/lib/auth/tenant-resolution";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!session.user.isPlatformAdmin) {
    const credential = await prisma.authCredential.findUnique({ where: { userId: session.user.id } });
    if (!credential) redirect("/set-password");

    const resolution = await resolveTenantsForUser(session.user.id, false);
    if (resolution.kind === "none") {
      return (
        <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <h1 className="text-xl font-semibold">Acesso não disponível</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sua conta não está vinculada a nenhuma empresa ativa no momento.
          </p>
        </main>
      );
    }
    if (resolution.kind === "multiple" && !session.user.selectedTenantId) {
      redirect("/select-tenant");
    }
    const tenantId = resolution.kind === "single" ? resolution.tenantId : session.user.selectedTenantId!;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) redirect(`/t/${tenant.slug}/settings`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Fluuy</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Logado como {session.user.email} (platform admin)
      </p>
      <nav className="flex flex-col items-center gap-2">
        <Link href="/admin/tenants" className="underline">
          Painel do Platform Admin
        </Link>
        <Link href="/account/security" className="underline">
          Segurança da conta
        </Link>
      </nav>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="outline">
          Sair
        </Button>
      </form>
    </main>
  );
}
