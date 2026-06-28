import { endOfMonth, endOfWeek, format, parse, startOfMonth, startOfWeek } from "date-fns";
import { notFound } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import AppointmentsClient from "./appointments-client";
import { appointmentTemplateFields, listAppointmentOptions, listAppointments } from "./data";

const FEATURE = "appointment_request";

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager" || role === "tenant_operator";

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const monthParam = str(sp.month);
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : format(new Date(), "yyyy-MM");
  const monthDate = parse(`${month}-01`, "yyyy-MM-dd", new Date());
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });

  const [{ rows }, options, template] = await Promise.all([
    listAppointments(tenant.id, {
      startFrom: gridStart.toISOString(),
      startTo: gridEnd.toISOString(),
      status: str(sp.status),
      modality: str(sp.modality),
      responsibleType: str(sp.responsibleType),
      professionalId: str(sp.professionalId),
      serviceId: str(sp.serviceId),
      locationId: str(sp.locationId),
      sortBy: "startAt",
      sortDir: "asc",
      pageSize: 200,
    }),
    listAppointmentOptions(tenant.id),
    appointmentTemplateFields(tenant.nicheId),
  ]);

  return (
    <AppointmentsClient
      slug={slug}
      month={month}
      appointments={rows}
      options={options}
      templateFields={template.fields}
      templateLayout={template.layout}
      canWrite={canWrite}
    />
  );
}
