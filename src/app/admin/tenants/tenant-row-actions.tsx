"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { setTenantStatusAction } from "./actions";

export default function TenantRowActions({
  tenantId,
  status,
}: {
  tenantId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const blocked = status === "blocked";

  return (
    <Button
      variant={blocked ? "outline" : "destructive"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(() => setTenantStatusAction(tenantId, blocked ? "active" : "blocked"))
      }
    >
      {blocked ? "Desbloquear" : "Bloquear"}
    </Button>
  );
}
