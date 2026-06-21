import { ArrowLeft, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { glassButtonVariants } from "@/components/ui/glass";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import { getCollaborator } from "../queries";

const STATUS: Record<string, string> = { active: "Ativo", inactive: "Inativo" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export default async function CollaboratorDetailPage({
  params,
}: {
  params: Promise<{ slug: string; collaboratorId: string }>;
}) {
  const { slug, collaboratorId } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "collaborator_management" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }

  const c = await getCollaborator(ctx.tenant.id, collaboratorId);
  if (!c) notFound();

  const customEntries = Object.entries(c.customData ?? {});

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/t/${slug}/collaborators`} className={glassButtonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-4" /> Colaboradores
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        {c.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatarUrl} alt="" className="size-20 rounded-full border border-border object-cover" />
        ) : (
          <span className="grid size-20 place-items-center rounded-full border border-border bg-muted text-muted-foreground">
            <UserRound className="size-7" />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-xl font-semibold">{c.name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={c.status === "active" ? "success" : "secondary"}>{STATUS[c.status] ?? c.status}</Badge>
            {c.hasSystemAccess && <Badge variant="success">Acesso ao sistema</Badge>}
            {c.isServiceProfessional && <Badge variant="brand">Profissional</Badge>}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <Row label="E-mail" value={c.email} />
        <Row label="Telefone" value={c.phone} />
        <Row label="WhatsApp" value={c.whatsapp} />
        <Row label="CPF (interno)" value={c.document} />
      </dl>

      {customEntries.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Campos específicos do nicho</h3>
          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
            {customEntries.map(([key, value]) => (
              <Row key={key} label={key} value={Array.isArray(value) ? value.join(", ") : String(value)} />
            ))}
          </dl>
        </section>
      )}

      {c.internalNotes && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Observações internas</h3>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.internalNotes}</p>
        </section>
      )}
    </div>
  );
}
