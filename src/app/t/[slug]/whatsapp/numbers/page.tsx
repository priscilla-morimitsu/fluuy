import { notFound } from "next/navigation";

import { listWhatsappAccounts } from "@/lib/messaging/whatsapp-accounts";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import NumbersClient from "./numbers-client";

const FEATURE = "whatsapp_integration";

export default async function WhatsappNumbersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canManage = role === "tenant_owner" || role === "tenant_manager";
  const accounts = await listWhatsappAccounts(tenant.id);

  return <NumbersClient slug={slug} accounts={accounts} canManage={canManage} />;
}
