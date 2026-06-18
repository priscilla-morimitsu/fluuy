"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { toggleNicheStatusAction } from "./actions";
import NicheForm, { type NicheInitial } from "./niche-form";

export default function NicheRowActions({ niche }: { niche: NicheInitial & { status: string } }) {
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
            <DialogTitle>Editar nicho</DialogTitle>
          </DialogHeader>
          <NicheForm initial={niche} onSuccess={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => toggleNicheStatusAction(niche.id))}
      >
        {niche.status === "active" ? "Inativar" : "Ativar"}
      </Button>
    </div>
  );
}
