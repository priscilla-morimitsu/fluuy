import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

import TemplateForm from "./template-form";
import TemplateRowActions from "./template-row-actions";

export default async function TemplatesPage() {
  await requirePlatformAdmin();
  const [templates, niches] = await Promise.all([
    prisma.template.findMany({ include: { niche: true }, orderBy: { createdAt: "desc" } }),
    prisma.niche.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
  ]);
  const nicheOptions = niches.map((n) => ({ id: n.id, name: n.name }));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Templates</h2>
      <TemplateForm niches={niches} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nicho</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Versão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                Nenhum template cadastrado ainda.
              </TableCell>
            </TableRow>
          ) : (
            templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>{template.niche.name}</TableCell>
                <TableCell className="font-mono text-sm">{template.entityType}</TableCell>
                <TableCell>{template.name}</TableCell>
                <TableCell>{template.version}</TableCell>
                <TableCell>
                  <Badge variant={template.status === "active" ? "default" : "secondary"}>
                    {template.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <TemplateRowActions
                    niches={nicheOptions}
                    template={{
                      id: template.id,
                      nicheId: template.nicheId,
                      entityType: template.entityType,
                      name: template.name,
                      description: template.description,
                      fields: template.fields,
                      status: template.status,
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
