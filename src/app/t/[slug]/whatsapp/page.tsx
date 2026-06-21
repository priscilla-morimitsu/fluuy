import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listWhatsappAccounts } from "@/lib/messaging/whatsapp-accounts";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

const FEATURE = "whatsapp_integration";

export default async function WhatsappOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const accounts = await listWhatsappAccounts(ctx.tenant.id);
  const connected = accounts.filter((a) => a.status === "open").length;

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">WhatsApp</h2>
        <p className="text-sm text-muted-foreground">
          Conexão de números, templates e registros da integração com o WhatsApp.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Números</CardTitle>
            <CardDescription>
              {accounts.length === 0
                ? "Nenhum número conectado."
                : `${connected} de ${accounts.length} número(s) conectado(s).`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/t/${slug}/whatsapp/numbers`} className={buttonVariants()}>
              Gerenciar números
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
