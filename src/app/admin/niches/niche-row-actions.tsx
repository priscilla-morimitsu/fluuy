"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { toggleNicheStatusAction } from "./actions";

export default function NicheRowActions({
  nicheId,
  status,
}: {
  nicheId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleNicheStatusAction(nicheId))}
    >
      {status === "active" ? "Inativar" : "Ativar"}
    </Button>
  );
}
