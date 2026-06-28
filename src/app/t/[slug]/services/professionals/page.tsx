import { notFound } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import { listLocations } from "../data";
import {
  listProfessionalSpecialties,
  listProfessionals,
  listServiceOptions,
  listTenantMembers,
  professionalTemplateFields,
} from "./data";
import ProfessionalsClient from "./professionals-client";

export default async function ProfessionalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "service_catalog" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager";

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const num = (v: string | string[] | undefined) => {
    const n = Number(str(v));
    return Number.isFinite(n) ? n : undefined;
  };

  const [{ rows, filtered, total }, specialties, services, locations, members, template] = await Promise.all([
    listProfessionals(tenant.id, {
      q: str(sp.q),
      status: str(sp.status),
      publicProfile: str(sp.publicProfile),
      specialtyId: str(sp.specialtyId),
      serviceId: str(sp.serviceId),
      locationId: str(sp.locationId),
      hasUser: str(sp.hasUser),
      updatedFrom: str(sp.updatedFrom),
      updatedTo: str(sp.updatedTo),
      sortBy: str(sp.sortBy),
      sortDir: str(sp.sortDir),
      page: num(sp.page),
      pageSize: num(sp.pageSize),
    }),
    listProfessionalSpecialties(tenant.id),
    listServiceOptions(tenant.id),
    listLocations(tenant.id),
    listTenantMembers(tenant.id),
    professionalTemplateFields(tenant.nicheId),
  ]);

  return (
    <ProfessionalsClient
      slug={slug}
      rows={rows}
      filtered={filtered}
      total={total}
      specialties={specialties.map((s) => ({ id: s.id, name: s.name }))}
      services={services.map((s) => ({ id: s.id, name: s.name }))}
      locations={locations.map((l) => ({ id: l.id, name: l.name }))}
      members={members}
      templateFields={template.fields}
      templateLayout={template.layout}
      canWrite={canWrite}
    />
  );
}
