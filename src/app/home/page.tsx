import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { resolveTenantsForUser } from "@/lib/auth/tenant-resolution";
import { prisma } from "@/lib/prisma";

// Post-login gateway: resolves the right initial screen (dashboard) for the
// signed-in user and redirects there. It never renders app UI itself — every
// path ends in a redirect, except the terminal "no tenant" state below.
export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Platform admins land on the platform dashboard.
  if (session.user.isPlatformAdmin) redirect("/admin");

  // Tenant users must have a password set before reaching the app.
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
  if (!tenant) redirect("/select-tenant");

  // Tenant users land on their business dashboard (the tenant home).
  redirect(`/t/${tenant.slug}`);
}
