"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";

export type PickerCustomer = { id: string; name: string };

/**
 * Fluuy — NewPetClientPickerDialog.
 *
 * Presentational dialog shown before creating a pet: pick the customer the pet
 * belongs to via a searchable Combobox over the `customers` prop. Wiring-agnostic
 * — the customer list and the create/continue handlers are supplied by the caller.
 */
export function NewPetClientPickerDialog({
  open,
  onOpenChange,
  customers,
  onCreateClient,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: PickerCustomer[];
  /** "Cadastrar novo cliente" — close this dialog and open client create. */
  onCreateClient: () => void;
  /** "Continuar" — proceed to create a pet for the chosen customer. */
  onContinue: (customerId: string) => void;
}) {
  const [customerId, setCustomerId] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCustomerId("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo pet — selecione o cliente</DialogTitle>
        </DialogHeader>

        <Field label="Cliente" htmlFor="picker-customer" required>
          <Combobox
            id="picker-customer"
            value={customerId}
            onValueChange={setCustomerId}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Selecione o cliente"
            searchPlaceholder="Buscar cliente…"
            emptyText="Nenhum cliente encontrado."
          />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onCreateClient}>
            <UserPlus className="size-4" />
            Cadastrar novo cliente
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCustomerId("");
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="brand"
            disabled={!customerId}
            onClick={() => customerId && onContinue(customerId)}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
