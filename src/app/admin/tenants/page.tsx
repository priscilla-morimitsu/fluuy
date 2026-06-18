import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

import TenantForm from "./tenant-form";
import TenantRowActions from "./tenant-row-actions";

export default async function TenantsPage() {
  await requirePlatformAdmin();
  const [tenants, niches] = await Promise.all([
    prisma.tenant.findMany({ include: { niche: true }, orderBy: { createdAt: "desc" } }),
    prisma.niche.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
  ]);
  const nicheOptions = niches.map((n) => ({ id: n.id, name: n.name }));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Tenants</h2>
      <TenantForm niches={niches} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Nicho</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-zinc-500">
                Nenhum tenant cadastrado ainda.
              </TableCell>
            </TableRow>
          ) : (
            tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>{tenant.name}</TableCell>
                <TableCell className="font-mono text-sm">{tenant.slug}</TableCell>
                <TableCell>{tenant.niche.name}</TableCell>
                <TableCell>
                  <Badge variant={tenant.status === "blocked" ? "destructive" : "default"}>
                    {tenant.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <TenantRowActions
                    niches={nicheOptions}
                    tenant={{
                      id: tenant.id,
                      nicheId: tenant.nicheId,
                      name: tenant.name,
                      slug: tenant.slug,
                      legalName: tenant.legalName,
                      document: tenant.document,
                      description: tenant.description,
                      publicPhone: tenant.publicPhone,
                      publicEmail: tenant.publicEmail,
                      notificationPhone: tenant.notificationPhone,
                      hasProducts: tenant.hasProducts,
                      hasServices: tenant.hasServices,
                      hasPlans: tenant.hasPlans,
                      hasDelivery: tenant.hasDelivery,
                      hasPickup: tenant.hasPickup,
                      acceptsOnlinePayment: tenant.acceptsOnlinePayment,
                      status: tenant.status,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
