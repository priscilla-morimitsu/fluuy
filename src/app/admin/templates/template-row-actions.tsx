"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { toggleTemplateStatusAction } from "./actions";
import TemplateForm, { type TemplateInitial } from "./template-form";

export default function TemplateRowActions({
  template,
  niches,
}: {
  template: TemplateInitial & { status: string };
  niches: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex justify-end gap-2">
      <Dialog open={editing} onOpenChange={setEditing}>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar template</DialogTitle>
          </DialogHeader>
          <TemplateForm niches={niches} initial={template} onSuccess={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => toggleTemplateStatusAction(template.id))}
      >
        {template.status === "active" ? "Inativar" : "Ativar"}
      </Button>
    </div>
  );
}
