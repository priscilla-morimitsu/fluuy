"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { toggleBillingPlanStatusAction } from "./actions";

export default function BillingPlanRowActions({
  billingPlanId,
  status,
}: {
  billingPlanId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleBillingPlanStatusAction(billingPlanId))}
    >
      {status === "active" ? "Inativar" : "Ativar"}
    </Button>
  );
}
