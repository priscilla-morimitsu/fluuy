"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { toggleFeatureStatusAction } from "./actions";

export default function FeatureRowActions({
  featureId,
  status,
}: {
  featureId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleFeatureStatusAction(featureId))}
    >
      {status === "active" ? "Inativar" : "Ativar"}
    </Button>
  );
}
