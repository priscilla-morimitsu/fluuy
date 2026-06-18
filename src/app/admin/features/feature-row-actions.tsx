"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { toggleFeatureStatusAction } from "./actions";
import FeatureForm, { type FeatureInitial } from "./feature-form";

export default function FeatureRowActions({
  feature,
}: {
  feature: FeatureInitial & { status: string };
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex justify-end gap-2">
      <Dialog open={editing} onOpenChange={setEditing}>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar feature</DialogTitle>
          </DialogHeader>
          <FeatureForm initial={feature} onSuccess={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => toggleFeatureStatusAction(feature.id))}
      >
        {feature.status === "active" ? "Inativar" : "Ativar"}
      </Button>
    </div>
  );
}
