"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

import { selectTenantAction, type ActionResult } from "./actions";

export default function SelectTenantForm({
  tenants,
}: {
  tenants: { id: string; name: string; slug: string }[];
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    selectTenantAction,
    undefined,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Selecione a empresa</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tenantId">Empresa</Label>
            <Combobox
              id="tenantId"
              name="tenantId"
              options={tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))}
              placeholder="Selecione"
              searchPlaceholder="Buscar empresa…"
              emptyText="Nenhuma empresa."
            />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Entrando..." : "Continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
