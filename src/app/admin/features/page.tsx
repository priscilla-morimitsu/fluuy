import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

import FeatureForm from "./feature-form";
import FeatureRowActions from "./feature-row-actions";

export default async function FeaturesPage() {
  await requirePlatformAdmin();
  const features = await prisma.feature.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Features</h2>
      <FeatureForm />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((feature) => (
            <TableRow key={feature.id}>
              <TableCell className="font-mono text-sm">{feature.key}</TableCell>
              <TableCell>{feature.name}</TableCell>
              <TableCell>{feature.group}</TableCell>
              <TableCell>
                <Badge variant={feature.status === "active" ? "default" : "secondary"}>
                  {feature.status}
                </Badge>
              </TableCell>
              <TableCell>
                <FeatureRowActions featureId={feature.id} status={feature.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
