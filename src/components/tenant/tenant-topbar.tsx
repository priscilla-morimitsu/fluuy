"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Topbar } from "@/components/ui/topbar";

/**
 * Tenant workspace top bar: brand = tenant name, global search, and a user menu
 * wired to change-password / sign-out (via a server action from the layout).
 */
export function TenantTopbar({
  user,
  brand,
  logoutAction,
}: {
  user: { name: string; email?: string };
  brand: string;
  logoutAction: () => Promise<void>;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  return (
    <Topbar
      user={user}
      brand={brand}
      searchPlaceholder="Buscar…"
      searchValue={query}
      onSearch={setQuery}
      onChangePassword={() => router.push("/account/security")}
      onLogout={() => {
        void logoutAction();
      }}
    />
  );
}
