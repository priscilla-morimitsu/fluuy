import { notFound } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import { appointmentTemplateFields, getAppointment, listAppointmentOptions } from "../data";
import AppointmentDetail from "../appointment-detail";

const FEATURE = "appointment_request";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; appointmentId: string }>;
}) {
  const { slug, appointmentId } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager" || role === "tenant_operator";
  const canDelete = role === "tenant_owner" || role === "tenant_manager";

  const [appointment, options, template] = await Promise.all([
    getAppointment(tenant.id, appointmentId),
    listAppointmentOptions(tenant.id),
    appointmentTemplateFields(tenant.nicheId),
  ]);
  if (!appointment) notFound();

  return (
    <AppointmentDetail
      slug={slug}
      appointment={appointment}
      options={options}
      templateFields={template.fields}
      canWrite={canWrite}
      canDelete={canDelete}
    />
  );
}
