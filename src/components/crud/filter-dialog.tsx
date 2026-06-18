"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Holds all advanced filters in a Dialog. The filter controls (passed as
 * children) write to URL params directly, so there's no separate "apply";
 * "Limpar filtros" resets them. The trigger badges the active filter count.
 */
export function FilterDialog({
  activeCount,
  onClear,
  children,
}: {
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" />
        Filtros
        {activeCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {activeCount}
          </Badge>
        )}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">{children}</div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            disabled={activeCount === 0}
          >
            Limpar filtros
          </Button>
          <Button onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
