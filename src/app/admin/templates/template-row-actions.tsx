"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { toggleTemplateStatusAction } from "./actions";

export default function TemplateRowActions({
  templateId,
  status,
}: {
  templateId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleTemplateStatusAction(templateId))}
    >
      {status === "active" ? "Inativar" : "Ativar"}
    </Button>
  );
}
