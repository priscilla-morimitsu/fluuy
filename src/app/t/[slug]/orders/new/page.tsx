import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { TenantUserRole } from "@/generated/prisma/client";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import { listCustomerOptions, listOrderCatalog, orderTemplateFields } from "../data";
import OrderForm from "../order-form";

const FEATURE = "product_order_request";
const WRITE_ROLES: TenantUserRole[] = ["tenant_owner", "tenant_manager", "tenant_operator"];

export default async function NewOrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { roles: WRITE_ROLES, feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant } = ctx;

  const [customers, catalog, template] = await Promise.all([
    listCustomerOptions(tenant.id),
    listOrderCatalog(tenant.id),
    orderTemplateFields(tenant.nicheId),
  ]);

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[560px] flex-col gap-3">
      <Link href={`/t/${slug}/orders`} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Pedidos
      </Link>
      <h2 className="text-xl font-semibold">Novo pedido</h2>
      <div className="glass min-h-0 flex-1 overflow-hidden rounded-2xl border border-(--glass-border)">
        <OrderForm slug={slug} customers={customers} catalog={catalog} templateFields={template.fields} templateLayout={template.layout} />
      </div>
    </div>
  );
}
