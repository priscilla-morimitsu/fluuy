import { redirect } from "next/navigation";

import { AdminCommandMenu } from "@/components/admin/admin-command-menu";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { auth, signOut } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Defense in depth: middleware only checks "is there a session", not role.
  // Every admin route/action re-checks isPlatformAdmin server-side (see
  // requirePlatformAdmin in src/lib/rbac.ts) — this redirect is just UX.
  if (!session?.user?.isPlatformAdmin) {
    redirect("/home");
  }

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const email = session.user.email ?? undefined;

  return (
    <div className="gradient-bg flex min-h-screen flex-col">
      <AdminTopbar user={{ name: session.user.name ?? email ?? "Admin", email }} logoutAction={logout} />
      <div className="flex flex-1 gap-4 p-4">
        <AdminSidebar />
        <main className="min-w-0 flex-1 pt-2 pb-28 md:pb-2">{children}</main>
      </div>
      <AdminCommandMenu />
      <AdminMobileNav />
    </div>
  );
}
