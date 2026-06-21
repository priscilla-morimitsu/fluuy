import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/crud/states";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  new: "warning",
  contacted: "secondary",
  qualified: "success",
  converted: "success",
  discarded: "destructive",
};

export default async function AdminLeadsPage() {
  await requirePlatformAdmin();

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Leads</h2>
        <p className="text-sm text-muted-foreground">
          Contatos recebidos pelo formulário &ldquo;Quero usar o Fluuy&rdquo;.
        </p>
      </div>

      {leads.length === 0 ? (
        <EmptyState title="Nenhum lead ainda" description="Novos contatos aparecerão aqui." />
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Empresa</th>
                <th className="px-4 py-2.5 font-medium">Contato</th>
                <th className="px-4 py-2.5 font-medium">Nicho</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-medium">{lead.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.companyName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.niche ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[lead.status] ?? "secondary"}>{lead.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
