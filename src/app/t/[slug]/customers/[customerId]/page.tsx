import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { CUSTOMER_STATUS_LABELS } from "@/lib/validations/customer";

import {
  customerEntityTemplateFields,
  customerNicheLabels,
  getCustomerSummary,
  listCustomerEntities,
} from "../data";
import EntityManager from "./entity-manager";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "destructive"> = {
  active: "success",
  inactive: "secondary",
  blocked: "destructive",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ slug: string; customerId: string }>;
}) {
  const { slug, customerId } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "customer_management" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager" || role === "tenant_operator";
  const canDelete = role === "tenant_owner" || role === "tenant_manager";

  const customer = await getCustomerSummary(tenant.id, customerId);
  if (!customer) notFound();

  // Related entities sit behind their own feature gate — detect it without
  // throwing so the page still renders the customer header when it's off.
  let canUseEntities = true;
  try {
    await resolveTenantContext(slug, { feature: "customer_entities" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) canUseEntities = false;
    else throw err;
  }

  const labels = await customerNicheLabels(tenant.nicheId);
  const entityLabel = labels.entityLabel?.trim() || "Registro";

  const [entities, templateFields] = canUseEntities
    ? await Promise.all([listCustomerEntities(tenant.id, customerId), customerEntityTemplateFields(tenant.nicheId)])
    : [[], []];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/t/${slug}/customers`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {labels.customerLabel?.trim() ? `${labels.customerLabel}s` : "Clientes"}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">{customer.name}</h2>
          <Badge variant={STATUS_VARIANT[customer.status] ?? "secondary"}>
            {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {[customer.phone, customer.whatsapp, customer.email].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
        </p>
      </div>

      {canUseEntities ? (
        <EntityManager
          slug={slug}
          customerId={customerId}
          entityLabel={entityLabel}
          entities={entities}
          templateFields={templateFields}
          canWrite={canWrite}
          canDelete={canDelete}
        />
      ) : (
        <div className="glass flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-10 text-center">
          <p className="font-medium">Registros relacionados indisponíveis</p>
          <p className="text-sm text-muted-foreground">
            O recurso de entidades relacionadas não está habilitado para esta empresa.
          </p>
        </div>
      )}
    </div>
  );
}
