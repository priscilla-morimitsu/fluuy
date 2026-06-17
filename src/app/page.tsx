import Link from "next/link";

import { Button } from "@/components/ui/button";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  const memberships = session?.user?.id
    ? await prisma.tenantUser.findMany({
        where: { userId: session.user.id, status: "active" },
        include: { tenant: true },
      })
    : [];

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Fluuy</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Logado como {session?.user?.email}
        {session?.user?.isPlatformAdmin ? " (platform admin)" : ""}
      </p>

      <nav className="flex flex-col items-center gap-2">
        {session?.user?.isPlatformAdmin && (
          <Link href="/admin/tenants" className="underline">
            Painel do Platform Admin
          </Link>
        )}
        {memberships.map((m) => (
          <Link key={m.tenantId} href={`/t/${m.tenant.slug}/settings`} className="underline">
            {m.tenant.name}
          </Link>
        ))}
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
