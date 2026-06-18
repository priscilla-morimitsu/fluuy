import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

import NicheForm from "./niche-form";
import NicheRowActions from "./niche-row-actions";

export default async function NichesPage() {
  await requirePlatformAdmin();
  const niches = await prisma.niche.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Nichos</h2>
      <NicheForm />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {niches.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                Nenhum nicho cadastrado ainda.
              </TableCell>
            </TableRow>
          ) : (
            niches.map((niche) => (
              <TableRow key={niche.id}>
                <TableCell className="font-mono text-sm">{niche.key}</TableCell>
                <TableCell>{niche.name}</TableCell>
                <TableCell>
                  <Badge variant={niche.status === "active" ? "default" : "secondary"}>
                    {niche.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <NicheRowActions
                    niche={{
                      id: niche.id,
                      key: niche.key,
                      name: niche.name,
                      description: niche.description,
                      customerLabel: niche.customerLabel,
                      entityLabel: niche.entityLabel,
                      status: niche.status,
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
