import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { SERVICE_DELIVERY_MODE_LABELS } from "@/lib/validations/service";

import { getService, listAvailabilityRules, listLocations, listProfessionals } from "../data";
import AvailabilityManager from "./availability-manager";

const STATUS_LABELS: Record<string, string> = { draft: "Rascunho", active: "Ativo", inactive: "Inativo" };

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string; serviceId: string }>;
}) {
  const { slug, serviceId } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "service_catalog" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager";

  const service = await getService(tenant.id, serviceId);
  if (!service) notFound();

  const [rules, professionals, locations] = await Promise.all([
    listAvailabilityRules(tenant.id, serviceId),
    listProfessionals(tenant.id),
    listLocations(tenant.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/t/${slug}/services`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Serviços
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">{service.name}</h2>
          <Badge variant={service.status === "active" ? "success" : service.status === "draft" ? "warning" : "secondary"}>
            {STATUS_LABELS[service.status] ?? service.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {service.deliveryModes.map((m) => SERVICE_DELIVERY_MODE_LABELS[m]).join(" · ") || "Sem modalidades"}
          {service.estimatedDurationMinutes ? ` · ${service.estimatedDurationMinutes} min` : ""}
        </p>
      </div>

      <AvailabilityManager
        slug={slug}
        serviceId={serviceId}
        serviceDeliveryModes={service.deliveryModes}
        rules={rules}
        professionals={professionals.map((p) => ({ id: p.id, name: p.name }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        canWrite={canWrite}
      />
    </div>
  );
}
