import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

import BillingPlanForm from "./billing-plan-form";
import BillingPlanRowActions from "./billing-plan-row-actions";

export default async function BillingPlansPage() {
  await requirePlatformAdmin();
  const [plans, features] = await Promise.all([
    prisma.billingPlan.findMany({
      include: { planFeatures: { include: { feature: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feature.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Planos comerciais</h2>
      <BillingPlanForm features={features} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Periodicidade</TableHead>
            <TableHead>Features</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell className="font-mono text-sm">{plan.key}</TableCell>
              <TableCell>{plan.name}</TableCell>
              <TableCell>R$ {plan.price.toString()}</TableCell>
              <TableCell>{plan.billingPeriod}</TableCell>
              <TableCell className="text-xs text-zinc-500">
                {plan.planFeatures.map((pf) => pf.feature.name).join(", ") || "—"}
              </TableCell>
              <TableCell>
                <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                  {plan.status}
                </Badge>
              </TableCell>
              <TableCell>
                <BillingPlanRowActions billingPlanId={plan.id} status={plan.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
