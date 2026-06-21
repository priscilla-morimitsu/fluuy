import { notFound } from "next/navigation";

import { listTemplates } from "@/lib/messaging/templates";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import TemplatesClient from "./templates-client";

const FEATURE = "whatsapp_integration";

export default async function WhatsappTemplatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const canManage = ctx.role === "tenant_owner" || ctx.role === "tenant_manager";
  const templates = await listTemplates(ctx.tenant.id);

  return <TemplatesClient slug={slug} templates={templates} canManage={canManage} />;
}
