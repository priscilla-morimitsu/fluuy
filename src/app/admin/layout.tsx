import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

const NAV = [
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/niches", label: "Nichos" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/features", label: "Features" },
  { href: "/admin/billing-plans", label: "Planos comerciais" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Defense in depth: middleware only checks "is there a session", not role.
  // Every admin route/action re-checks isPlatformAdmin server-side (see
  // requirePlatformAdmin in src/lib/rbac.ts) — this redirect is just UX.
  if (!session?.user?.isPlatformAdmin) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Fluuy — Platform Admin</h1>
        <nav className="mt-2 flex gap-4 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
