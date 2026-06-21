"use client";

import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setTenantFeatureAction } from "@/app/admin/features/actions";

type FeatureRow = {
  id: string;
  key: string;
  name: string;
  group: string | null;
  status: string;
  enabled: boolean;
  source: string | null;
};

function FeatureToggle({ tenantId, feature }: { tenantId: string; feature: FeatureRow }) {
  const [pending, startTransition] = useTransition();
  const isInactive = feature.status !== "active";

  // Inactive global features can't be newly enabled — only shown read-only
  // when they already carry a grant (see setTenantFeatureAction).
  if (isInactive && !feature.enabled) {
    return <span className="text-xs text-zinc-400">indisponível</span>;
  }

  return (
    <Button
      variant={feature.enabled ? "outline" : "default"}
      size="sm"
      disabled={pending || (isInactive && feature.enabled)}
      onClick={() =>
        startTransition(() => setTenantFeatureAction(tenantId, feature.id, !feature.enabled))
      }
    >
      {feature.enabled ? "Desabilitar" : "Habilitar"}
    </Button>
  );
}

export default function TenantFeatureManager({
  tenantId,
  features,
}: {
  tenantId: string;
  features: FeatureRow[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Feature</TableHead>
          <TableHead>Grupo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {features.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-sm text-zinc-500">
              Nenhuma feature ativa no sistema.
            </TableCell>
          </TableRow>
        ) : (
          features.map((feature) => (
            <TableRow key={feature.id}>
              <TableCell>
                <span className="font-medium">{feature.name}</span>
                <span className="ml-2 font-mono text-xs text-zinc-500">{feature.key}</span>
                {feature.status !== "active" && (
                  <Badge variant="secondary" className="ml-2">
                    feature inativa
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-zinc-500">{feature.group ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={feature.enabled ? "success" : "secondary"}>
                  {feature.enabled ? "habilitada" : "desabilitada"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-zinc-500">{feature.source ?? "—"}</TableCell>
              <TableCell className="text-right">
                <FeatureToggle tenantId={tenantId} feature={feature} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
