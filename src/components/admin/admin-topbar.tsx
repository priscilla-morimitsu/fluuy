"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Topbar } from "@/components/ui/topbar";

/**
 * Admin shell top bar. Wires the DS Topbar to real platform-admin actions:
 * global search routes to the tenants list, the user menu changes password or
 * signs out (via a server action passed from the layout).
 */
export function AdminTopbar({
  user,
  logoutAction,
}: {
  user: { name: string; email?: string };
  logoutAction: () => Promise<void>;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  return (
    <Topbar
      user={user}
      brand="fluuy"
      searchPlaceholder="Buscar no sistema…"
      searchValue={query}
      onSearch={setQuery}
      onSubmitSearch={(value) =>
        router.push(`/admin/tenants?q=${encodeURIComponent(value)}`)
      }
      onChangePassword={() => router.push("/account/security")}
      onLogout={() => {
        void logoutAction();
      }}
    />
  );
}
