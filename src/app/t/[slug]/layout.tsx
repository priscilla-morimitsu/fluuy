import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { ForbiddenError, requireTenantRole, UnauthorizedError } from "@/lib/rbac";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) notFound();

  // Defense in depth: actions re-check this themselves (see rbac.ts). 404
  // instead of a 403/500 here so the route doesn't leak which slugs exist
  // to users who aren't members of that tenant.
  try {
    await requireTenantRole(tenant.id);
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">{tenant.name}</h1>
        <nav className="mt-2 flex gap-4 text-sm">
          <Link href={`/t/${slug}/settings`} className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
            Configurações
          </Link>
          <Link href="/account/security" className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
            Segurança da conta
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
