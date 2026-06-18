"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TENANT_STATUSES } from "@/lib/validations/tenant";

import { setTenantStatusAction } from "./actions";
import TenantForm, { type TenantInitial } from "./tenant-form";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  trial: "Trial",
  suspended: "Suspenso",
  blocked: "Bloqueado",
};

export default function TenantRowActions({
  tenant,
  niches,
}: {
  tenant: TenantInitial & { status: string };
  niches: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" size="sm" render={<Link href={`/admin/tenants/${tenant.id}`} />}>
        Detalhes
      </Button>

      <Dialog open={editing} onOpenChange={setEditing}>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar tenant</DialogTitle>
          </DialogHeader>
          <TenantForm niches={niches} initial={tenant} onSuccess={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Select value={tenant.status} onValueChange={(v) => v !== tenant.status && setTarget(v)}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TENANT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar status do tenant</DialogTitle>
            <DialogDescription>
              Mudar o status de <strong>{tenant.name}</strong> para{" "}
              <strong>{target ? STATUS_LABELS[target] : ""}</strong> pode afetar o acesso do
              tenant. Confirmar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (target) await setTenantStatusAction(tenant.id, target);
                  setTarget(null);
                })
              }
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
