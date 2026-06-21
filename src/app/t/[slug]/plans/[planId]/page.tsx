import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import {
  OFFER_PLAN_BILLING_CYCLE_LABELS,
  OFFER_PLAN_STATUS_LABELS,
  OFFER_PLAN_TYPE_LABELS,
} from "@/lib/validations/offer-plan";

import { getOfferPlan } from "../data";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning"> = {
  active: "success",
  inactive: "secondary",
  draft: "warning",
};

const priceFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v: string | null) => (v == null ? "—" : priceFmt.format(Number(v)));

export default async function OfferPlanDetailPage({
  params,
}: {
  params: Promise<{ slug: string; planId: string }>;
}) {
  const { slug, planId } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "plans_catalog" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }

  const plan = await getOfferPlan(ctx.tenant.id, planId);
  if (!plan) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/t/${slug}/plans`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Planos e Pacotes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">{plan.name}</h2>
          <Badge variant="secondary">{OFFER_PLAN_TYPE_LABELS[plan.type]}</Badge>
          <Badge variant={STATUS_VARIANT[plan.status] ?? "secondary"}>
            {OFFER_PLAN_STATUS_LABELS[plan.status] ?? plan.status}
          </Badge>
          {plan.availableForSale && <Badge variant="success">Disponível</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {plan.promotionalPrice ? `${fmt(plan.promotionalPrice)} (de ${fmt(plan.price)})` : fmt(plan.price)}
          {plan.billingCycle ? ` · ${OFFER_PLAN_BILLING_CYCLE_LABELS[plan.billingCycle]}` : ""}
          {plan.expiresAfterDays ? ` · validade ${plan.expiresAfterDays} dias` : ""}
        </p>
        {plan.description && <p className="max-w-prose text-sm">{plan.description}</p>}
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Serviços incluídos</h3>
        {plan.serviceItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum serviço incluído.</p>
        ) : (
          <div className="glass overflow-hidden rounded-xl border border-(--glass-border)">
            <table className="w-full text-sm">
              <thead className="border-b border-(--glass-border) text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Serviço</th>
                  <th className="px-3 py-2 font-medium">Qtd.</th>
                  <th className="px-3 py-2 font-medium">Limite uso</th>
                  <th className="px-3 py-2 font-medium">Preço item</th>
                  <th className="px-3 py-2 font-medium">Incluído</th>
                </tr>
              </thead>
              <tbody>
                {plan.serviceItems.map((i) => (
                  <tr key={i.id} className="border-b border-(--glass-border) last:border-0">
                    <td className="px-3 py-2 font-medium">{i.serviceName}</td>
                    <td className="px-3 py-2 tabular-nums">{i.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">{i.usageLimit ?? "—"}</td>
                    <td className="px-3 py-2">{fmt(i.priceOverride)}</td>
                    <td className="px-3 py-2">{i.included ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Produtos incluídos</h3>
        {plan.productItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto incluído.</p>
        ) : (
          <div className="glass overflow-hidden rounded-xl border border-(--glass-border)">
            <table className="w-full text-sm">
              <thead className="border-b border-(--glass-border) text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Produto</th>
                  <th className="px-3 py-2 font-medium">Qtd.</th>
                  <th className="px-3 py-2 font-medium">Limite uso</th>
                  <th className="px-3 py-2 font-medium">Preço item</th>
                  <th className="px-3 py-2 font-medium">Incluído</th>
                </tr>
              </thead>
              <tbody>
                {plan.productItems.map((i) => (
                  <tr key={i.id} className="border-b border-(--glass-border) last:border-0">
                    <td className="px-3 py-2 font-medium">{i.productName}</td>
                    <td className="px-3 py-2 tabular-nums">{i.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">{i.usageLimit ?? "—"}</td>
                    <td className="px-3 py-2">{fmt(i.priceOverride)}</td>
                    <td className="px-3 py-2">{i.included ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
